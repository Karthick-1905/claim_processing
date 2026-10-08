# Domain Model & Validation Taxonomy

---

## 1. Core Domain Entities

The platform models insurance claim ecosystems through six foundational entities:

### 1.1 `Claim`
Represents an official notification of a loss submitted by an insured party or authorized broker.

| Field | Type | Description |
| :--- | :--- | :--- |
| `claim_id` | `string` (UUID / Canonical) | Unique business key (e.g., `CLM-2026-0920-001`) |
| `idempotency_key` | `string` | Unique token ensuring exactly-once ingestion |
| `policy_id` | `string` | Foreign reference to underwriting policy |
| `customer_id` | `string` | Foreign reference to claiming party |
| `claim_type` | `enum` | `AUTO`, `HEALTH`, `PROPERTY` |
| `status` | `enum` | Lifecycle state (see Lifecycle docs) |
| `incident_date` | `ISO-8601 Date` | Exact timestamp when loss occurred |
| `reported_date` | `ISO-8601 Date` | Timestamp when insurer was notified |
| `claimed_amount`| `number` | Numeric monetary amount |
| `currency` | `string` | ISO-4217 currency code (`USD`, `EUR`, etc.) |
| `description` | `string` | Summary narrative of incident |
| `location` | `Object` | Incident location (street, city, state, coords) |
| `involved_entities` | `Array<EntityRef>` | Linked parties (garages, hospitals, agents, vehicles) |
| `claim_details` | `Polymorphic Object` | Type-specific sub-document (Auto, Health, Property) |
| `graph_sync_status`| `enum` | `PENDING`, `SYNCED`, `FAILED` |
| `created_at` | `ISO-8601 Date` | Ingestion timestamp |
| `updated_at` | `ISO-8601 Date` | Last mutation timestamp |

### 1.2 `Policy`
The underwriting contract governing the terms of coverage.

| Field | Type | Description |
| :--- | :--- | :--- |
| `policy_id` | `string` | Canonical key (e.g., `POL-AUTO-88219`) |
| `customer_id` | `string` | Owner of the policy |
| `policy_type` | `enum` | `AUTO`, `HEALTH`, `PROPERTY` |
| `status` | `enum` | `ACTIVE`, `LAPSED`, `CANCELLED`, `EXPIRED` |
| `start_date` | `ISO-8601 Date` | Effective coverage start |
| `end_date` | `ISO-8601 Date` | Effective coverage termination |
| `coverage_limit`| `number` | Maximum claimable aggregate ceiling |
| `deductible` | `number` | Policyholder deductible liability |
| `covered_assets`| `Array<AssetRef>` | List of covered VINs, property IDs, or members |

### 1.3 `Customer`
The insured entity or primary account holder.

| Field | Type | Description |
| :--- | :--- | :--- |
| `customer_id` | `string` | Canonical key (e.g., `CUST-41029`) |
| `full_name` | `string` | Name of customer |
| `email` | `string` | Contact email |
| `phone` | `string` | Contact phone |
| `identity_hash` | `string` | Hashed national identification (SSN/Tax ID) |
| `address` | `Object` | Registered residential or corporate address |

### 1.4 `ServiceProvider`
Third-party entities providing repair, medical, or inspection services.

| Field | Type | Description |
| :--- | :--- | :--- |
| `provider_id` | `string` | Canonical key (e.g., `GAR-77401`, `HSP-1092`) |
| `provider_type` | `enum` | `GARAGE`, `HOSPITAL`, `CONTRACTOR`, `INSPECTOR` |
| `business_name`| `string` | Registered legal business name |
| `license_number`| `string` | Official state or trade license |
| `tax_id` | `string` | Tax identification number |
| `address` | `Object` | Physical facility address |

### 1.5 `ClaimEvent`
Immutable chronological record of actions, validations, and state changes.

| Field | Type | Description |
| :--- | :--- | :--- |
| `event_id` | `string` | Unique event key |
| `claim_id` | `string` | Associated claim ID |
| `event_type` | `enum` | `CLAIM_RECEIVED`, `VALIDATION_PASSED`, `VALIDATION_FAILED`, etc. |
| `from_status` | `enum` | Status prior to transition |
| `to_status` | `enum` | Status after transition |
| `timestamp` | `ISO-8601 Date` | Exact event occurrence |
| `trigger_source`| `string` | Initiating subsystem (`INGESTION_API`, `AUDIT_WORKER`) |
| `details` | `Object` | Structured metadata, error messages, or payload deltas |

---

## 2. Polymorphic Claim Details

Different insurance types require disparate fields. We use discriminated polymorphic models:

