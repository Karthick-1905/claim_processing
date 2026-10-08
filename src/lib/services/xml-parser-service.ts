import { IngestClaimInput } from "@/lib/domain/schemas";

export interface XmlParseResult {
  success: boolean;
  data?: IngestClaimInput;
  rawParsed?: Record<string, unknown>;
  error?: string;
}

/**
 * Lightweight, robust XML node parser for structured data interchange.
 */
function parseXmlToJs(xmlString: string): Record<string, unknown> {
  const cleanXml = xmlString
    .replace(/<!--[\s\S]*?-->/g, "") // remove comments
    .replace(/<\?xml[\s\S]*?\?>/g, "") // remove prolog
    .trim();

  if (!cleanXml) {
    throw new Error("ERR_XML_EMPTY: XML payload is empty.");
  }

  const result: Record<string, unknown> = {};
  const tagRegex = /<([a-zA-Z0-9_:-]+)(?:\s+[^>]*)?>([\s\S]*?)<\/\1>|<([a-zA-Z0-9_:-]+)(?:\s+[^>]*)?\/>/g;

  let match: RegExpExecArray | null;
  let hasMatches = false;

  while ((match = tagRegex.exec(cleanXml)) !== null) {
    hasMatches = true;
    const tagName = match[1] || match[3];
    const content = match[2] !== undefined ? match[2].trim() : "";

    let parsedValue: unknown;
    if (content.includes("<") && content.includes(">")) {
      // Nested XML structure
      parsedValue = parseXmlToJs(content);
    } else {
      // Leaf text value
      parsedValue = content;
    }

    if (result[tagName] !== undefined) {
      if (Array.isArray(result[tagName])) {
        (result[tagName] as unknown[]).push(parsedValue);
      } else {
        result[tagName] = [result[tagName], parsedValue];
      }
    } else {
      result[tagName] = parsedValue;
    }
  }

  if (!hasMatches && cleanXml.length > 0) {
    return { _text: cleanXml };
  }

  return result;
}

/**
 * Helper to safely extract string or nested values regardless of casing.
 */
function getVal(obj: Record<string, unknown> | undefined, ...keys: string[]): string | undefined {
  if (!obj) return undefined;
  for (const key of keys) {
    for (const objKey of Object.keys(obj)) {
      if (objKey.toLowerCase() === key.toLowerCase()) {
        const val = obj[objKey];
        if (typeof val === "string") return val.trim();
        if (typeof val === "number") return String(val);
        if (typeof val === "object" && val !== null && "_text" in val) {
          return String((val as { _text: unknown })._text).trim();
        }
      }
    }
  }
  return undefined;
}

/**
 * Helper to safely extract number value.
 */
function getNum(obj: Record<string, unknown> | undefined, ...keys: string[]): number | undefined {
  const str = getVal(obj, ...keys);
  if (str === undefined || str === "") return undefined;
  const cleaned = str.replace(/[$,]/g, "");
  const num = Number(cleaned);
  return isNaN(num) ? undefined : num;
}

/**
 * Normalizes ACORD XML or generic Insurance XML into canonical IngestClaimInput.
 */
