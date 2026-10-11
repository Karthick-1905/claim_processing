import { getDatabase } from "@/lib/db/mongodb";
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
  const db = await getDatabase();
  const event: ClaimEvent = {
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

  await db.collection<ClaimEvent>("claim_events").insertOne(event);
  return event;
}

export async function getEventsForClaim(claimId: string): Promise<ClaimEvent[]> {
  const db = await getDatabase();
  const docs = await db
    .collection<ClaimEvent>("claim_events")
    .find({ claim_id: claimId })
    .sort({ timestamp: 1 })
    .toArray();
  return JSON.parse(JSON.stringify(docs));
}
