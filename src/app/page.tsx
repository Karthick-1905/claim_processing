import { connectMongoose, ClaimModel, PolicyModel, CustomerModel } from "@/lib/models";
import { testNeo4jConnection } from "@/lib/db/neo4j";
import { getClaims, getClaimsSummary } from "@/lib/services/claim-service";
import { ClaimsDashboard } from "@/components/ClaimsDashboard";
import { Claim } from "@/lib/domain/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let mongoStatus: "CONNECTED" | "ERROR" | "DISCONNECTED" = "DISCONNECTED";
  let mongoCounts = { claims: 0, policies: 0, customers: 0 };
  let claims: Claim[] = [];
  let summary = {
    total: 0,
    validated: 0,
    readyForAnalysis: 0,
    underReview: 0,
    investigationCandidate: 0,
    invalid: 0,
  };

  try {
    await connectMongoose();
    mongoStatus = "CONNECTED";

    const [cCount, pCount, custCount, claimsList, sum] = await Promise.all([
      ClaimModel.countDocuments(),
      PolicyModel.countDocuments(),
      CustomerModel.countDocuments(),
      getClaims({ limit: 100 }),
      getClaimsSummary(),
    ]);

    mongoCounts = {
      claims: cCount,
      policies: pCount,
      customers: custCount,
    };
    claims = JSON.parse(JSON.stringify(claimsList));
    summary = JSON.parse(JSON.stringify(sum));
  } catch (err) {
    console.error("[HomePage] Error connecting to MongoDB via Mongoose:", err);
    mongoStatus = "ERROR";
  }

  const neo4jResult = await testNeo4jConnection();

  return (
    <ClaimsDashboard
      initialClaims={claims}
      initialSummary={summary}
      initialMongoStatus={mongoStatus}
      initialMongoCounts={mongoCounts}
      initialNeo4jStatus={neo4jResult.connected ? "CONNECTED" : "DISCONNECTED"}
      initialNeo4jMessage={neo4jResult.message}
    />
  );
}
