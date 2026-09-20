#!/usr/bin/env python3
"""
Parquet Data Lake Sink
Converts ingested claims into Apache Parquet format with Snappy compression,
partitioned by ingestion date (year=YYYY/month=MM/day=DD).
"""

import sys
import os
import json
from datetime import datetime
import pyarrow as pa
import pyarrow.parquet as pq

DATALAKE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../datalake/raw/claims"))

SCHEMA = pa.schema([
    ("claim_id", pa.string()),
    ("policy_id", pa.string()),
    ("customer_id", pa.string()),
    ("claim_type", pa.string()),
    ("status", pa.string()),
    ("incident_date", pa.string()),
    ("reported_date", pa.string()),
    ("claimed_amount", pa.float64()),
    ("currency", pa.string()),
    ("description", pa.string()),
    ("garage_id", pa.string()),
    ("agent_id", pa.string()),
    ("vehicle_vin", pa.string()),
    ("vehicle_make", pa.string()),
    ("vehicle_model", pa.string()),
    ("vehicle_year", pa.int32()),
    ("estimated_repair_cost", pa.float64()),
    ("validation_errors_count", pa.int32()),
    ("graph_sync_status", pa.string()),
    ("ingested_at", pa.string()),
    ("year", pa.string()),
    ("month", pa.string()),
    ("day", pa.string()),
])

def extract_flat_record(claim: dict) -> dict:
    details = claim.get("claim_details", {}) or {}
    auto_details = details.get("auto", {}) or {}
    involved = claim.get("involved_entities", []) or []

    garage_id = None
    agent_id = None
    for entity in involved:
        if entity.get("entity_type") == "GARAGE":
            garage_id = entity.get("entity_id")
        elif entity.get("entity_type") == "AGENT":
            agent_id = entity.get("entity_id")

    ingested_at = claim.get("created_at") or datetime.utcnow().isoformat()
    try:
        dt = datetime.fromisoformat(ingested_at.replace("Z", "+00:00"))
    except Exception:
        dt = datetime.utcnow()

    return {
        "claim_id": str(claim.get("claim_id", "")),
        "policy_id": str(claim.get("policy_id", "")),
        "customer_id": str(claim.get("customer_id", "")),
        "claim_type": str(claim.get("claim_type", "AUTO")),
        "status": str(claim.get("status", "RECEIVED")),
        "incident_date": str(claim.get("incident_date", "")),
        "reported_date": str(claim.get("reported_date", "")),
        "claimed_amount": float(claim.get("claimed_amount", 0.0)),
        "currency": str(claim.get("currency", "USD")),
        "description": str(claim.get("description", "")),
        "garage_id": str(garage_id or ""),
        "agent_id": str(agent_id or ""),
        "vehicle_vin": str(auto_details.get("vin", "")),
        "vehicle_make": str(auto_details.get("vehicle_make", "")),
        "vehicle_model": str(auto_details.get("vehicle_model", "")),
        "vehicle_year": int(auto_details.get("vehicle_year", 0) or 0),
        "estimated_repair_cost": float(auto_details.get("estimated_repair_cost", 0.0) or 0.0),
        "validation_errors_count": len(claim.get("validation_errors", []) or []),
        "graph_sync_status": str(claim.get("graph_sync_status", "PENDING")),
        "ingested_at": dt.isoformat(),
        "year": f"{dt.year:04d}",
        "month": f"{dt.month:02d}",
        "day": f"{dt.day:02d}",
    }

def append_claims_to_parquet(claims: list[dict], output_base_dir: str = DATALAKE_DIR) -> str:
    if not claims:
        return "No claims to write"

    records = [extract_flat_record(c) for c in claims]
    table = pa.Table.from_pylist(records, schema=SCHEMA)

    os.makedirs(output_base_dir, exist_ok=True)
    pq.write_to_dataset(
        table,
        root_path=output_base_dir,
        partition_cols=["year", "month", "day"],
        compression="snappy",
        use_dictionary=True,
    )
    return f"Successfully wrote {len(claims)} claim(s) to Parquet lake at {output_base_dir}"

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--stdin":
        raw = sys.stdin.read()
        claims_data = json.loads(raw)
        if isinstance(claims_data, dict):
            claims_data = [claims_data]
        res = append_claims_to_parquet(claims_data)
        print(res)
    else:
        print("Usage: python parquet_sink.py --stdin < claims.json")