export function parseXmlClaim(xmlString: string): XmlParseResult {
  try {
    const raw = parseXmlToJs(xmlString);

    // Root tag unwrapping if wrapped inside <InsuranceClaim>, <Claim>, or ACORD <ClaimInvestigateAddRq>
    let root = raw;
    const rootKeys = Object.keys(raw);
    if (rootKeys.length === 1 && typeof raw[rootKeys[0]] === "object") {
      root = raw[rootKeys[0]] as Record<string, unknown>;
    }

    const policyId = getVal(root, "policy_id", "policyid", "policyref", "policynumber");
    const customerId = getVal(root, "customer_id", "customerid", "customerref", "insuredref", "insuredpartyid");
    const claimTypeRaw = getVal(root, "claim_type", "claimtype", "type", "losstype") || "AUTO";
    const incidentDate = getVal(root, "incident_date", "incidentdate", "lossdate", "occurrenceat");
    const reportedDate = getVal(root, "reported_date", "reporteddate", "noticeat");
    const claimedAmount = getNum(root, "claimed_amount", "claimedamount", "amount", "totallossamount", "totalclaimamount");
    const currency = getVal(root, "currency", "cur") || "USD";
    const description = getVal(root, "description", "lossnarrative", "narrative", "incidentdescription") || "XML integrated claim record";
    const idempotencyKey = getVal(root, "idempotency_key", "idempotencykey", "transactionid", "msgguid");

    if (!policyId) throw new Error("ERR_XML_SCHEMA: Missing mandatory <PolicyId> or <PolicyRef> tag.");
    if (!customerId) throw new Error("ERR_XML_SCHEMA: Missing mandatory <CustomerId> or <CustomerRef> tag.");
    if (!incidentDate) throw new Error("ERR_XML_SCHEMA: Missing mandatory <IncidentDate> or <LossDate> tag.");
    if (claimedAmount === undefined || claimedAmount <= 0) {
      throw new Error("ERR_XML_SCHEMA: Missing or invalid positive <ClaimedAmount> tag.");
    }

    const claimType = claimTypeRaw.toUpperCase() === "HEALTH" ? "HEALTH" : "AUTO";

    // Extract Involved Entities
    const involvedEntities: Array<{
      entity_type: "VEHICLE" | "GARAGE" | "HOSPITAL" | "AGENT" | "DEVICE" | "PERSON";
      entity_id: string;
      role: string;
      name?: string;
    }> = [];

    // Check garage
    const garageId = getVal(root, "garage_id", "garageid", "repairfacilityid", "serviceproviderid");
    const garageName = getVal(root, "garage_name", "garagename", "repairfacilityname");
    if (garageId) {
      involvedEntities.push({
        entity_type: "GARAGE",
        entity_id: garageId,
        role: "REPAIR_FACILITY",
        name: garageName || "Repair Center",
      });
    }

    // Check agent
    const agentId = getVal(root, "agent_id", "agentid", "brokerid", "producerid");
    const agentName = getVal(root, "agent_name", "agentname", "brokername");
    if (agentId) {
      involvedEntities.push({
        entity_type: "AGENT",
        entity_id: agentId,
        role: "HANDLING_BROKER",
        name: agentName || "Insurance Broker",
      });
    }

    // Check hospital
    const hospitalId = getVal(root, "hospital_id", "hospitalid", "facilityid", "medicalcenterid");
    const hospitalName = getVal(root, "hospital_name", "hospitalname", "facilityname");
    if (hospitalId) {
      involvedEntities.push({
        entity_type: "HOSPITAL",
        entity_id: hospitalId,
        role: "TREATMENT_FACILITY",
        name: hospitalName || "Medical Provider",
      });
    }

    // Extract auto claim details
    let autoDetails: IngestClaimInput["claim_details"]["auto"] = undefined;
    if (claimType === "AUTO") {
      const autoObj = (typeof root["AutoDetails"] === "object" ? root["AutoDetails"] : root) as Record<string, unknown>;
      const vin = getVal(autoObj, "vin", "vehiclenumber", "assetid") || "VIN_XML_DEFAULT";
      const licensePlate = getVal(autoObj, "license_plate", "licenseplate", "plate") || "TX-XML-01";
      const vehicleMake = getVal(autoObj, "vehicle_make", "make", "automake") || "Honda";
      const vehicleModel = getVal(autoObj, "vehicle_model", "model", "automodel") || "Accord";
      const vehicleYear = getNum(autoObj, "vehicle_year", "year", "autoyear") || 2021;
      const estimatedRepairCost = getNum(autoObj, "estimated_repair_cost", "repaircost", "estimate") || claimedAmount;
      const drivableStr = getVal(autoObj, "drivable", "isdrivable");
      const policeReportStr = getVal(autoObj, "police_report_filed", "policereportavailable", "haspolicereport");

      autoDetails = {
        vin,
        license_plate: licensePlate,
        vehicle_make: vehicleMake,
        vehicle_model: vehicleModel,
        vehicle_year: vehicleYear,
        estimated_repair_cost: estimatedRepairCost,
        drivable: drivableStr ? drivableStr.toLowerCase() === "true" || drivableStr === "1" : true,
        police_report_filed: policeReportStr ? policeReportStr.toLowerCase() === "true" || policeReportStr === "1" || policeReportStr.toLowerCase() === "yes" : false,
        repair_facility_id: garageId,
      };

      involvedEntities.push({
        entity_type: "VEHICLE",
        entity_id: vin,
        role: "INSURED_VEHICLE",
        name: `${vehicleYear} ${vehicleMake} ${vehicleModel}`,
      });
    }

    // Extract health claim details
    let healthDetails: IngestClaimInput["claim_details"]["health"] = undefined;
    if (claimType === "HEALTH") {
      const healthObj = (typeof root["HealthDetails"] === "object" ? root["HealthDetails"] : root) as Record<string, unknown>;
      const diagRaw = getVal(healthObj, "diagnosis_codes", "diagnosiscode", "icd10");
      const procRaw = getVal(healthObj, "procedure_codes", "procedurecode", "cpt");

      healthDetails = {
        diagnosis_codes: diagRaw ? diagRaw.split(",").map((s) => s.trim()) : ["M54.5"],
        procedure_codes: procRaw ? procRaw.split(",").map((s) => s.trim()) : ["99214"],
        treatment_facility_id: hospitalId,
      };
    }

    const payload: IngestClaimInput = {
      ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
      policy_id: policyId,
      customer_id: customerId,
      claim_type: claimType,
      incident_date: incidentDate.endsWith("Z") ? incidentDate : incidentDate + "T12:00:00Z",
      ...(reportedDate ? { reported_date: reportedDate.endsWith("Z") ? reportedDate : reportedDate + "T18:00:00Z" } : {}),
      claimed_amount: claimedAmount,
      currency,
      description,
      location: {
        street: getVal(root, "street", "incidentlocation", "address") || "100 Partner Gateway Blvd",
        city: getVal(root, "city", "incidentcity") || "Austin",
        state: getVal(root, "state", "incidentstate") || "TX",
        postal_code: getVal(root, "postal_code", "postalcode", "zip", "insuredzip") || "78701",
      },
      involved_entities: involvedEntities,
      claim_details: {
        auto: autoDetails,
        health: healthDetails,
      },
    };

    return {
      success: true,
      data: payload,
      rawParsed: raw,
    };
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errMessage,
    };
  }
}

