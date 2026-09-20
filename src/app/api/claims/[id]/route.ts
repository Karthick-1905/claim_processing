import { NextRequest, NextResponse } from "next/server";
import { getClaimById } from "@/lib/services/claim-service";
import { getEventsForClaim } from "@/lib/services/event-service";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const claim = await getClaimById(id);

    if (!claim) {
      return NextResponse.json({ success: false, error: "Claim not found" }, { status: 404 });
    }

    const events = await getEventsForClaim(id);

    return NextResponse.json({
      success: true,
      data: {
        claim,
        events,
      },
    });
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : "Error retrieving claim";
    return NextResponse.json({ success: false, error: errMessage }, { status: 500 });
  }
}
