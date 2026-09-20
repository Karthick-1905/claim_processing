import { z } from "zod";

const AddressSchema = z.object({
  street: z.string().min(1, "Street is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(2, "State is required"),
  postal_code: z.string().min(3, "Postal code is required"),
  coordinates: z.tuple([z.number(), z.number()]).optional(),
});

const EntityReferenceSchema = z.object({
  entity_type: z.enum(["VEHICLE", "GARAGE", "HOSPITAL", "AGENT", "DEVICE", "PERSON"]),
  entity_id: z.string().min(1, "Entity ID is required"),
  role: z.string().min(1, "Role is required"),
  name: z.string().optional(),
});

const AutoClaimDetailsSchema = z.object({
  vin: z.string().min(5, "Valid VIN or serial required"),
  license_plate: z.string().min(1, "License plate is required"),
  vehicle_make: z.string().min(1, "Make is required"),
  vehicle_model: z.string().min(1, "Model is required"),
  vehicle_year: z.number().int().min(1950).max(new Date().getFullYear() + 1),
  estimated_repair_cost: z.number().positive("Repair cost must be positive"),
  drivable: z.boolean(),
  police_report_filed: z.boolean(),
  police_report_number: z.string().optional(),
  repair_facility_id: z.string().optional(),
});

const HealthClaimDetailsSchema = z.object({
  diagnosis_codes: z.array(z.string().min(1)).min(1, "At least one diagnosis code required"),
  procedure_codes: z.array(z.string().min(1)).min(1, "At least one procedure code required"),
  admission_date: z.string().datetime().optional(),
  discharge_date: z.string().datetime().optional(),
  treatment_facility_id: z.string().optional(),
  attending_physician_id: z.string().optional(),
});

const PropertyClaimDetailsSchema = z.object({
  property_type: z.enum(["RESIDENTIAL", "COMMERCIAL", "INDUSTRIAL"]),
  property_address: z.string().min(5, "Property address is required"),
  damage_type: z.enum(["WATER_LEAK", "FIRE", "STORM", "THEFT", "VANDALISM"]),
  estimated_restoration_cost: z.number().positive("Restoration cost must be positive"),
  inspector_id: z.string().optional(),
});

export const IngestClaimSchema = z.object({
  idempotency_key: z.string().optional(),
  policy_id: z.string().min(1, "Policy ID is required"),
  customer_id: z.string().min(1, "Customer ID is required"),
  claim_type: z.enum(["AUTO", "HEALTH", "PROPERTY"]),
  incident_date: z.string().datetime({ message: "Incident date must be valid ISO-8601 UTC timestamp" }),
  reported_date: z.string().datetime({ message: "Reported date must be valid ISO-8601 UTC timestamp" }).optional(),
  claimed_amount: z.number().positive("Claimed amount must be greater than zero"),
  currency: z.string().length(3).default("USD"),
  description: z.string().min(5, "Description must be at least 5 characters"),
  location: AddressSchema.optional(),
  involved_entities: z.array(EntityReferenceSchema).default([]),
  claim_details: z.object({
    auto: AutoClaimDetailsSchema.optional(),
    health: HealthClaimDetailsSchema.optional(),
    property: PropertyClaimDetailsSchema.optional(),
  }).refine((details) => {
    return Boolean(details.auto || details.health || details.property);
  }, { message: "Appropriate claim details must be supplied for the specified claim type" }),
});

export type IngestClaimInput = z.infer<typeof IngestClaimSchema>;