/**
 * Extracts multiple <Claim> or <InsuranceClaim> or <ACORDClaim> blocks from a batch XML envelope.
 */
export function parseXmlClaimsBatch(xmlString: string): {
  totalExtracted: number;
  results: Array<{ index: number; result: XmlParseResult; rawXml: string }>;
} {
  const claimBlockRegex = /<(Claim|InsuranceClaim|ACORDClaim|ClaimInvestigateAddRq)(?:\s+[^>]*)?>([\s\S]*?)<\/\1>/gi;
  const matches: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = claimBlockRegex.exec(xmlString)) !== null) {
    matches.push(match[0]);
  }

  // If no wrapper tags matched, attempt single claim parsing
  if (matches.length === 0) {
    const single = parseXmlClaim(xmlString);
    return {
      totalExtracted: single.success ? 1 : 0,
      results: [{ index: 0, result: single, rawXml: xmlString }],
    };
  }

  const results = matches.map((rawXml, index) => ({
    index,
    result: parseXmlClaim(rawXml),
    rawXml,
  }));

  return {
    totalExtracted: results.length,
    results,
  };
}

export const SAMPLE_ACORD_XML = `<?xml version="1.0" encoding="UTF-8"?>
<ACORDClaim xmlns="http://www.acord.org/standards/claims">
  <TransactionId>TX-ACORD-2026-90812</TransactionId>
  <PolicyRef>POL-7419-TX</PolicyRef>
  <InsuredRef>CUST-9102</InsuredRef>
  <LossType>AUTO</LossType>
  <LossDate>2026-03-12</LossDate>
  <NoticeAt>2026-03-13</NoticeAt>
  <TotalLossAmount>14250.00</TotalLossAmount>
  <Currency>USD</Currency>
  <LossNarrative>Vehicle sustained major rear impact while stopped at intersection light.</LossNarrative>
  <RepairFacilityId>GARAGE-APEX-01</RepairFacilityId>
  <RepairFacilityName>Apex Auto Collision</RepairFacilityName>
  <ProducerId>AGENT-METRO-04</ProducerId>
  <ProducerName>Metro Risk Partners</ProducerName>
  <IncidentLocation>8400 North Mopac Expy</IncidentLocation>
  <IncidentCity>Austin</IncidentCity>
  <IncidentState>TX</IncidentState>
  <InsuredZip>78759</InsuredZip>
  <AutoDetails>
    <Vin>1HGCR2F83HA029381</Vin>
    <LicensePlate>TX-782-KKL</LicensePlate>
    <Make>Honda</Make>
    <Model>Accord Sport</Model>
    <Year>2022</Year>
    <RepairCost>14250.00</RepairCost>
    <IsDrivable>false</IsDrivable>
    <HasPoliceReport>true</HasPoliceReport>
  </AutoDetails>
</ACORDClaim>`;

