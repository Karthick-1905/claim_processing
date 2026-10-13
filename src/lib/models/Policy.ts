import mongoose, { Schema, Model } from "mongoose";
import { Policy } from "@/lib/domain/types";

const CoveredAssetSchema = new Schema(
  {
    asset_type: { type: String, enum: ["VEHICLE", "PROPERTY", "INDIVIDUAL"], required: true },
    identifier: { type: String, required: true },
    description: { type: String },
  },
  { _id: false }
);

export const PolicySchema = new Schema<Policy>(
  {
    policy_id: { type: String, required: true, unique: true, index: true },
    customer_id: { type: String, required: true, index: true },
    policy_type: { type: String, enum: ["AUTO", "HEALTH", "PROPERTY"], required: true },
    status: { type: String, enum: ["ACTIVE", "LAPSED", "CANCELLED", "EXPIRED"], default: "ACTIVE" },
    start_date: { type: String, required: true },
    end_date: { type: String, required: true },
    coverage_limit: { type: Number, required: true },
    deductible: { type: Number, default: 500 },
    covered_assets: [CoveredAssetSchema],
    created_at: { type: String, default: () => new Date().toISOString() },
  },
  {
    collection: "policies",
    timestamps: false,
    versionKey: false,
  }
);

export const PolicyModel: Model<Policy> =
  mongoose.models.Policy || mongoose.model<Policy>("Policy", PolicySchema);

export default PolicyModel;
