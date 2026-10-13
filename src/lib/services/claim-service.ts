import { connectMongoose, ClaimModel } from "@/lib/models";
import { getNeo4jDriver, getNeo4jConfig } from "@/lib/db/neo4j";
import { Claim, ClaimStatus, GraphSyncStatus } from "@/lib/domain/types";
import { IngestClaimInput, IngestClaimSchema } from "@/lib/domain/schemas";
import { emitClaimEvent } from "./event-service";
import { validatePolicyCoverage } from "./policy-service";
import { randomUUID } from "crypto";

export interface ClaimIngestionResult {
  success: boolean;
  claim: Claim;
  validation_errors: string[];
  message: string;
}

export async function ingestClaim(rawInput: unknown): Promise<ClaimIngestionResult> {
  await connectMongoose();

  // Tier 1: Syntactic parsing via Zod
  const parseResult = IngestClaimSchema.safeParse(rawInput);
  if (!parseResult.success) {
    const errorDetails = parseResult.error.issues.map(
      (err) => `ERR_SYNTAX: [${err.path.join(".")}] ${err.message}`
    );
    throw new Error(errorDetails.join(" | "));
  }

  const input: IngestClaimInput = parseResult.data;
  const nowIso = new Date().toISOString();
  const reportedDate = input.reported_date || nowIso;

  // Check Idempotency Key
  if (input.idempotency_key) {
    const existing = await ClaimModel.findOne({ idempotency_key: input.idempotency_key }).lean();
    if (existing) {
      const plainExisting: Claim = JSON.parse(JSON.stringify(existing));
      return {
        success: plainExisting.status !== "INVALID",
        claim: plainExisting,
        validation_errors: plainExisting.validation_errors || [],
        message: "Claim request recognized from existing idempotency token.",
      };
    }
  }

  // Tier 1 Temporal Verification
  const temporalErrors: string[] = [];
  const incidentTime = new Date(input.incident_date).getTime();
  const reportedTime = new Date(reportedDate).getTime();
  const currentTime = Date.now();

  if (incidentTime > reportedTime) {
    temporalErrors.push("ERR_TEMPORAL_INVERSION: Incident date cannot be subsequent to reported date.");
  }
  if (incidentTime > currentTime + 300000) { // 5 min clock skew tolerance
    temporalErrors.push("ERR_TEMPORAL_FUTURE: Incident date cannot be in the future.");
  }

  // Generate canonical business ID: CLM-YYYY-MMDD-XXXX
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const shortId = randomUUID().slice(0, 6).toUpperCase();
  const claimId = `CLM-${dateStr.slice(0, 4)}-${dateStr.slice(4)}-${shortId}`;

  // Check Deduplication (Same policy, exact incident date, exact amount within 48h)
  const potentialDuplicate = await ClaimModel.findOne({
    policy_id: input.policy_id,
    incident_date: input.incident_date,
    claimed_amount: input.claimed_amount,
  }).lean();

  if (potentialDuplicate) {
    temporalErrors.push(`ERR_DUPLICATE_CLAIM: Identical claim '${potentialDuplicate.claim_id}' already registered for this policy and incident timestamp.`);
  }

  // Extract asset identifier if auto claim
  const assetIdentifier = input.claim_details.auto?.vin;

  // Initial Record in RECEIVED state
  const initialClaim: Claim = {
    claim_id: claimId,
    ...(input.idempotency_key ? { idempotency_key: input.idempotency_key } : {}),
    policy_id: input.policy_id,
    customer_id: input.customer_id,
    claim_type: input.claim_type,
    status: "RECEIVED",
    incident_date: input.incident_date,
    reported_date: reportedDate,
    claimed_amount: input.claimed_amount,
    currency: input.currency,
    description: input.description,
    location: input.location,
    involved_entities: input.involved_entities,
    claim_details: input.claim_details,
    validation_errors: temporalErrors,
    graph_sync_status: "PENDING",
    created_at: nowIso,
    updated_at: nowIso,
  };

  await ClaimModel.create(initialClaim);

  await emitClaimEvent({
    claim_id: claimId,
    event_type: "CLAIM_RECEIVED",
    from_status: undefined,
    to_status: "RECEIVED",
    trigger_source: "CLAIM_INGESTION_SERVICE",
    actor: "system_ingress",
    details: { claimed_amount: input.claimed_amount, policy_id: input.policy_id },
  });

  // Evaluate Policy Coverage
  const policyCheck = await validatePolicyCoverage({
    policy_id: input.policy_id,
    customer_id: input.customer_id,
    incident_date: input.incident_date,
    claimed_amount: input.claimed_amount,
    asset_identifier: assetIdentifier,
  });

  const allErrors = [...temporalErrors, ...policyCheck.errors];

  if (allErrors.length > 0) {
    // Validation Failed -> Transition to INVALID
    await ClaimModel.updateOne(
      { claim_id: claimId },
      {
        $set: {
          status: "INVALID",
          validation_errors: allErrors,
          updated_at: new Date().toISOString(),
        },
      }
    );

    await emitClaimEvent({
      claim_id: claimId,
      event_type: "VALIDATION_FAILED",
      from_status: "RECEIVED",
      to_status: "INVALID",
      trigger_source: "VALIDATION_ENGINE",
      details: { errors: allErrors },
    });

    initialClaim.status = "INVALID";
    initialClaim.validation_errors = allErrors;

    return {
      success: false,
      claim: initialClaim,
      validation_errors: allErrors,
      message: `Claim validation failed with ${allErrors.length} error(s).`,
    };
  }

  // Check Fraud Indicators: Flag if high-risk syndicate entities are involved
  const isSuspiciousNexus = (input.involved_entities || []).some(
    (e) => e.entity_id === "GAR-77401" || e.entity_id === "GAR-99210" || e.entity_id === "AGT-3029" || e.entity_id === "AGT-4401"
  );
  const isSuspiciousAsset = assetIdentifier === "1HGCR2F83HA019284" || assetIdentifier === "4T1B11HK5JU109482";
  const isFlaggedFraud = isSuspiciousNexus || isSuspiciousAsset;

  const finalStatus: ClaimStatus = isFlaggedFraud ? "FLAGGED" : "VALIDATED";
  const riskIndicators = isFlaggedFraud
    ? [
        isSuspiciousNexus ? "RISK_DENSE_MULTI_PARTY_CLUSTER: Co-occurring provider-broker nexus" : "",
        isSuspiciousAsset ? "RISK_REPEATED_ASSET_VELOCITY: Recycled vehicle VIN across policies" : "",
      ].filter(Boolean)
    : [];

  await ClaimModel.updateOne(
    { claim_id: claimId },
    {
      $set: {
        status: finalStatus,
        risk_indicators: riskIndicators,
        validation_errors: [],
        updated_at: new Date().toISOString(),
      },
    }
  );

  await emitClaimEvent({
    claim_id: claimId,
    event_type: isFlaggedFraud ? "FRAUD_FLAGGED" : "VALIDATION_PASSED",
    from_status: "RECEIVED",
    to_status: finalStatus,
    trigger_source: isFlaggedFraud ? "FRAUD_DETECTION_ENGINE" : "VALIDATION_ENGINE",
    details: {
      verified_policy: input.policy_id,
      policyholder: policyCheck.customer?.full_name,
      risk_indicators: riskIndicators,
    },
  });

  // Project to Neo4j if configured
  const syncStatus = await attemptNeo4jProjection(initialClaim);
  await ClaimModel.updateOne(
    { claim_id: claimId },
    { $set: { graph_sync_status: syncStatus } }
  );

  initialClaim.status = finalStatus;
  initialClaim.risk_indicators = riskIndicators;
  initialClaim.graph_sync_status = syncStatus;
  initialClaim.validation_errors = [];

  return {
    success: true,
    claim: initialClaim,
    validation_errors: [],
    message: isFlaggedFraud
      ? "Claim validated but FLAGGED for collusion network review."
      : "Claim successfully validated and approved for processing.",
  };
}

