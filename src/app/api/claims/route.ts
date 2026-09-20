import { NextRequest, NextResponse } from "next/server";
import { getClaims, ingestClaim } from "@/lib/services/claim-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "ALL";
    const claim_type = searchParams.get("claim_type") || "ALL";
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const claims = await getClaims({ status, claim_type, limit });
    return NextResponse.json({ success: true, data: claims });
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : "Error fetching claims";
    return NextResponse.json({ success: false, error: errMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const result = await ingestClaim(payload);

    return NextResponse.json(
      {
        success: result.success,
        message: result.message,
        claim: result.claim,
        validation_errors: result.validation_errors,
      },
      { status: result.success ? 201 : 422 }
    );
  } catch (error) {
    console.error("[Claim Ingestion Error]", error);
    const errMessage = error instanceof Error ? error.message : "Error ingesting claim";
    return NextResponse.json({ success: false, error: errMessage }, { status: 400 });
  }
}
