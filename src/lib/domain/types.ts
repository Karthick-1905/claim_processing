export type ClaimType = "AUTO" | "HEALTH" | "PROPERTY";

export type ClaimStatus =
  | "RECEIVED"
  | "VALIDATED"
  | "FLAGGED"
  | "INVALID";

export type PolicyType = "AUTO" | "HEALTH" | "PROPERTY";
export type PolicyStatus = "ACTIVE" | "LAPSED" | "CANCELLED" | "EXPIRED";

export type ProviderType = "GARAGE" | "HOSPITAL" | "CONTRACTOR" | "INSPECTOR";

export type GraphSyncStatus = "PENDING" | "SYNCED" | "FAILED" | "NOT_CONFIGURED";

export interface Address {
  street: string;
  city: string;
  state: string;
  postal_code: string;
  coordinates?: [number, number];
}

export interface EntityReference {
  entity_type: "VEHICLE" | "GARAGE" | "HOSPITAL" | "AGENT" | "DEVICE" | "PERSON";
  entity_id: string;
  role: string;
  name?: string;
}

export interface AutoClaimDetails {
  vin: string;
  license_plate: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  estimated_repair_cost: number;
  drivable: boolean;
  police_report_filed: boolean;
  police_report_number?: string;
  repair_facility_id?: string;
}

export interface HealthClaimDetails {
  diagnosis_codes: string[];
  procedure_codes: string[];
  admission_date?: string;
  discharge_date?: string;
  treatment_facility_id?: string;
  attending_physician_id?: string;
}

export interface PropertyClaimDetails {
  property_type: "RESIDENTIAL" | "COMMERCIAL" | "INDUSTRIAL";
  property_address: string;
  damage_type: "WATER_LEAK" | "FIRE" | "STORM" | "THEFT" | "VANDALISM";
  estimated_restoration_cost: number;
  inspector_id?: string;
}

export type ClaimDetails = {
  auto?: AutoClaimDetails;
  health?: HealthClaimDetails;
  property?: PropertyClaimDetails;
};

export interface SupportingDocument {
  doc_id: string;
  document_type: string;
  storage_uri: string;
  uploaded_at: string;
}

export interface Claim {
  _id?: string;
  claim_id: string;
  idempotency_key?: string;
  policy_id: string;
  customer_id: string;
  claim_type: ClaimType;
  status: ClaimStatus;
  incident_date: string;
  reported_date: string;
  claimed_amount: number;
  currency: string;
  description: string;
  location?: Address;
  involved_entities: EntityReference[];
  claim_details: ClaimDetails;
  supporting_documents?: SupportingDocument[];
  validation_errors?: string[];
  risk_indicators?: string[];
  graph_sync_status: GraphSyncStatus;
  created_at: string;
  updated_at: string;
}

export interface PolicyCoveredAsset {
  asset_type: "VEHICLE" | "PROPERTY" | "INDIVIDUAL";
  identifier: string; // e.g. VIN or Property Address
  description?: string;
}

export interface Policy {
  _id?: string;
  policy_id: string;
  customer_id: string;
  policy_type: PolicyType;
  status: PolicyStatus;
  start_date: string;
  end_date: string;
  coverage_limit: number;
  deductible: number;
  covered_assets: PolicyCoveredAsset[];
  created_at: string;
}

export interface Customer {
  _id?: string;
  customer_id: string;
  full_name: string;
  national_id_hash: string;
  email: string;
  phone: string;
  address: Address;
  created_at: string;
}

export interface ServiceProvider {
  _id?: string;
  provider_id: string;
  provider_type: ProviderType;
  business_name: string;
  license_number: string;
  tax_id: string;
  address: Address;
  phone: string;
  created_at: string;
}

export type EventType =
  | "CLAIM_RECEIVED"
  | "VALIDATION_PASSED"
  | "VALIDATION_FAILED"
  | "FRAUD_FLAGGED";

export interface ClaimEvent {
  _id?: string;
  event_id: string;
  claim_id: string;
  event_type: EventType;
  from_status?: ClaimStatus;
  to_status?: ClaimStatus;
  timestamp: string;
  trigger_source: string;
  actor: string;
  details: Record<string, unknown>;
}
