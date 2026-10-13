import mongoose, { Schema, Model } from "mongoose";
import { ClaimEvent } from "@/lib/domain/types";

export const ClaimEventSchema = new Schema<ClaimEvent>(
  {
    event_id: { type: String, required: true, unique: true, index: true },
    claim_id: { type: String, required: true, index: true },
    // Simplified 4-State Event Type
    event_type: {
      type: String,
      enum: [
        "CLAIM_RECEIVED",
        "VALIDATION_PASSED",
        "VALIDATION_FAILED",
        "FRAUD_FLAGGED",
      ],
      required: true,
      index: true,
    },
    from_status: { type: String },
    to_status: { type: String },
    timestamp: { type: String, default: () => new Date().toISOString() },
    trigger_source: { type: String, required: true },
    actor: { type: String, required: true },
    details: { type: Schema.Types.Mixed, default: {} },
  },
  {
    collection: "claim_events",
    timestamps: false,
    versionKey: false,
  }
);

export const ClaimEventModel: Model<ClaimEvent> =
  mongoose.models.ClaimEvent || mongoose.model<ClaimEvent>("ClaimEvent", ClaimEventSchema);

export default ClaimEventModel;
