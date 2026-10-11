import { NextRequest, NextResponse } from "next/server";
import { getFraudGraphData } from "@/lib/services/graph-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cluster = searchParams.get("cluster") || "all";

    const graphData = await getFraudGraphData(cluster);

    return NextResponse.json({
      success: true,
      data: graphData,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error loading graph intelligence data";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