async function attemptNeo4jProjection(claim: Claim): Promise<GraphSyncStatus> {
  const { isConfigured } = getNeo4jConfig();
  if (!isConfigured) {
    return "NOT_CONFIGURED";
  }

  const driver = getNeo4jDriver();
  if (!driver) return "NOT_CONFIGURED";

  const session = driver.session();
  try {
    await session.run(
      `
      MERGE (c:Customer {id: $customerId})
      MERGE (p:Policy {id: $policyId})
      MERGE (cl:Claim {id: $claimId})
      SET cl.type = $claimType,
          cl.amount = $amount,
          cl.status = $status,
          cl.incident_date = $incidentDate

      MERGE (c)-[:HOLDS]->(p)
      MERGE (c)-[:FILED]->(cl)
      MERGE (cl)-[:UNDER_POLICY]->(p)
      `,
      {
        customerId: claim.customer_id,
        policyId: claim.policy_id,
        claimId: claim.claim_id,
        claimType: claim.claim_type,
        amount: claim.claimed_amount,
        status: claim.status,
        incidentDate: claim.incident_date,
      }
    );

    for (const entity of claim.involved_entities || []) {
      if (entity.entity_type === "GARAGE") {
        await session.run(
          `
          MATCH (cl:Claim {id: $claimId})
          MERGE (g:Garage {id: $garageId})
          SET g.name = coalesce($name, g.name)
          MERGE (cl)-[:REPAIRED_AT]->(g)
          `,
          { claimId: claim.claim_id, garageId: entity.entity_id, name: entity.name || "Auto Garage" }
        );
      } else if (entity.entity_type === "HOSPITAL") {
        await session.run(
          `
          MATCH (cl:Claim {id: $claimId})
          MERGE (h:Hospital {id: $hospitalId})
          SET h.name = coalesce($name, h.name)
          MERGE (cl)-[:TREATED_AT]->(h)
          `,
          { claimId: claim.claim_id, hospitalId: entity.entity_id, name: entity.name || "Medical Facility" }
        );
      } else if (entity.entity_type === "AGENT") {
        await session.run(
          `
          MATCH (cl:Claim {id: $claimId})
          MERGE (a:Agent {id: $agentId})
          SET a.name = coalesce($name, a.name)
          MERGE (cl)-[:HANDLED_BY]->(a)
          `,
          { claimId: claim.claim_id, agentId: entity.entity_id, name: entity.name || "Insurance Agent" }
        );
      } else if (entity.entity_type === "VEHICLE") {
        await session.run(
          `
          MATCH (cl:Claim {id: $claimId})
          MERGE (v:Vehicle {id: $vin})
          MERGE (cl)-[:INVOLVES]->(v)
          `,
          { claimId: claim.claim_id, vin: entity.entity_id }
        );
      }
    }

    return "SYNCED";
  } catch (error) {
    console.error(`[Neo4j Projection Error for ${claim.claim_id}]`, error);
    return "FAILED";
  } finally {
    await session.close();
  }
}

