import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/mongodb";
import { testNeo4jConnection } from "@/lib/db/neo4j";

export async function GET() {
  let mongoStatus = "DISCONNECTED";
  let mongoError: string | null = null;
  let counts = { claims: 0, policies: 0, customers: 0 };

  try {
    const db = await getDatabase();
    await db.command({ ping: 1 });
    mongoStatus = "CONNECTED";

    const [claims, policies, customers] = await Promise.all([
      db.collection("claims").countDocuments(),
      db.collection("policies").countDocuments(),
      db.collection("customers").countDocuments(),
    ]);
    counts = { claims, policies, customers };
  } catch (err) {
    mongoStatus = "ERROR";
    mongoError = err instanceof Error ? err.message : String(err);
  }

  const neo4jResult = await testNeo4jConnection();

  return NextResponse.json({
    status: mongoStatus === "CONNECTED" ? "HEALTHY" : "DEGRADED",
    timestamp: new Date().toISOString(),
    databases: {
      mongodb: {
        status: mongoStatus,
        error: mongoError,
        records: counts,
      },
      neo4j: {
        status: neo4jResult.connected ? "CONNECTED" : "DISCONNECTED",
        message: neo4jResult.message,
        serverInfo: neo4jResult.serverInfo || null,
      },
    },
  });
}
