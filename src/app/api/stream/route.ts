import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { ingestClaim } from "@/lib/services/claim-service";

export async function GET() {
  const statusFile = path.join(process.cwd(), "data", "stream_status.json");
  if (fs.existsSync(statusFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(statusFile, "utf-8"));
      return NextResponse.json({ success: true, data });
    } catch {
      // Fallback
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      status: "IDLE",
      total_generated: 0,
      valid_claims: 0,
      invalid_claims: 0,
      last_updated: null,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const count = typeof body.count === "number" ? body.count : 5;

    const policies = [
      { id: "POL-AUTO-88219", cust: "CUST-1001", vin: "1HGCR2F83HA019284", make: "Honda", model: "Accord" },
      { id: "POL-AUTO-99304", cust: "CUST-1002", vin: "4T1B11HK5JU109482", make: "Toyota", model: "Camry" },
      { id: "POL-AUTO-1006A", cust: "CUST-1006", vin: "1FTFW1ED4MFA19283", make: "Ford", model: "F-150" },
      { id: "POL-AUTO-1008A", cust: "CUST-1008", vin: "5N1AL0MN8JC819201", make: "Nissan", model: "Rogue" },
    ];

    const garages = [
      { id: "GAR-77401", name: "Apex Auto Collision Center" },
      { id: "GAR-88102", name: "Lonestar Body & Paint" },
      { id: "GAR-99210", name: "Premier Fleet Auto Repair" },
    ];

    const agents = [
      { id: "AGT-3029", name: "David Miller Agency" },
      { id: "AGT-4401", name: "Lone Star Underwriters" },
    ];

    let validCount = 0;
    let invalidCount = 0;

    for (let i = 0; i < count; i++) {
      const pol = policies[Math.floor(Math.random() * policies.length)];
      const gar = garages[Math.floor(Math.random() * garages.length)];
      const agt = agents[Math.floor(Math.random() * agents.length)];
      const now = new Date();
      const incDate = new Date(now.getTime() - Math.floor(Math.random() * 15 + 1) * 24 * 60 * 60 * 1000).toISOString();
      const amount = Math.floor(Math.random() * 5000 + 3500);

      try {
        const res = await ingestClaim({
          policy_id: pol.id,
          customer_id: pol.cust,
          claim_type: "AUTO",
          incident_date: incDate,
          reported_date: incDate,
          claimed_amount: amount,
          currency: "USD",
          description: "Real-time streaming telemetry claim ingestion.",
          location: { street: "I-35 Highway", city: "Austin", state: "TX", postal_code: "78701" },
          involved_entities: [
            { entity_type: "GARAGE", entity_id: gar.id, role: "REPAIR_FACILITY", name: gar.name },
            { entity_type: "AGENT", entity_id: agt.id, role: "HANDLING_BROKER", name: agt.name },
            { entity_type: "VEHICLE", entity_id: pol.vin, role: "INSURED_VEHICLE" },
          ],
          claim_details: {
            auto: {
              vin: pol.vin,
              license_plate: `TX-${Math.floor(Math.random() * 899 + 100)}-STR`,
              vehicle_make: pol.make,
              vehicle_model: pol.model,
              vehicle_year: 2022,
              estimated_repair_cost: amount,
              drivable: true,
              police_report_filed: true,
            },
          },
        });

        if (res.success) {
          validCount++;
        } else {
          invalidCount++;
        }
      } catch {
        invalidCount++;
      }
    }

    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    const statusFile = path.join(dataDir, "stream_status.json");
    const streamData = {
      status: "IDLE",
      total_generated: count,
      valid_claims: validCount,
      invalid_claims: invalidCount,
      last_updated: new Date().toISOString(),
    };
    fs.writeFileSync(statusFile, JSON.stringify(streamData, null, 2));

    return NextResponse.json({
      success: true,
      message: `Stream completed: Ingested ${count} real-time claims (${validCount} valid, ${invalidCount} invalid).`,
      data: streamData,
    });
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : "Error executing streaming ingestion";
    return NextResponse.json({ success: false, error: errMessage }, { status: 500 });
  }
}
