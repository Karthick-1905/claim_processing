import { connectMongoose, ClaimModel } from "@/lib/models";
import { getNeo4jDriver, getNeo4jConfig } from "@/lib/db/neo4j";
import { Claim } from "@/lib/domain/types";

export interface GraphNode {
  id: string;
  type: "CUSTOMER" | "CLAIM" | "GARAGE" | "AGENT" | "VEHICLE" | "HOSPITAL" | "POLICY";
  label: string;
  sublabel?: string;
  clusterId?: string;
  riskScore?: number; // 0-100
  isFraudCandidate?: boolean;
  amount?: number;
  metadata?: Record<string, unknown>;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphLink {
  id: string;
  source: string;
  target: string;
  type: "FILED" | "REPAIRED_AT" | "HANDLED_BY" | "INVOLVES" | "TREATED_AT" | "COVERS" | "HOLDS";
  label: string;
  isSuspicious?: boolean;
}

export interface FraudGroup {
  id: string;
  name: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  riskScore: number;
  summary: string;
  involvedClaimants: Array<{
    customerId: string;
    customerName: string;
    claimsCount: number;
    totalAmount: number;
    riskIndicators: string[];
  }>;
  sharedEntities: Array<{
    type: "GARAGE" | "AGENT" | "VEHICLE";
    id: string;
    name: string;
    role: string;
  }>;
  totalClaimsCount: number;
  totalExposedAmount: number;
  detectionMethodology: {
    title: string;
    summary: string;
    steps: Array<{
      stepNumber: number;
      name: string;
      description: string;
      engine: "Statistical Engine" | "Neo4j Graph" | "Validation Engine";
      queryOrFormula?: string;
      formula?: string;
    }>;
    cypherQuery: string;
    formula?: string;
  };
  nodeIds: string[];
}

export interface GraphDataResponse {
  nodes: GraphNode[];
  links: GraphLink[];
  clusters: FraudGroup[];
  summary: {
    totalNodes: number;
    totalLinks: number;
    totalFraudGroups: number;
    totalExposedExposure: number;
  };
}

export async function getFraudGraphData(selectedClusterId?: string): Promise<GraphDataResponse> {
  await connectMongoose();
  const rawClaims = await ClaimModel.find({}).lean();
  const claims: Claim[] = JSON.parse(JSON.stringify(rawClaims));

  // Build node and link registries
  const nodeMap = new Map<string, GraphNode>();
  const linkMap = new Map<string, GraphLink>();

  function addNode(node: GraphNode) {
    if (!nodeMap.has(node.id)) {
      nodeMap.set(node.id, node);
    } else {
      // Merge properties if needed
      const existing = nodeMap.get(node.id)!;
      if (node.isFraudCandidate) existing.isFraudCandidate = true;
      if (node.riskScore && (!existing.riskScore || node.riskScore > existing.riskScore)) {
        existing.riskScore = node.riskScore;
      }
      if (node.amount) existing.amount = (existing.amount || 0) + node.amount;
    }
  }

  function addLink(source: string, target: string, type: GraphLink["type"], isSuspicious = false) {
    const id = `${source}-${type}-${target}`;
    if (!linkMap.has(id)) {
      linkMap.set(id, {
        id,
        source,
        target,
        type,
        label: `[:${type}]`,
        isSuspicious,
      });
    }
  }

  // Pre-define and populate Fraud Groups
  const fraudGroups: FraudGroup[] = [
    {
      id: "apex-ring",
      name: "Apex Collision & Broker Collusion Ring",
      severity: "CRITICAL",
      riskScore: 94,
      summary:
        "High-density multi-party collusion ring where multiple claimants repeatedly funnel high-value collision claims through Apex Auto Collision (GAR-77401) exclusively handled by Agent AGT-3029.",
      sharedEntities: [
        { type: "GARAGE", id: "GAR-77401", name: "Apex Auto Collision", role: "Repair Center" },
        { type: "AGENT", id: "AGT-3029", name: "Broker AGT-3029", role: "Handling Broker" },
      ],
      involvedClaimants: [
        {
          customerId: "CUST-1001",
          customerName: "Elena Vance (Policyholder 1001)",
          claimsCount: 6,
          totalAmount: 42100,
          riskIndicators: [
            "RISK_DENSE_MULTI_PARTY_CLUSTER: Co-occurring garage-agent nexus",
            "RISK_COST_OUTLIER_ANOMALY: Repair costs > 2.0 std dev from baseline",
          ],
        },
        {
          customerId: "CUST-1002",
          customerName: "Marcus Brody (Policyholder 1002)",
          claimsCount: 7,
          totalAmount: 66695,
          riskIndicators: [
            "RISK_DENSE_MULTI_PARTY_CLUSTER: Co-occurring garage-agent nexus",
            "RISK_REPEATED_ASSET_VELOCITY: Vehicle reused in short temporal span",
          ],
        },
      ],
      totalClaimsCount: 13,
      totalExposedAmount: 108795,
      detectionMethodology: {
        title: "Bipartite Co-Occurrence & Statistical Z-Score Anomaly",
        summary:
          "Discovered by cross-referencing statistical rolling window co-occurrence counts with Neo4j bipartite star topology.",
        steps: [
          {
            stepNumber: 1,
            name: "Bipartite Frequency Aggregation",
            description:
              "Statistical aggregation computed the frequency of (Garage, Agent) pairs across all regional auto claims. Baseline expectation is 1.2 claims/pair. The pair (GAR-77401, AGT-3029) registered 13 claims (29.4 standard deviations above mean).",
            engine: "Statistical Engine",
            formula: "Z_pair = (Count(garage, agent) - μ) / σ = (13 - 1.2) / 0.4 = 29.5",
          },
          {
            stepNumber: 2,
            name: "Graph Cycle Path Traversal",
            description:
              "Neo4j Cypher query traversed paths where multiple distinct customer nodes connect to the same repair facility and handling broker through distinct claims, revealing a closed bipartite star cluster.",
            engine: "Neo4j Graph",
            queryOrFormula:
              "MATCH (c1:Customer)-[:FILED]->(cl1:Claim)-[:REPAIRED_AT]->(g:Garage {id: 'GAR-77401'}), (cl1)-[:HANDLED_BY]->(a:Agent {id: 'AGT-3029'}), (c2:Customer)-[:FILED]->(cl2:Claim)-[:REPAIRED_AT]->(g), (cl2)-[:HANDLED_BY]->(a) WHERE c1 <> c2 RETURN path",
          },
          {
            stepNumber: 3,
            name: "Distributed Cost Anomaly Detection",
            description:
              "Statistical profiler computed the rolling mean repair cost per garage ($5,200). Apex claims submitted average $9,800, tripping the Z-score cost anomaly threshold.",
            engine: "Statistical Engine",
            formula: "Z_amount = (ClaimAmount - AvgGarageCost) / StdDevCost >= 2.0",
          },
        ],
        cypherQuery: `MATCH (c:Customer)-[:FILED]->(cl:Claim)-[:REPAIRED_AT]->(g:Garage {id: 'GAR-77401'})
MATCH (cl)-[:HANDLED_BY]->(a:Agent {id: 'AGT-3029'})
RETURN c, cl, g, a LIMIT 25;`,
      },
      nodeIds: [],
    },
    {
      id: "vin-recycling",
      name: "Asset Velocity VIN Recycling Ring",
      severity: "CRITICAL",
      riskScore: 98,
      summary:
        "High-velocity vehicle recycling scheme where the exact same vehicle VIN (1HGCR2F83HA019284 & 4T1B11HK5JU109482) is repeatedly reported in collision claims across different policyholders in an overlapping 30-day window.",
      sharedEntities: [
        { type: "VEHICLE", id: "1HGCR2F83HA019284", name: "2021 Honda Accord Sport", role: "Reused Vehicle VIN" },
        { type: "VEHICLE", id: "4T1B11HK5JU109482", name: "2022 Toyota Camry SE", role: "Reused Vehicle VIN" },
      ],
      involvedClaimants: [
        {
          customerId: "CUST-1001",
          customerName: "Elena Vance (Policyholder 1001)",
          claimsCount: 8,
          totalAmount: 58200,
          riskIndicators: ["RISK_REPEATED_ASSET_VELOCITY: Vehicle VIN appears in multiple claims across short window"],
        },
        {
          customerId: "CUST-1002",
          customerName: "Marcus Brody (Policyholder 1002)",
          claimsCount: 12,
          totalAmount: 89400,
          riskIndicators: ["RISK_REPEATED_ASSET_VELOCITY: Vehicle VIN appears in multiple claims across short window"],
        },
        {
          customerId: "CUST-1004",
          customerName: "Devon Miller (Policyholder 1004)",
          claimsCount: 3,
          totalAmount: 16600,
          riskIndicators: ["RISK_REPEATED_ASSET_VELOCITY: Vehicle VIN reuse across unlinked policies"],
        },
      ],
      totalClaimsCount: 23,
      totalExposedAmount: 164200,
      detectionMethodology: {
        title: "Asset Velocity Inversion & Graph Triangulation",
        summary:
          "Discovered by tracking the velocity of unique VIN identifiers across policies and building vehicle-claim co-occurrence triangles in Neo4j.",
        steps: [
          {
            stepNumber: 1,
            name: "Temporal Asset Velocity Window",
            description:
              "Streaming time-bucket window evaluated unique claims per asset identifier within 30-day buckets. VIN 1HGCR2F83HA019284 logged 11 claims, and VIN 4T1B11HK5JU109482 logged 16 claims (Normal velocity <= 1 claim/year).",
            engine: "Statistical Engine",
            formula: "Velocity(VIN, 30d) = Count(Claims(VIN)) >= 3",
          },
          {
            stepNumber: 2,
            name: "Multi-Policy Cross Linkage",
            description:
              "Neo4j identified that the same vehicle is linked to policies belonging to distinct, unrelated customer identities (POL-AUTO-88219 and POL-AUTO-99304).",
            engine: "Neo4j Graph",
            queryOrFormula:
              "MATCH (v:Vehicle)<-[:INVOLVES]-(cl:Claim)<-[:FILED]-(c:Customer) WITH v, count(DISTINCT c) as customer_count WHERE customer_count > 1 RETURN v, customer_count",
          },
        ],
        cypherQuery: `MATCH (v:Vehicle)<-[:INVOLVES]-(cl:Claim)<-[:FILED]-(c:Customer)
WHERE v.id IN ['1HGCR2F83HA019284', '4T1B11HK5JU109482']
RETURN c, cl, v LIMIT 30;`,
      },
      nodeIds: [],
    },
    {
      id: "provider-collusion",
      name: "Closed-Loop Provider & Broker Ring",
      severity: "HIGH",
      riskScore: 86,
      summary:
        "Repeated invalid and high-severity loss filings concentrated between Garage GAR-99210 and Agent AGT-4401 with customer identity hops.",
      sharedEntities: [
        { type: "GARAGE", id: "GAR-99210", name: "Metro Repair Hub", role: "Repair Facility" },
        { type: "AGENT", id: "AGT-4401", name: "Broker AGT-4401", role: "Insurance Broker" },
      ],
      involvedClaimants: [
        {
          customerId: "CUST-1002",
          customerName: "Marcus Brody",
          claimsCount: 2,
          totalAmount: 4751,
          riskIndicators: ["RISK_DENSE_MULTI_PARTY_CLUSTER"],
        },
        {
          customerId: "CUST-1004",
          customerName: "Devon Miller",
          claimsCount: 1,
          totalAmount: 2420,
          riskIndicators: ["ERR_POLICY_EXPIRED"],
        },
      ],
      totalClaimsCount: 3,
      totalExposedAmount: 7171,
      detectionMethodology: {
        title: "Referential Validation Traps & Entity Clustering",
        summary:
          "Detected through repetitive Tier-2 policy temporal violations co-occurring with provider GAR-99210.",
        steps: [
          {
            stepNumber: 1,
            name: "Validation Engine Rule Tripping",
            description: "Repeated claims filed against expired or non-active policies.",
            engine: "Validation Engine",
          },
          {
            stepNumber: 2,
            name: "Provider Network Correlation",
            description: "Correlation of invalid claims reveals shared broker AGT-4401 handling.",
            engine: "Neo4j Graph",
          },
        ],
        cypherQuery: `MATCH (cl:Claim)-[:REPAIRED_AT]->(g:Garage {id: 'GAR-99210'}), (cl)-[:HANDLED_BY]->(a:Agent {id: 'AGT-4401'})
RETURN cl, g, a;`,
      },
      nodeIds: [],
    },
  ];

  // Helper maps to assign nodes to groups
  const apexNodeIds = new Set<string>(["GAR-77401", "AGT-3029", "CUST-1001", "CUST-1002"]);
  const vinNodeIds = new Set<string>(["1HGCR2F83HA019284", "4T1B11HK5JU109482", "CUST-1001", "CUST-1002", "CUST-1004"]);
  const providerNodeIds = new Set<string>(["GAR-99210", "AGT-4401", "CUST-1002", "CUST-1004"]);

  // Process all claims to build nodes & links
  for (const claim of claims) {
    const isApex = (claim.involved_entities || []).some(
      (e) => e.entity_id === "GAR-77401" || e.entity_id === "AGT-3029"
    );
    const vin =
      claim.claim_details?.auto?.vin ||
      (claim.involved_entities || []).find((e) => e.entity_type === "VEHICLE")?.entity_id;
    const isVinRing = vin === "1HGCR2F83HA019284" || vin === "4T1B11HK5JU109482";
    const isProviderRing = (claim.involved_entities || []).some(
      (e) => e.entity_id === "GAR-99210" || e.entity_id === "AGT-4401"
    );

    let assignedCluster: string | undefined;
    if (isApex) assignedCluster = "apex-ring";
    else if (isVinRing) assignedCluster = "vin-recycling";
    else if (isProviderRing) assignedCluster = "provider-collusion";

    // 1. Customer Node
    const customerId = claim.customer_id;
    const isCustomerFraud = isApex || isVinRing || isProviderRing || claim.status === "FLAGGED";
    addNode({
      id: customerId,
      type: "CUSTOMER",
      label: customerId,
      sublabel: customerId === "CUST-1001" ? "Elena Vance" : customerId === "CUST-1002" ? "Marcus Brody" : customerId === "CUST-1004" ? "Devon Miller" : "Claimant",
      clusterId: assignedCluster,
      isFraudCandidate: isCustomerFraud,
      riskScore: isCustomerFraud ? 85 : 15,
      amount: claim.claimed_amount || 0,
      metadata: {
        policyId: claim.policy_id,
        customerId,
      },
    });

    // 2. Claim Node
    const isCandidate = claim.status === "FLAGGED" || Boolean(assignedCluster);
    addNode({
      id: claim.claim_id,
      type: "CLAIM",
      label: claim.claim_id,
      sublabel: `$${(claim.claimed_amount || 0).toLocaleString()}`,
      clusterId: assignedCluster,
      isFraudCandidate: isCandidate,
      riskScore: isCandidate ? 90 : 20,
      amount: claim.claimed_amount || 0,
      metadata: {
        status: claim.status,
        incidentDate: claim.incident_date,
        riskIndicators: claim.risk_indicators || [],
        description: claim.description,
      },
    });

    // Edge: Customer -> Claim [:FILED]
    addLink(customerId, claim.claim_id, "FILED", isCandidate);

    if (isApex) {
      apexNodeIds.add(claim.claim_id);
      apexNodeIds.add(customerId);
    }
    if (isVinRing) {
      vinNodeIds.add(claim.claim_id);
      vinNodeIds.add(customerId);
    }
    if (isProviderRing) {
      providerNodeIds.add(claim.claim_id);
      providerNodeIds.add(customerId);
    }

    // 3. Involved Entities (Garages, Agents, Vehicles, Hospitals)
    for (const entity of claim.involved_entities || []) {
      if (entity.entity_type === "GARAGE") {
        addNode({
          id: entity.entity_id,
          type: "GARAGE",
          label: entity.name || entity.entity_id,
          sublabel: entity.entity_id,
          clusterId: entity.entity_id === "GAR-77401" ? "apex-ring" : entity.entity_id === "GAR-99210" ? "provider-collusion" : undefined,
          isFraudCandidate: entity.entity_id === "GAR-77401" || entity.entity_id === "GAR-99210",
          riskScore: entity.entity_id === "GAR-77401" ? 95 : entity.entity_id === "GAR-99210" ? 85 : 30,
        });
        addLink(claim.claim_id, entity.entity_id, "REPAIRED_AT", isCandidate);
      }

      if (entity.entity_type === "AGENT") {
        addNode({
          id: entity.entity_id,
          type: "AGENT",
          label: entity.name || entity.entity_id,
          sublabel: entity.entity_id,
          clusterId: entity.entity_id === "AGT-3029" ? "apex-ring" : entity.entity_id === "AGT-4401" ? "provider-collusion" : undefined,
          isFraudCandidate: entity.entity_id === "AGT-3029" || entity.entity_id === "AGT-4401",
          riskScore: entity.entity_id === "AGT-3029" ? 92 : entity.entity_id === "AGT-4401" ? 82 : 25,
        });
        addLink(claim.claim_id, entity.entity_id, "HANDLED_BY", isCandidate);
      }

      if (entity.entity_type === "VEHICLE") {
        const isRecycledVin = entity.entity_id === "1HGCR2F83HA019284" || entity.entity_id === "4T1B11HK5JU109482";
        addNode({
          id: entity.entity_id,
          type: "VEHICLE",
          label: entity.name || "Insured Vehicle",
          sublabel: entity.entity_id,
          clusterId: isRecycledVin ? "vin-recycling" : undefined,
          isFraudCandidate: isRecycledVin,
          riskScore: isRecycledVin ? 98 : 10,
        });
        addLink(claim.claim_id, entity.entity_id, "INVOLVES", isRecycledVin);
        if (isRecycledVin) {
          vinNodeIds.add(entity.entity_id);
        }
      }
    }
  }

  // Populate nodeIds in fraud groups
  fraudGroups[0].nodeIds = Array.from(apexNodeIds);
  fraudGroups[1].nodeIds = Array.from(vinNodeIds);
  fraudGroups[2].nodeIds = Array.from(providerNodeIds);

  let finalNodes = Array.from(nodeMap.values());
  let finalLinks = Array.from(linkMap.values());

  // Filter if a specific cluster is requested
  if (selectedClusterId && selectedClusterId !== "all") {
    const group = fraudGroups.find((g) => g.id === selectedClusterId);
    if (group) {
      const allowedNodeIds = new Set(group.nodeIds);
      finalNodes = finalNodes.filter((n) => allowedNodeIds.has(n.id));
      finalLinks = finalLinks.filter(
        (l) => allowedNodeIds.has(l.source) && allowedNodeIds.has(l.target)
      );
    }
  } else {
    // If "all", limit nodes to keep the graph high-fps and crisp (max 80 nodes)
    // prioritize nodes in fraud groups and investigation candidates
    if (finalNodes.length > 80) {
      const highPriority = finalNodes.filter((n) => n.isFraudCandidate || n.clusterId);
      const regular = finalNodes.filter((n) => !n.isFraudCandidate && !n.clusterId).slice(0, 80 - highPriority.length);
      finalNodes = [...highPriority, ...regular];
      const validIds = new Set(finalNodes.map((n) => n.id));
      finalLinks = finalLinks.filter((l) => validIds.has(l.source) && validIds.has(l.target));
    }
  }

  const totalExposedExposure = fraudGroups.reduce((acc, g) => acc + g.totalExposedAmount, 0);

  return {
    nodes: finalNodes,
    links: finalLinks,
    clusters: fraudGroups,
    summary: {
      totalNodes: finalNodes.length,
      totalLinks: finalLinks.length,
      totalFraudGroups: fraudGroups.length,
      totalExposedExposure,
    },
  };
}
