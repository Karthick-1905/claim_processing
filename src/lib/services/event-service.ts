import { connectMongoose, ClaimEventModel } from "@/lib/models";
import { ClaimEvent, EventType, ClaimStatus } from "@/lib/domain/types";
import { randomUUID } from "crypto";

export async function emitClaimEvent(params: {
  claim_id: string;
  event_type: EventType;
  from_status?: ClaimStatus;
  to_status?: ClaimStatus;
  trigger_source: string;
  actor?: string;
  details?: Record<string, unknown>;
}): Promise<ClaimEvent> {
  await connectMongoose();
  const eventData = {
    event_id: `EVT-${randomUUID()}`,
    claim_id: params.claim_id,
    event_type: params.event_type,
    from_status: params.from_status,
    to_status: params.to_status,
    timestamp: new Date().toISOString(),
    trigger_source: params.trigger_source,
    actor: params.actor || "system",
    details: params.details || {},
  };

  const doc = await ClaimEventModel.create(eventData);
  return JSON.parse(JSON.stringify(doc));
}

export async function getEventsForClaim(claimId: string): Promise<ClaimEvent[]> {
  await connectMongoose();
  const docs = await ClaimEventModel.find({ claim_id: claimId }).sort({ timestamp: 1 }).lean();
  return JSON.parse(JSON.stringify(docs));
}