### 2.1 Auto Claim Details (`claim_type: "AUTO"`)
```json
{
  "vin": "VIN1HGCR2F83HA019284",
  "license_plate": "TX-ABC-1234",
  "vehicle_make": "Honda",
  "vehicle_model": "Accord",
  "vehicle_year": 2021,
  "estimated_repair_cost": 7450.00,
  "drivable": false,
  "police_report_filed": true,
  "police_report_number": "PR-2026-08119"
}
```

### 2.2 Health Claim Details (`claim_type: "HEALTH"`)
```json
{
  "diagnosis_codes": ["M54.5", "S13.4XXA"],
  "procedure_codes": ["99214", "72040"],
  "admission_date": "2026-09-15T15:00:00Z",
  "discharge_date": "2026-09-15T21:30:00Z",
  "treatment_facility": "Austin General Hospital"
}
```

### 2.3 Property Claim Details (`claim_type: "PROPERTY"`)
```json
{
  "property_type": "RESIDENTIAL",
  "property_address": "404 Meadow Lane, Austin, TX",
  "damage_type": "WATER_LEAK",
  "estimated_restoration_cost": 12500.00,
  "inspector_id": "INS-551"
}
```

---

## 3. Multi-Tier Validation Taxonomy

Validation failures do not discard data silently; they record structured error codes:

| Code | Category | Condition |
| :--- | :--- | :--- |
| `ERR_SYNTAX_EMPTY_FIELD` | Syntactic | Mandatory header or detail field missing |
| `ERR_TEMPORAL_INVERSION` | Temporal | `incident_date > reported_date` |
| `ERR_TEMPORAL_FUTURE` | Temporal | `incident_date > current_time` |
| `ERR_POLICY_NOT_FOUND` | Referential | Referenced `policy_id` does not exist |
| `ERR_POLICY_NOT_ACTIVE` | Temporal/Referential | Policy status is not `ACTIVE` |
| `ERR_POLICY_EXPIRED` | Referential | `incident_date` outside policy start and end dates |
| `ERR_CUSTOMER_MISMATCH` | Referential | `customer_id` does not own the policy |
| `ERR_ASSET_NOT_COVERED` | Referential | Vehicle VIN is not registered on the policy |
| `ERR_EXCEEDS_COVERAGE` | Business Rule | `claimed_amount > policy.coverage_limit` |
| `ERR_DUPLICATE_CLAIM` | Deduplication | Exact match on `(policy_id, incident_date, amount)` within 48h |

---

## 4. Enterprise XML Data Integration (ACORD & HL7 Standards)

In enterprise insurance environments, partner networks, third-party administrators (TPAs), and hospitals transmit claim dossiers in XML interchange formats (such as the ACORD standard for Property & Casualty / Auto and HL7/custom schemas for Healthcare).

### 4.1 ACORD Automobile XML Model
```xml
<?xml version="1.0" encoding="UTF-8"?>
<ACORDClaim xmlns="http://www.acord.org/standards/claims">
  <TransactionId>TX-ACORD-2026-90812</TransactionId>
  <PolicyRef>POL-AUTO-88219</PolicyRef>
  <InsuredRef>CUST-1001</InsuredRef>
  <LossType>AUTO</LossType>
  <LossDate>2026-03-12</LossDate>
  <NoticeAt>2026-03-13</NoticeAt>
  <TotalLossAmount>14250.00</TotalLossAmount>
  <Currency>USD</Currency>
  <LossNarrative>Vehicle sustained major rear impact while stopped at intersection light.</LossNarrative>
  <RepairFacilityId>GAR-77401</RepairFacilityId>
  <RepairFacilityName>Apex Auto Collision</RepairFacilityName>
  <ProducerId>AGT-3029</ProducerId>
  <AutoDetails>
    <Vin>1HGCR2F83HA019284</Vin>
    <LicensePlate>TX-782-KKL</LicensePlate>
    <Make>Honda</Make>
    <Model>Accord Sport</Model>
    <Year>2021</Year>
    <RepairCost>14250.00</RepairCost>
    <IsDrivable>false</IsDrivable>
    <HasPoliceReport>true</HasPoliceReport>
  </AutoDetails>
</ACORDClaim>
```

### 4.2 Normalization & Extraction Pipeline
1. **XML Parsing**: Ingested via Next.js `/api/claims/xml` or PySpark `spark/pipelines/ingest_xml_claims.py`.
2. **Schema Mapping**: Canonicalizes XML nodes into `IngestClaimInput` domain schemas.
3. **Graph Entity Projection**: Auto-extracts involved repair facilities, brokers, medical providers, and vehicles into the Neo4j knowledge graph.
4. **Data Lake Storage**: Directly partitions valid claims into the Apache Parquet Data Lake (`datalake/raw/claims/year=YYYY/month=MM/day=DD/`).