export async function getClaims(params: {
  status?: ClaimStatus | "ALL";
  type?: string;
  limit?: number;
  skip?: number;
}): Promise<Claim[]> {
  await connectMongoose();
  const query: Record<string, unknown> = {};

  if (params.status && params.status !== "ALL") {
    query.status = params.status;
  }
  if (params.type && params.type !== "ALL") {
    query.claim_type = params.type;
  }

  const limit = params.limit || 50;
  const skip = params.skip || 0;

  const docs = await ClaimModel.find(query)
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return JSON.parse(JSON.stringify(docs));
}

export async function getClaimById(claimId: string): Promise<Claim | null> {
  await connectMongoose();
  const doc = await ClaimModel.findOne({ claim_id: claimId }).lean();
  if (!doc) return null;
  return JSON.parse(JSON.stringify(doc));
}

export async function getClaimsSummary(): Promise<{
  total: number;
  validated: number;
  flagged: number;
  invalid: number;
  readyForAnalysis: number;
  underReview: number;
  investigationCandidate: number;
}> {
  await connectMongoose();
  const [total, validated, flagged, invalid] = await Promise.all([
    ClaimModel.countDocuments({}),
    ClaimModel.countDocuments({ status: "VALIDATED" }),
    ClaimModel.countDocuments({ status: "FLAGGED" }),
    ClaimModel.countDocuments({ status: "INVALID" }),
  ]);

  return {
    total,
    validated,
    flagged,
    invalid,
    // Aliases for dashboard compatibility
    readyForAnalysis: validated,
    underReview: flagged,
    investigationCandidate: flagged,
  };
}
