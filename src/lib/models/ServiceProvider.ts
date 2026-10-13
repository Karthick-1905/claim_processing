import mongoose, { Schema, Model } from "mongoose";
import { ServiceProvider } from "@/lib/domain/types";

export const ServiceProviderSchema = new Schema<ServiceProvider>(
  {
    provider_id: { type: String, required: true, unique: true, index: true },
    provider_type: { type: String, enum: ["GARAGE", "HOSPITAL", "CONTRACTOR", "INSPECTOR"], required: true },
    business_name: { type: String, required: true },
    license_number: { type: String, required: true },
    tax_id: { type: String, required: true },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postal_code: { type: String, required: true },
      coordinates: [{ type: Number }],
    },
    phone: { type: String, required: true },
    created_at: { type: String, default: () => new Date().toISOString() },
  },
  {
    collection: "service_providers",
    timestamps: false,
    versionKey: false,
  }
);

export const ServiceProviderModel: Model<ServiceProvider> =
  mongoose.models.ServiceProvider || mongoose.model<ServiceProvider>("ServiceProvider", ServiceProviderSchema);

export default ServiceProviderModel;
