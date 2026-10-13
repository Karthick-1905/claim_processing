import mongoose, { Schema, Model } from "mongoose";
import { Customer } from "@/lib/domain/types";

export const CustomerSchema = new Schema<Customer>(
  {
    customer_id: { type: String, required: true, unique: true, index: true },
    full_name: { type: String, required: true },
    national_id_hash: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postal_code: { type: String, required: true },
      coordinates: [{ type: Number }],
    },
    created_at: { type: String, default: () => new Date().toISOString() },
  },
  {
    collection: "customers",
    timestamps: false,
    versionKey: false,
  }
);

export const CustomerModel: Model<Customer> =
  mongoose.models.Customer || mongoose.model<Customer>("Customer", CustomerSchema);

export default CustomerModel;
