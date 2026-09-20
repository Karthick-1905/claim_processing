import { getDatabase, ensureIndexes } from "@/lib/db/mongodb";
import { Customer, Policy, ServiceProvider, Claim, ClaimEvent } from "@/lib/domain/types";

export async function seedDatabase(): Promise<{
  customersCount: number;
  policiesCount: number;
  providersCount: number;
  claimsCount: number;
  eventsCount: number;
}> {
  await ensureIndexes();
  const db = await getDatabase();

  // Clear existing collections
  await db.collection("customers").deleteMany({});
  await db.collection("policies").deleteMany({});
  await db.collection("service_providers").deleteMany({});
  await db.collection("claims").deleteMany({});
  await db.collection("claim_events").deleteMany({});

  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
  const oneYearAhead = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const expiredDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Master Customers
  const customers: Customer[] = [
    {
      customer_id: "CUST-1001",
      full_name: "Elena Rostova",
      national_id_hash: "sha256_e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      email: "elena.rostova@example.com",
      phone: "+1-512-555-0144",
      address: { street: "1204 Congress Ave", city: "Austin", state: "TX", postal_code: "78701" },
      created_at: oneYearAgo,
    },
    {
      customer_id: "CUST-1002",
      full_name: "Marcus Vance",
      national_id_hash: "sha256_88d4266fd4e6338d13b845fcf289579d209c897823b9217da3e161936f031589",
      email: "m.vance@example.com",
      phone: "+1-512-555-0189",
      address: { street: "808 Guadalupe St", city: "Austin", state: "TX", postal_code: "78701" },
      created_at: oneYearAgo,
    },
    {
      customer_id: "CUST-1003",
      full_name: "Aaliyah Patel",
      national_id_hash: "sha256_ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb",
      email: "aaliyah.p@example.com",
      phone: "+1-713-555-0192",
      address: { street: "3400 Post Oak Blvd", city: "Houston", state: "TX", postal_code: "77056" },
      created_at: oneYearAgo,
    },
    {
      customer_id: "CUST-1004",
      full_name: "Rodrigo Morales",
      national_id_hash: "sha256_3b64db6bc7ced8890e6bc9bf91cd164746a42455e2f494f1600f107702417645",
      email: "rodrigo.m@example.com",
      phone: "+1-210-555-0133",
      address: { street: "502 River Walk", city: "San Antonio", state: "TX", postal_code: "78205" },
      created_at: oneYearAgo,
    },
  ];
  await db.collection<Customer>("customers").insertMany(customers);

  // 2. Master Policies
  const policies: Policy[] = [
    {
      policy_id: "POL-AUTO-88219",
      customer_id: "CUST-1001",
      policy_type: "AUTO",
      status: "ACTIVE",
      start_date: oneYearAgo,
      end_date: oneYearAhead,
      coverage_limit: 50000,
      deductible: 500,
      covered_assets: [
        { asset_type: "VEHICLE", identifier: "1HGCR2F83HA019284", description: "2021 Honda Accord Sedan" },
      ],
      created_at: oneYearAgo,
    },
    {
      policy_id: "POL-AUTO-99304",
      customer_id: "CUST-1002",
      policy_type: "AUTO",
      status: "ACTIVE",
      start_date: oneYearAgo,
      end_date: oneYearAhead,
      coverage_limit: 65000,
      deductible: 1000,
      covered_assets: [
        { asset_type: "VEHICLE", identifier: "4T1B11HK5JU109482", description: "2022 Toyota Camry SE" },
      ],
      created_at: oneYearAgo,
    },
    {
      policy_id: "POL-HLTH-44011",
      customer_id: "CUST-1003",
      policy_type: "HEALTH",
      status: "ACTIVE",
      start_date: oneYearAgo,
      end_date: oneYearAhead,
      coverage_limit: 250000,
      deductible: 1500,
      covered_assets: [
        { asset_type: "INDIVIDUAL", identifier: "CUST-1003", description: "Primary Insured" },
      ],
      created_at: oneYearAgo,
    },
    {
      policy_id: "POL-AUTO-EXPIRED",
      customer_id: "CUST-1004",
      policy_type: "AUTO",
      status: "EXPIRED",
      start_date: "2023-01-01T00:00:00Z",
      end_date: expiredDate,
      coverage_limit: 40000,
      deductible: 500,
      covered_assets: [
        { asset_type: "VEHICLE", identifier: "3FA6P0HD4ER209184", description: "2018 Ford Fusion" },
      ],
      created_at: "2023-01-01T00:00:00Z",
    },
  ];
  await db.collection<Policy>("policies").insertMany(policies);

  // 3. Service Providers & Garages
  const providers: ServiceProvider[] = [
    {
      provider_id: "GAR-77401",
      provider_type: "GARAGE",
      business_name: "Apex Auto Collision Center",
      license_number: "TX-GAR-88410",
      tax_id: "74-2901840",
      address: { street: "4401 E Ben White Blvd", city: "Austin", state: "TX", postal_code: "78741" },
      phone: "+1-512-555-8822",
      created_at: oneYearAgo,
    },
    {
      provider_id: "GAR-88102",
      provider_type: "GARAGE",
      business_name: "Lonestar Body & Paint",
      license_number: "TX-GAR-99021",
      tax_id: "74-3391821",
      address: { street: "1090 North Lamar Blvd", city: "Austin", state: "TX", postal_code: "78753" },
      phone: "+1-512-555-3391",
      created_at: oneYearAgo,
    },
    {
      provider_id: "HSP-10920",
      provider_type: "HOSPITAL",
      business_name: "Austin Metro General Hospital",
      license_number: "TX-MED-44019",
      tax_id: "74-1182740",
      address: { street: "1500 Red River St", city: "Austin", state: "TX", postal_code: "78701" },
      phone: "+1-512-555-4000",
      created_at: oneYearAgo,
    },
  ];
  await db.collection<ServiceProvider>("service_providers").insertMany(providers);

  // 4. Initial Seed Claims with Event Logs
  const claim1Date = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const claim2Date = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const claim3Date = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
  const claim4Date = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();

  const claims: Claim[] = [
    {
      claim_id: "CLM-2026-0917-001",
      policy_id: "POL-AUTO-88219",
      customer_id: "CUST-1001",
      claim_type: "AUTO",
      status: "READY_FOR_ANALYSIS",
      incident_date: claim1Date,
      reported_date: claim1Date,
      claimed_amount: 6850.0,
      currency: "USD",
      description: "Rear-end collision at traffic stop. Rear bumper and sensor damage.",
      location: { street: "I-35 Frontage Rd", city: "Austin", state: "TX", postal_code: "78704" },
      involved_entities: [
        { entity_type: "GARAGE", entity_id: "GAR-77401", role: "REPAIR_FACILITY", name: "Apex Auto Collision Center" },
        { entity_type: "AGENT", entity_id: "AGT-3029", role: "HANDLING_BROKER", name: "David Miller Agency" },
        { entity_type: "VEHICLE", entity_id: "1HGCR2F83HA019284", role: "INSURED_VEHICLE" },
      ],
      claim_details: {
        auto: {
          vin: "1HGCR2F83HA019284",
          license_plate: "TX-ABC-1234",
          vehicle_make: "Honda",
          vehicle_model: "Accord",
          vehicle_year: 2021,
          estimated_repair_cost: 6850.0,
          drivable: true,
          police_report_filed: true,
          police_report_number: "APD-2026-99182",
          repair_facility_id: "GAR-77401",
        },
      },
      validation_errors: [],
      graph_sync_status: "PENDING",
      pyspark_batch_watermark: null,
      created_at: claim1Date,
      updated_at: claim1Date,
    },
    {
      // Controlled pattern: Second customer CUST-1002 using same garage GAR-77401 and agent AGT-3029 within 24h
      claim_id: "CLM-2026-0918-002",
      policy_id: "POL-AUTO-99304",
      customer_id: "CUST-1002",
      claim_type: "AUTO",
      status: "READY_FOR_ANALYSIS",
      incident_date: claim2Date,
      reported_date: claim2Date,
      claimed_amount: 7200.0,
      currency: "USD",
      description: "Sideswipe collision on multi-lane artery. Driver door replacement.",
      location: { street: "E Riverside Dr", city: "Austin", state: "TX", postal_code: "78741" },
      involved_entities: [
        { entity_type: "GARAGE", entity_id: "GAR-77401", role: "REPAIR_FACILITY", name: "Apex Auto Collision Center" },
        { entity_type: "AGENT", entity_id: "AGT-3029", role: "HANDLING_BROKER", name: "David Miller Agency" },
        { entity_type: "VEHICLE", entity_id: "4T1B11HK5JU109482", role: "INSURED_VEHICLE" },
      ],
      claim_details: {
        auto: {
          vin: "4T1B11HK5JU109482",
          license_plate: "TX-XYZ-9876",
          vehicle_make: "Toyota",
          vehicle_model: "Camry",
          vehicle_year: 2022,
          estimated_repair_cost: 7200.0,
          drivable: false,
          police_report_filed: true,
          police_report_number: "APD-2026-99240",
          repair_facility_id: "GAR-77401",
        },
      },
      validation_errors: [],
      graph_sync_status: "PENDING",
      pyspark_batch_watermark: null,
      created_at: claim2Date,
      updated_at: claim2Date,
    },
    {
      claim_id: "CLM-2026-0915-003",
      policy_id: "POL-HLTH-44011",
      customer_id: "CUST-1003",
      claim_type: "HEALTH",
      status: "READY_FOR_ANALYSIS",
      incident_date: claim3Date,
      reported_date: claim3Date,
      claimed_amount: 3450.0,
      currency: "USD",
      description: "Emergency room consultation and diagnostic imaging following acute pain.",
      location: { street: "1500 Red River St", city: "Austin", state: "TX", postal_code: "78701" },
      involved_entities: [
        { entity_type: "HOSPITAL", entity_id: "HSP-10920", role: "TREATMENT_FACILITY", name: "Austin Metro General Hospital" },
      ],
      claim_details: {
        health: {
          diagnosis_codes: ["R10.9", "K29.70"],
          procedure_codes: ["99284", "74176"],
          admission_date: claim3Date,
          discharge_date: claim3Date,
          treatment_facility_id: "HSP-10920",
        },
      },
      validation_errors: [],
      graph_sync_status: "PENDING",
      pyspark_batch_watermark: null,
      created_at: claim3Date,
      updated_at: claim3Date,
    },
    {
      // Invalid claim: Attempted filing on expired policy POL-AUTO-EXPIRED
      claim_id: "CLM-2026-0919-004",
      policy_id: "POL-AUTO-EXPIRED",
      customer_id: "CUST-1004",
      claim_type: "AUTO",
      status: "INVALID",
      incident_date: claim4Date,
      reported_date: claim4Date,
      claimed_amount: 5100.0,
      currency: "USD",
      description: "Fender damage in private parking facility.",
      location: { street: "502 River Walk", city: "San Antonio", state: "TX", postal_code: "78205" },
      involved_entities: [
        { entity_type: "GARAGE", entity_id: "GAR-88102", role: "REPAIR_FACILITY", name: "Lonestar Body & Paint" },
      ],
      claim_details: {
        auto: {
          vin: "3FA6P0HD4ER209184",
          license_plate: "TX-SAT-4401",
          vehicle_make: "Ford",
          vehicle_model: "Fusion",
          vehicle_year: 2018,
          estimated_repair_cost: 5100.0,
          drivable: true,
          police_report_filed: false,
        },
      },
      validation_errors: [
        "ERR_POLICY_NOT_ACTIVE: Policy 'POL-AUTO-EXPIRED' status is 'EXPIRED', not ACTIVE.",
        "ERR_POLICY_DATE_OUT_OF_BOUNDS: Incident date falls outside effective coverage window.",
      ],
      graph_sync_status: "NOT_CONFIGURED",
      pyspark_batch_watermark: null,
      created_at: claim4Date,
      updated_at: claim4Date,
    },
  ];
  await db.collection<Claim>("claims").insertMany(claims);

  // 5. Events audit trail for each seeded claim
  const events: ClaimEvent[] = [
    // Events for CLM-2026-0917-001
    {
      event_id: "EVT-SEED-001A",
      claim_id: "CLM-2026-0917-001",
      event_type: "CLAIM_RECEIVED",
      from_status: undefined,
      to_status: "RECEIVED",
      timestamp: claim1Date,
      trigger_source: "CLAIM_INGESTION_SERVICE",
      actor: "system_ingress",
      details: { policy_id: "POL-AUTO-88219", claimed_amount: 6850.0 },
    },
    {
      event_id: "EVT-SEED-001B",
      claim_id: "CLM-2026-0917-001",
      event_type: "VALIDATION_SUCCEEDED",
      from_status: "VALIDATING",
      to_status: "VALIDATED",
      timestamp: claim1Date,
      trigger_source: "VALIDATION_ENGINE",
      actor: "validator_tier1_3",
      details: { verified_policy: "POL-AUTO-88219", policyholder: "Elena Rostova" },
    },
    {
      event_id: "EVT-SEED-001C",
      claim_id: "CLM-2026-0917-001",
      event_type: "ENRICHMENT_COMPLETED",
      from_status: "VALIDATED",
      to_status: "READY_FOR_ANALYSIS",
      timestamp: claim1Date,
      trigger_source: "ENRICHMENT_SERVICE",
      actor: "enrichment_worker",
      details: { geocoded: true, normalized: true, ready_for_pyspark: true },
    },

    // Events for CLM-2026-0918-002
    {
      event_id: "EVT-SEED-002A",
      claim_id: "CLM-2026-0918-002",
      event_type: "CLAIM_RECEIVED",
      from_status: undefined,
      to_status: "RECEIVED",
      timestamp: claim2Date,
      trigger_source: "CLAIM_INGESTION_SERVICE",
      actor: "system_ingress",
      details: { policy_id: "POL-AUTO-99304", claimed_amount: 7200.0 },
    },
    {
      event_id: "EVT-SEED-002B",
      claim_id: "CLM-2026-0918-002",
      event_type: "VALIDATION_SUCCEEDED",
      from_status: "VALIDATING",
      to_status: "VALIDATED",
      timestamp: claim2Date,
      trigger_source: "VALIDATION_ENGINE",
      actor: "validator_tier1_3",
      details: { verified_policy: "POL-AUTO-99304", policyholder: "Marcus Vance" },
    },
    {
      event_id: "EVT-SEED-002C",
      claim_id: "CLM-2026-0918-002",
      event_type: "ENRICHMENT_COMPLETED",
      from_status: "VALIDATED",
      to_status: "READY_FOR_ANALYSIS",
      timestamp: claim2Date,
      trigger_source: "ENRICHMENT_SERVICE",
      actor: "enrichment_worker",
      details: { geocoded: true, normalized: true, ready_for_pyspark: true },
    },

    // Events for CLM-2026-0919-004 (Invalid)
    {
      event_id: "EVT-SEED-004A",
      claim_id: "CLM-2026-0919-004",
      event_type: "CLAIM_RECEIVED",
      from_status: undefined,
      to_status: "RECEIVED",
      timestamp: claim4Date,
      trigger_source: "CLAIM_INGESTION_SERVICE",
      actor: "system_ingress",
      details: { policy_id: "POL-AUTO-EXPIRED", claimed_amount: 5100.0 },
    },
    {
      event_id: "EVT-SEED-004B",
      claim_id: "CLM-2026-0919-004",
      event_type: "VALIDATION_FAILED",
      from_status: "VALIDATING",
      to_status: "INVALID",
      timestamp: claim4Date,
      trigger_source: "VALIDATION_ENGINE",
      actor: "validator_tier1_3",
      details: {
        errors: [
          "ERR_POLICY_NOT_ACTIVE: Policy 'POL-AUTO-EXPIRED' status is 'EXPIRED', not ACTIVE.",
          "ERR_POLICY_DATE_OUT_OF_BOUNDS: Incident date falls outside effective coverage window.",
        ],
      },
    },
  ];
  await db.collection<ClaimEvent>("claim_events").insertMany(events);

  return {
    customersCount: customers.length,
    policiesCount: policies.length,
    providersCount: providers.length,
    claimsCount: claims.length,
    eventsCount: events.length,
  };
}
