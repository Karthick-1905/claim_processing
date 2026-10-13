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

  // 1. Comprehensive Master Customers
  const customers: Customer[] = [
    {
      customer_id: "CUST-1001",
      full_name: "Elena Vance",
      national_id_hash: "sha256_e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      email: "elena.vance@apex-claims.org",
      phone: "+1-512-555-0144",
      address: { street: "1204 Congress Ave", city: "Austin", state: "TX", postal_code: "78701" },
      created_at: oneYearAgo,
    },
    {
      customer_id: "CUST-1002",
      full_name: "Marcus Brody",
      national_id_hash: "sha256_88d4266fd4e6338d13b845fcf289579d209c897823b9217da3e161936f031589",
      email: "marcus.brody@apex-claims.org",
      phone: "+1-512-555-0189",
      address: { street: "808 Guadalupe St", city: "Austin", state: "TX", postal_code: "78701" },
      created_at: oneYearAgo,
    },
    {
      customer_id: "CUST-1003",
      full_name: "Aaliyah Patel",
      national_id_hash: "sha256_ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb",
      email: "aaliyah.p@health-insure.org",
      phone: "+1-713-555-0192",
      address: { street: "3400 Post Oak Blvd", city: "Houston", state: "TX", postal_code: "77056" },
      created_at: oneYearAgo,
    },
    {
      customer_id: "CUST-1004",
      full_name: "Devon Miller",
      national_id_hash: "sha256_3b64db6bc7ced8890e6bc9bf91cd164746a42455e2f494f1600f107702417645",
      email: "devon.miller@metro-transit.net",
      phone: "+1-210-555-0133",
      address: { street: "502 River Walk", city: "San Antonio", state: "TX", postal_code: "78205" },
      created_at: oneYearAgo,
    },
    {
      customer_id: "CUST-1005",
      full_name: "Robert Chen",
      national_id_hash: "sha256_7c99352bb76d2814dd20447192acf1d69145d070a2233ce55f6fed52a7380f9",
      email: "robert.chen@austin-fleet.org",
      phone: "+1-512-555-0167",
      address: { street: "2201 S Lamar Blvd", city: "Austin", state: "TX", postal_code: "78704" },
      created_at: oneYearAgo,
    },
    {
      customer_id: "CUST-1006",
      full_name: "Sarah Jenkins",
      national_id_hash: "sha256_9f83c60518b48b251300c950fefd7f2ec102130575fcd005d0270d793e3f08f",
      email: "sarah.j@lone-star.com",
      phone: "+1-214-555-0188",
      address: { street: "1717 McKinney Ave", city: "Dallas", state: "TX", postal_code: "75201" },
      created_at: oneYearAgo,
    },
    {
      customer_id: "CUST-1007",
      full_name: "Carlos Ramirez",
      national_id_hash: "sha256_4a6821d3f960efd43e5c9b1397b91d2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8",
      email: "carlos.r@medical-patient.org",
      phone: "+1-512-555-0199",
      address: { street: "1104 E 6th St", city: "Austin", state: "TX", postal_code: "78702" },
      created_at: oneYearAgo,
    },
    {
      customer_id: "CUST-1008",
      full_name: "Priya Sharma",
      national_id_hash: "sha256_5b7932e4f071efd54f6d0c2408c02e3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9",
      email: "priya.sharma@austin-metro.com",
      phone: "+1-512-555-0122",
      address: { street: "3801 N Capital of Texas Hwy", city: "Austin", state: "TX", postal_code: "78746" },
      created_at: oneYearAgo,
    },
  ];
  await db.collection<Customer>("customers").insertMany(customers);

  // 2. Comprehensive Master Policies
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
    {
      policy_id: "POL-AUTO-1004A",
      customer_id: "CUST-1004",
      policy_type: "AUTO",
      status: "ACTIVE",
      start_date: oneYearAgo,
      end_date: oneYearAhead,
      coverage_limit: 45000,
      deductible: 500,
      covered_assets: [
        { asset_type: "VEHICLE", identifier: "1HGCR2F83HA019284", description: "2021 Honda Accord (Cross-Claimed VIN)" },
      ],
      created_at: oneYearAgo,
    },
    {
      policy_id: "POL-AUTO-1005A",
      customer_id: "CUST-1005",
      policy_type: "AUTO",
      status: "ACTIVE",
      start_date: oneYearAgo,
      end_date: oneYearAhead,
      coverage_limit: 55000,
      deductible: 750,
      covered_assets: [
        { asset_type: "VEHICLE", identifier: "4T1B11HK5JU109482", description: "2022 Toyota Camry (Cross-Claimed VIN)" },
      ],
      created_at: oneYearAgo,
    },
    {
      policy_id: "POL-AUTO-1006A",
      customer_id: "CUST-1006",
      policy_type: "AUTO",
      status: "ACTIVE",
      start_date: oneYearAgo,
      end_date: oneYearAhead,
      coverage_limit: 60000,
      deductible: 1000,
      covered_assets: [
        { asset_type: "VEHICLE", identifier: "1FTFW1ED4MFA19283", description: "2023 Ford F-150 SuperCrew" },
      ],
      created_at: oneYearAgo,
    },
    {
      policy_id: "POL-HLTH-44012",
      customer_id: "CUST-1007",
      policy_type: "HEALTH",
      status: "ACTIVE",
      start_date: oneYearAgo,
      end_date: oneYearAhead,
      coverage_limit: 150000,
      deductible: 1000,
      covered_assets: [
        { asset_type: "INDIVIDUAL", identifier: "CUST-1007", description: "Primary Insured" },
      ],
      created_at: oneYearAgo,
    },
    {
      policy_id: "POL-AUTO-1008A",
      customer_id: "CUST-1008",
      policy_type: "AUTO",
      status: "ACTIVE",
      start_date: oneYearAgo,
      end_date: oneYearAhead,
      coverage_limit: 50000,
      deductible: 500,
      covered_assets: [
        { asset_type: "VEHICLE", identifier: "5N1AL0MN8JC819201", description: "2021 Nissan Rogue SV" },
      ],
      created_at: oneYearAgo,
    },
  ];
  await db.collection<Policy>("policies").insertMany(policies);

  // 3. Service Providers & Intermediaries
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
      provider_id: "GAR-99210",
      provider_type: "GARAGE",
      business_name: "Premier Fleet Auto Repair",
      license_number: "TX-GAR-44102",
      tax_id: "74-8819203",
      address: { street: "1420 W Commerce St", city: "San Antonio", state: "TX", postal_code: "78207" },
      phone: "+1-210-555-9921",
      created_at: oneYearAgo,
    },
    {
      provider_id: "AGT-3029",
      provider_type: "CONTRACTOR", // Represents Agent/Broker
      business_name: "David Miller Insurance Brokerage",
      license_number: "TX-AGT-3029",
      tax_id: "74-1029384",
      address: { street: "701 Brazos St", city: "Austin", state: "TX", postal_code: "78701" },
      phone: "+1-512-555-3029",
      created_at: oneYearAgo,
    },
    {
      provider_id: "AGT-4401",
      provider_type: "CONTRACTOR",
      business_name: "Lone Star Underwriters Agency",
      license_number: "TX-AGT-4401",
      tax_id: "74-9988112",
      address: { street: "300 Convent St", city: "San Antonio", state: "TX", postal_code: "78205" },
      phone: "+1-210-555-4401",
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

  // 4. Comprehensive Seed Claims (Apex Collusion Ring, VIN Recycling Ring, Provider Ring, Normal, and Invalid)
  const d = (daysAgo: number) => new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

  const claims: Claim[] = [
    // -------------------------------------------------------------
    // RING 1: APEX AUTO COLLISION & BROKER COLLUSION RING (GAR-77401 + AGT-3029)
    // -------------------------------------------------------------
    {
      claim_id: "CLM-2026-0917-001",
      policy_id: "POL-AUTO-88219",
      customer_id: "CUST-1001",
      claim_type: "AUTO",
      status: "READY_FOR_ANALYSIS",
      incident_date: d(24),
      reported_date: d(24),
      claimed_amount: 6850.0,
      currency: "USD",
      description: "Rear bumper and collision damage at urban intersection.",
      location: { street: "I-35 Frontage Rd", city: "Austin", state: "TX", postal_code: "78704" },
      involved_entities: [
        { entity_type: "GARAGE", entity_id: "GAR-77401", role: "REPAIR_FACILITY", name: "Apex Auto Collision Center" },
        { entity_type: "AGENT", entity_id: "AGT-3029", role: "HANDLING_BROKER", name: "David Miller Agency" },
        { entity_type: "VEHICLE", entity_id: "1HGCR2F83HA019284", role: "INSURED_VEHICLE" },
      ],
      claim_details: {
        auto: { vin: "1HGCR2F83HA019284", license_plate: "TX-ABC-1234", vehicle_make: "Honda", vehicle_model: "Accord", vehicle_year: 2021, estimated_repair_cost: 6850.0, drivable: true, police_report_filed: true },
      },
      validation_errors: [],
      graph_sync_status: "PENDING",
      created_at: d(24),
      updated_at: d(24),
    },
    {
      claim_id: "CLM-2026-0918-002",
      policy_id: "POL-AUTO-99304",
      customer_id: "CUST-1002",
      claim_type: "AUTO",
      status: "READY_FOR_ANALYSIS",
      incident_date: d(22),
      reported_date: d(22),
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
        auto: { vin: "4T1B11HK5JU109482", license_plate: "TX-XYZ-9876", vehicle_make: "Toyota", vehicle_model: "Camry", vehicle_year: 2022, estimated_repair_cost: 7200.0, drivable: false, police_report_filed: true },
      },
      validation_errors: [],
      graph_sync_status: "PENDING",
      created_at: d(22),
      updated_at: d(22),
    },
    {
      claim_id: "CLM-2026-0920-005",
      policy_id: "POL-AUTO-88219",
      customer_id: "CUST-1001",
      claim_type: "AUTO",
      status: "INVESTIGATION_CANDIDATE",
      incident_date: d(19),
      reported_date: d(19),
      claimed_amount: 8450.0,
      currency: "USD",
      description: "Front-end impact on highway ramp. Radiator and hood realignment.",
      location: { street: "US-183 & Ben White", city: "Austin", state: "TX", postal_code: "78741" },
      involved_entities: [
        { entity_type: "GARAGE", entity_id: "GAR-77401", role: "REPAIR_FACILITY", name: "Apex Auto Collision Center" },
        { entity_type: "AGENT", entity_id: "AGT-3029", role: "HANDLING_BROKER", name: "David Miller Agency" },
        { entity_type: "VEHICLE", entity_id: "1HGCR2F83HA019284", role: "INSURED_VEHICLE" },
      ],
      claim_details: {
        auto: { vin: "1HGCR2F83HA019284", license_plate: "TX-ABC-1234", vehicle_make: "Honda", vehicle_model: "Accord", vehicle_year: 2021, estimated_repair_cost: 8450.0, drivable: false, police_report_filed: false },
      },
      validation_errors: [],
      risk_indicators: ["RISK_DENSE_MULTI_PARTY_CLUSTER: Co-occurring garage-agent nexus", "RISK_COST_OUTLIER_ANOMALY: Repair costs > 2.0 std dev"],
      graph_sync_status: "PENDING",
      created_at: d(19),
      updated_at: d(19),
    },
    {
      claim_id: "CLM-2026-0922-006",
      policy_id: "POL-AUTO-99304",
      customer_id: "CUST-1002",
      claim_type: "AUTO",
      status: "INVESTIGATION_CANDIDATE",
      incident_date: d(16),
      reported_date: d(16),
      claimed_amount: 9100.0,
      currency: "USD",
      description: "Rear quarter panel and axle impact in shopping complex.",
      location: { street: "S Lamar Blvd", city: "Austin", state: "TX", postal_code: "78704" },
      involved_entities: [
        { entity_type: "GARAGE", entity_id: "GAR-77401", role: "REPAIR_FACILITY", name: "Apex Auto Collision Center" },
        { entity_type: "AGENT", entity_id: "AGT-3029", role: "HANDLING_BROKER", name: "David Miller Agency" },
        { entity_type: "VEHICLE", entity_id: "4T1B11HK5JU109482", role: "INSURED_VEHICLE" },
      ],
      claim_details: {
        auto: { vin: "4T1B11HK5JU109482", license_plate: "TX-XYZ-9876", vehicle_make: "Toyota", vehicle_model: "Camry", vehicle_year: 2022, estimated_repair_cost: 9100.0, drivable: false, police_report_filed: false },
      },
      validation_errors: [],
      risk_indicators: ["RISK_DENSE_MULTI_PARTY_CLUSTER: Co-occurring garage-agent nexus", "RISK_REPEATED_ASSET_VELOCITY"],
      graph_sync_status: "PENDING",
      created_at: d(16),
      updated_at: d(16),
    },
    {
      claim_id: "CLM-2026-0925-007",
      policy_id: "POL-AUTO-88219",
      customer_id: "CUST-1001",
      claim_type: "AUTO",
      status: "INVESTIGATION_CANDIDATE",
      incident_date: d(13),
      reported_date: d(13),
      claimed_amount: 7900.0,
      currency: "USD",
      description: "Low-speed parking collision resulting in multi-panel replacement.",
      location: { street: "Barton Springs Rd", city: "Austin", state: "TX", postal_code: "78704" },
      involved_entities: [
        { entity_type: "GARAGE", entity_id: "GAR-77401", role: "REPAIR_FACILITY", name: "Apex Auto Collision Center" },
        { entity_type: "AGENT", entity_id: "AGT-3029", role: "HANDLING_BROKER", name: "David Miller Agency" },
        { entity_type: "VEHICLE", entity_id: "1HGCR2F83HA019284", role: "INSURED_VEHICLE" },
      ],
      claim_details: {
        auto: { vin: "1HGCR2F83HA019284", license_plate: "TX-ABC-1234", vehicle_make: "Honda", vehicle_model: "Accord", vehicle_year: 2021, estimated_repair_cost: 7900.0, drivable: true, police_report_filed: false },
      },
      validation_errors: [],
      risk_indicators: ["RISK_DENSE_MULTI_PARTY_CLUSTER: Co-occurring garage-agent nexus"],
      graph_sync_status: "PENDING",
      created_at: d(13),
      updated_at: d(13),
    },
    {
      claim_id: "CLM-2026-0928-008",
      policy_id: "POL-AUTO-99304",
      customer_id: "CUST-1002",
      claim_type: "AUTO",
      status: "INVESTIGATION_CANDIDATE",
      incident_date: d(10),
      reported_date: d(10),
      claimed_amount: 8600.0,
      currency: "USD",
      description: "Underbody and wheel suspension damage following roadway object strike.",
      location: { street: "Loop 1 MoPac", city: "Austin", state: "TX", postal_code: "78731" },
      involved_entities: [
        { entity_type: "GARAGE", entity_id: "GAR-77401", role: "REPAIR_FACILITY", name: "Apex Auto Collision Center" },
        { entity_type: "AGENT", entity_id: "AGT-3029", role: "HANDLING_BROKER", name: "David Miller Agency" },
        { entity_type: "VEHICLE", entity_id: "4T1B11HK5JU109482", role: "INSURED_VEHICLE" },
      ],
      claim_details: {
        auto: { vin: "4T1B11HK5JU109482", license_plate: "TX-XYZ-9876", vehicle_make: "Toyota", vehicle_model: "Camry", vehicle_year: 2022, estimated_repair_cost: 8600.0, drivable: false, police_report_filed: false },
      },
      validation_errors: [],
      risk_indicators: ["RISK_DENSE_MULTI_PARTY_CLUSTER: Co-occurring garage-agent nexus"],
      graph_sync_status: "PENDING",
      created_at: d(10),
      updated_at: d(10),
    },

    // -------------------------------------------------------------
    // RING 2: ASSET VELOCITY VIN RECYCLING RING (Cross-Policy VIN Reuse)
    // -------------------------------------------------------------
    {
      claim_id: "CLM-2026-0929-009",
      policy_id: "POL-AUTO-1004A",
      customer_id: "CUST-1004",
      claim_type: "AUTO",
      status: "INVESTIGATION_CANDIDATE",
      incident_date: d(8),
      reported_date: d(8),
      claimed_amount: 12400.0,
      currency: "USD",
      description: "Total structural front crush claimed on 2021 Honda Accord (VIN 1HGCR2F83HA019284).",
      location: { street: "Loop 410 & San Pedro", city: "San Antonio", state: "TX", postal_code: "78216" },
      involved_entities: [
        { entity_type: "GARAGE", entity_id: "GAR-88102", role: "REPAIR_FACILITY", name: "Lonestar Body & Paint" },
        { entity_type: "AGENT", entity_id: "AGT-3029", role: "HANDLING_BROKER", name: "David Miller Agency" },
        { entity_type: "VEHICLE", entity_id: "1HGCR2F83HA019284", role: "INSURED_VEHICLE" },
      ],
      claim_details: {
        auto: { vin: "1HGCR2F83HA019284", license_plate: "TX-DEV-4410", vehicle_make: "Honda", vehicle_model: "Accord", vehicle_year: 2021, estimated_repair_cost: 12400.0, drivable: false, police_report_filed: false },
      },
      validation_errors: [],
      risk_indicators: ["RISK_REPEATED_ASSET_VELOCITY: Vehicle VIN reuse across unlinked policies"],
      graph_sync_status: "PENDING",
      created_at: d(8),
      updated_at: d(8),
    },
    {
      claim_id: "CLM-2026-0930-010",
      policy_id: "POL-AUTO-1005A",
      customer_id: "CUST-1005",
      claim_type: "AUTO",
      status: "INVESTIGATION_CANDIDATE",
      incident_date: d(6),
      reported_date: d(6),
      claimed_amount: 14200.0,
      currency: "USD",
      description: "Severe frame damage claimed on 2022 Toyota Camry (VIN 4T1B11HK5JU109482).",
      location: { street: "Hwy 71 & Riverside", city: "Austin", state: "TX", postal_code: "78744" },
      involved_entities: [
        { entity_type: "GARAGE", entity_id: "GAR-88102", role: "REPAIR_FACILITY", name: "Lonestar Body & Paint" },
        { entity_type: "AGENT", entity_id: "AGT-4401", role: "HANDLING_BROKER", name: "Lone Star Underwriters" },
        { entity_type: "VEHICLE", entity_id: "4T1B11HK5JU109482", role: "INSURED_VEHICLE" },
      ],
      claim_details: {
        auto: { vin: "4T1B11HK5JU109482", license_plate: "TX-ROB-9901", vehicle_make: "Toyota", vehicle_model: "Camry", vehicle_year: 2022, estimated_repair_cost: 14200.0, drivable: false, police_report_filed: false },
      },
      validation_errors: [],
      risk_indicators: ["RISK_REPEATED_ASSET_VELOCITY: Vehicle VIN reuse across unlinked policies"],
      graph_sync_status: "PENDING",
      created_at: d(6),
      updated_at: d(6),
    },

    // -------------------------------------------------------------
    // RING 3: CLOSED-LOOP PROVIDER & BROKER RING (GAR-99210 + AGT-4401)
    // -------------------------------------------------------------
    {
      claim_id: "CLM-2026-1001-011",
      policy_id: "POL-AUTO-1006A",
      customer_id: "CUST-1006",
      claim_type: "AUTO",
      status: "UNDER_REVIEW",
      incident_date: d(5),
      reported_date: d(5),
      claimed_amount: 5400.0,
      currency: "USD",
      description: "Commercial truck rear tailgate and bed damage in loading dock.",
      location: { street: "W Commerce St", city: "San Antonio", state: "TX", postal_code: "78207" },
      involved_entities: [
        { entity_type: "GARAGE", entity_id: "GAR-99210", role: "REPAIR_FACILITY", name: "Premier Fleet Auto Repair" },
        { entity_type: "AGENT", entity_id: "AGT-4401", role: "HANDLING_BROKER", name: "Lone Star Underwriters" },
        { entity_type: "VEHICLE", entity_id: "1FTFW1ED4MFA19283", role: "INSURED_VEHICLE" },
      ],
      claim_details: {
        auto: { vin: "1FTFW1ED4MFA19283", license_plate: "TX-SAR-1102", vehicle_make: "Ford", vehicle_model: "F-150", vehicle_year: 2023, estimated_repair_cost: 5400.0, drivable: true, police_report_filed: false },
      },
      validation_errors: [],
      risk_indicators: ["RISK_CLOSED_LOOP_PROVIDER: Provider-broker monopoly cluster"],
      graph_sync_status: "PENDING",
      created_at: d(5),
      updated_at: d(5),
    },
    {
      claim_id: "CLM-2026-1002-012",
      policy_id: "POL-AUTO-99304",
      customer_id: "CUST-1002",
      claim_type: "AUTO",
      status: "UNDER_REVIEW",
      incident_date: d(4),
      reported_date: d(4),
      claimed_amount: 6100.0,
      currency: "USD",
      description: "Paint scratch and body damage on passenger side.",
      location: { street: "Zarzamora St", city: "San Antonio", state: "TX", postal_code: "78207" },
      involved_entities: [
        { entity_type: "GARAGE", entity_id: "GAR-99210", role: "REPAIR_FACILITY", name: "Premier Fleet Auto Repair" },
        { entity_type: "AGENT", entity_id: "AGT-4401", role: "HANDLING_BROKER", name: "Lone Star Underwriters" },
      ],
      claim_details: {
        auto: { vin: "4T1B11HK5JU109482", license_plate: "TX-XYZ-9876", vehicle_make: "Toyota", vehicle_model: "Camry", vehicle_year: 2022, estimated_repair_cost: 6100.0, drivable: true, police_report_filed: false },
      },
      validation_errors: [],
      risk_indicators: ["RISK_CLOSED_LOOP_PROVIDER: Provider-broker monopoly cluster"],
      graph_sync_status: "PENDING",
      created_at: d(4),
      updated_at: d(4),
    },
    {
      claim_id: "CLM-2026-1003-013",
      policy_id: "POL-AUTO-1004A",
      customer_id: "CUST-1004",
      claim_type: "AUTO",
      status: "UNDER_REVIEW",
      incident_date: d(3),
      reported_date: d(3),
      claimed_amount: 4900.0,
      currency: "USD",
      description: "Front headlight and grill replacement after private lot incident.",
      location: { street: "Frio City Rd", city: "San Antonio", state: "TX", postal_code: "78207" },
      involved_entities: [
        { entity_type: "GARAGE", entity_id: "GAR-99210", role: "REPAIR_FACILITY", name: "Premier Fleet Auto Repair" },
        { entity_type: "AGENT", entity_id: "AGT-4401", role: "HANDLING_BROKER", name: "Lone Star Underwriters" },
      ],
      claim_details: {
        auto: { vin: "1HGCR2F83HA019284", license_plate: "TX-DEV-4410", vehicle_make: "Honda", vehicle_model: "Accord", vehicle_year: 2021, estimated_repair_cost: 4900.0, drivable: true, police_report_filed: false },
      },
      validation_errors: [],
      risk_indicators: ["RISK_CLOSED_LOOP_PROVIDER: Provider-broker monopoly cluster"],
      graph_sync_status: "PENDING",
      created_at: d(3),
      updated_at: d(3),
    },

    // -------------------------------------------------------------
    // LEGITIMATE CONTROL GROUP CLAIMS (HEALTH & AUTO)
    // -------------------------------------------------------------
    {
      claim_id: "CLM-2026-0915-003",
      policy_id: "POL-HLTH-44011",
      customer_id: "CUST-1003",
      claim_type: "HEALTH",
      status: "READY_FOR_ANALYSIS",
      incident_date: d(27),
      reported_date: d(27),
      claimed_amount: 3450.0,
      currency: "USD",
      description: "Emergency room consultation and diagnostic imaging following acute abdominal pain.",
      location: { street: "1500 Red River St", city: "Austin", state: "TX", postal_code: "78701" },
      involved_entities: [
        { entity_type: "HOSPITAL", entity_id: "HSP-10920", role: "TREATMENT_FACILITY", name: "Austin Metro General Hospital" },
      ],
      claim_details: {
        health: {
          diagnosis_codes: ["R10.9", "K29.70"],
          procedure_codes: ["99284", "74176"],
          admission_date: d(27),
          discharge_date: d(27),
          treatment_facility_id: "HSP-10920",
        },
      },
      validation_errors: [],
      graph_sync_status: "PENDING",
      created_at: d(27),
      updated_at: d(27),
    },
    {
      claim_id: "CLM-2026-0916-014",
      policy_id: "POL-HLTH-44012",
      customer_id: "CUST-1007",
      claim_type: "HEALTH",
      status: "VALIDATED",
      incident_date: d(25),
      reported_date: d(25),
      claimed_amount: 2800.0,
      currency: "USD",
      description: "Outpatient orthopedic assessment and MRI imaging.",
      location: { street: "1500 Red River St", city: "Austin", state: "TX", postal_code: "78701" },
      involved_entities: [
        { entity_type: "HOSPITAL", entity_id: "HSP-10920", role: "TREATMENT_FACILITY", name: "Austin Metro General Hospital" },
      ],
      claim_details: {
        health: {
          diagnosis_codes: ["M25.561"],
          procedure_codes: ["73721"],
          treatment_facility_id: "HSP-10920",
        },
      },
      validation_errors: [],
      graph_sync_status: "PENDING",
      created_at: d(25),
      updated_at: d(25),
    },
    {
      claim_id: "CLM-2026-0924-015",
      policy_id: "POL-AUTO-1008A",
      customer_id: "CUST-1008",
      claim_type: "AUTO",
      status: "VALIDATED",
      incident_date: d(14),
      reported_date: d(14),
      claimed_amount: 3200.0,
      currency: "USD",
      description: "Minor bumper scrape while backing out of garage. DRP approved repair.",
      location: { street: "Capital of Texas Hwy", city: "Austin", state: "TX", postal_code: "78746" },
      involved_entities: [
        { entity_type: "GARAGE", entity_id: "GAR-88102", role: "REPAIR_FACILITY", name: "Lonestar Body & Paint" },
        { entity_type: "VEHICLE", entity_id: "5N1AL0MN8JC819201", role: "INSURED_VEHICLE" },
      ],
      claim_details: {
        auto: { vin: "5N1AL0MN8JC819201", license_plate: "TX-PRY-8801", vehicle_make: "Nissan", vehicle_model: "Rogue", vehicle_year: 2021, estimated_repair_cost: 3200.0, drivable: true, police_report_filed: false },
      },
      validation_errors: [],
      graph_sync_status: "PENDING",
      created_at: d(14),
      updated_at: d(14),
    },

    // -------------------------------------------------------------
    // INVALID & RULE-TRAPPED CLAIMS (Trapped by Tier 1 & 2 Validation)
    // -------------------------------------------------------------
    {
      claim_id: "CLM-2026-0919-004",
      policy_id: "POL-AUTO-EXPIRED",
      customer_id: "CUST-1004",
      claim_type: "AUTO",
      status: "INVALID",
      incident_date: d(20),
      reported_date: d(20),
      claimed_amount: 5100.0,
      currency: "USD",
      description: "Fender damage in private parking facility.",
      location: { street: "502 River Walk", city: "San Antonio", state: "TX", postal_code: "78205" },
      involved_entities: [
        { entity_type: "GARAGE", entity_id: "GAR-88102", role: "REPAIR_FACILITY", name: "Lonestar Body & Paint" },
      ],
      claim_details: {
        auto: { vin: "3FA6P0HD4ER209184", license_plate: "TX-SAT-4401", vehicle_make: "Ford", vehicle_model: "Fusion", vehicle_year: 2018, estimated_repair_cost: 5100.0, drivable: true, police_report_filed: false },
      },
      validation_errors: [
        "ERR_POLICY_NOT_ACTIVE: Policy 'POL-AUTO-EXPIRED' status is 'EXPIRED', not ACTIVE.",
        "ERR_POLICY_DATE_OUT_OF_BOUNDS: Incident date falls outside effective coverage window.",
      ],
      graph_sync_status: "NOT_CONFIGURED",
      created_at: d(20),
      updated_at: d(20),
    },
    {
      claim_id: "CLM-2026-0921-016",
      policy_id: "POL-AUTO-1005A",
      customer_id: "CUST-1005",
      claim_type: "AUTO",
      status: "INVALID",
      incident_date: d(1),
      reported_date: d(5), // Temporal inversion: Reported date is 4 days BEFORE incident date!
      claimed_amount: 8500.0,
      currency: "USD",
      description: "Rear collision damage with inverted filing dates.",
      location: { street: "Lamar Blvd", city: "Austin", state: "TX", postal_code: "78704" },
      involved_entities: [
        { entity_type: "GARAGE", entity_id: "GAR-77401", role: "REPAIR_FACILITY", name: "Apex Auto Collision Center" },
      ],
      claim_details: {
        auto: { vin: "4T1B11HK5JU109482", license_plate: "TX-ROB-9901", vehicle_make: "Toyota", vehicle_model: "Camry", vehicle_year: 2022, estimated_repair_cost: 8500.0, drivable: true, police_report_filed: false },
      },
      validation_errors: [
        "ERR_TEMPORAL_INVERSION: Incident date cannot be subsequent to reported date.",
      ],
      graph_sync_status: "NOT_CONFIGURED",
      created_at: d(5),
      updated_at: d(5),
    },
    {
      claim_id: "CLM-2026-0926-017",
      policy_id: "POL-AUTO-88219",
      customer_id: "CUST-1001",
      claim_type: "AUTO",
      status: "INVALID",
      incident_date: d(12),
      reported_date: d(12),
      claimed_amount: 95000.0, // Policy limit is $50,000!
      currency: "USD",
      description: "Excessive loss claim for vehicle water damage exceeding policy financial ceiling.",
      location: { street: "Congress Ave", city: "Austin", state: "TX", postal_code: "78701" },
      involved_entities: [
        { entity_type: "GARAGE", entity_id: "GAR-77401", role: "REPAIR_FACILITY", name: "Apex Auto Collision Center" },
      ],
      claim_details: {
        auto: { vin: "1HGCR2F83HA019284", license_plate: "TX-ABC-1234", vehicle_make: "Honda", vehicle_model: "Accord", vehicle_year: 2021, estimated_repair_cost: 95000.0, drivable: false, police_report_filed: false },
      },
      validation_errors: [
        "ERR_COVERAGE_EXCEEDED: Claimed amount $95,000 exceeds policy limit of $50,000.",
      ],
      graph_sync_status: "NOT_CONFIGURED",
      created_at: d(12),
      updated_at: d(12),
    },
  ];
  await db.collection<Claim>("claims").insertMany(claims);

  // 5. Complete Event Audit Logs for all Claims
  const events: ClaimEvent[] = [];
  for (const c of claims) {
    events.push({
      event_id: `EVT-INGEST-${c.claim_id}`,
      claim_id: c.claim_id,
      event_type: "CLAIM_RECEIVED",
      from_status: undefined,
      to_status: "RECEIVED",
      timestamp: c.incident_date,
      trigger_source: "CLAIM_INGESTION_SERVICE",
      actor: "system_ingress",
      details: { policy_id: c.policy_id, claimed_amount: c.claimed_amount },
    });

    if (c.status === "INVALID") {
      events.push({
        event_id: `EVT-FAIL-${c.claim_id}`,
        claim_id: c.claim_id,
        event_type: "VALIDATION_FAILED",
        from_status: "VALIDATING",
        to_status: "INVALID",
        timestamp: c.incident_date,
        trigger_source: "VALIDATION_ENGINE",
        actor: "validation_engine",
        details: { errors: c.validation_errors },
      });
    } else {
      events.push({
        event_id: `EVT-PASS-${c.claim_id}`,
        claim_id: c.claim_id,
        event_type: "VALIDATION_SUCCEEDED",
        from_status: "VALIDATING",
        to_status: "VALIDATED",
        timestamp: c.incident_date,
        trigger_source: "VALIDATION_ENGINE",
        actor: "validation_engine",
        details: { policy_id: c.policy_id },
      });
      events.push({
        event_id: `EVT-ENRICH-${c.claim_id}`,
        claim_id: c.claim_id,
        event_type: "ENRICHMENT_COMPLETED",
        from_status: "VALIDATED",
        to_status: c.status,
        timestamp: c.created_at,
        trigger_source: "ENRICHMENT_SERVICE",
        actor: "enrichment_worker",
        details: { location_geocoded: true, normalized: true },
      });
    }
  }
  await db.collection<ClaimEvent>("claim_events").insertMany(events);

  return {
    customersCount: customers.length,
    policiesCount: policies.length,
    providersCount: providers.length,
    claimsCount: claims.length,
    eventsCount: events.length,
  };
}
