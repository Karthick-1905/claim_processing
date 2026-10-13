import mongoose, { Schema, Model } from "mongoose";
import { Claim } from "@/lib/domain/types";

const EntityReferenceSchema = new Schema(
  {
    entity_type: { type: String, enum: ["VEHICLE", "GARAGE", "HOSPITAL", "AGENT", "DEVICE", "PERSON"], required: true },
    entity_id: { type: String, required: true },
    role: { type: String, required: true },
    name: { type: String },
  },
  { _id: false }
);

const AddressSchema = new Schema(
  {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    postal_code: { type: String },
    coordinates: [{ type: Number }],
  },
  { _id: false }
);

export const ClaimSchema = new Schema<Claim>(
  {
    claim_id: { type: String, required: true, unique: true, index: true },
    idempotency_key: { type: String, index: true, sparse: true },
    policy_id: { type: String, required: true, index: true },
    customer_id: { type: String, required: true, index: true },
    claim_type: { type: String, enum: ["AUTO", "HEALTH", "PROPERTY"], required: true },
    // Simplified 4-State Claim Status
    status: {
      type: String,
      enum: ["RECEIVED", "VALIDATED", "FLAGGED", "INVALID"],
      default: "RECEIVED",
      index: true,
    },
    incident_date: { type: String, required: true },
    reported_date: { type: String, required: true },
    claimed_amount: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    description: { type: String, required: true },
    location: AddressSchema,
    involved_entities: [EntityReferenceSchema],
    claim_details: { type: Schema.Types.Mixed, default: {} },
    validation_errors: [{ type: String }],
    risk_indicators: [{ type: String }],
    graph_sync_status: {
      type: String,
      enum: ["PENDING", "SYNCED", "FAILED", "NOT_CONFIGURED"],
      default: "PENDING",
    },
    created_at: { type: String, default: () => new Date().toISOString() },
    updated_at: { type: String, default: () => new Date().toISOString() },
  },
  {
    collection: "claims",
    timestamps: false,
    versionKey: false,
  }
);

export const ClaimModel: Model<Claim> =
  mongoose.models.Claim || mongoose.model<Claim>("Claim", ClaimSchema);

export default ClaimModel;
