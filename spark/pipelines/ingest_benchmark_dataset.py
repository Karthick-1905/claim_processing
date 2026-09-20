#!/usr/bin/env python3
"""
Benchmark Dataset Ingestion Pipeline
Downloads real insurance claims data (Mendeley/Kaggle auto insurance fraud dataset),
transforms the records into our domain format, and feeds them into the Ingestion Engine
and Parquet Data Lake.
"""

import os
import sys
import csv
import json
import urllib.request
import time
from datetime import datetime, timedelta
import random

# Add project root to path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
CSV_PATH = os.path.join(DATA_DIR, "insurance_claims.csv")
DATASET_URL = "https://raw.githubusercontent.com/mwitiderrick/insurancedata/master/insurance_claims.csv"

# Add spark/lake to sys.path for parquet sink
sys.path.insert(0, os.path.join(PROJECT_ROOT, "spark", "lake"))
from parquet_sink import append_claims_to_parquet

try:
    from pymongo import MongoClient
except ImportError:
    MongoClient = None

API_URL = os.environ.get("INGESTION_API_URL", "http://127.0.0.1:3000/api/claims")
MONGO_URI = os.environ.get("MONGODB_URI", "mongodb://admin:password123@localhost:27017/claims_db?authSource=admin")

def download_dataset_if_needed():
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(CSV_PATH) or os.path.getsize(CSV_PATH) < 1000:
        print(f"Downloading benchmark dataset from {DATASET_URL} ...")
        urllib.request.urlretrieve(DATASET_URL, CSV_PATH)
        print(f"Dataset downloaded to {CSV_PATH} ({os.path.getsize(CSV_PATH)} bytes)")
    else:
        print(f"Using cached benchmark dataset at {CSV_PATH}")

def setup_mongo_master_records(client, rows: list[dict]):
    """Ensures policies and customers exist in MongoDB so validation passes smoothly."""
    db = client["claims_db"]
    customers_col = db["customers"]
    policies_col = db["policies"]
    providers_col = db["service_providers"]

    print("Registering master customers and policies from benchmark dataset...")
    cust_bulk = []
    pol_bulk = []

    seen_policies = set()
    seen_customers = set()

    for r in rows:
        pol_num = str(r["policy_number"]).strip()
        cust_id = f"CUST-BENCH-{pol_num}"
        pol_id = f"POL-AUTO-{pol_num}"

        if pol_id not in seen_policies:
            seen_policies.add(pol_id)
            seen_customers.add(cust_id)

            csl = r.get("policy_csl", "250/500")
            limit_val = 50000.0
            if "500" in csl:
                limit_val = 150000.0
            elif "300" in csl:
                limit_val = 100000.0

            bind_date = r.get("policy_bind_date", "2014-01-01")
            try:
                start_dt = datetime.strptime(bind_date, "%Y-%m-%d")
            except Exception:
                start_dt = datetime(2014, 1, 1)

            end_dt = start_dt + timedelta(days=365 * 15)  # cover incident dates up to 2029

            # Customer record
            cust_bulk.append({
                "customer_id": cust_id,
                "full_name": f"Policyholder {pol_num}",
                "national_id_hash": f"sha256_{pol_num}_bench",
                "email": f"insured_{pol_num}@claims-benchmark.org",
                "phone": "+1-800-555-0100",
                "address": {
                    "street": r.get("incident_location", "100 Main St"),
                    "city": r.get("incident_city", "Columbus"),
                    "state": r.get("policy_state", "OH"),
                    "postal_code": str(r.get("insured_zip", "43210")),
                },
                "created_at": start_dt.isoformat() + "Z",
            })

            # Policy record
            vin = f"VIN{r.get('auto_make', 'AUTO')[:3].upper()}{pol_num}X{random.randint(1000, 9999)}"
            r["_generated_vin"] = vin

            pol_bulk.append({
                "policy_id": pol_id,
                "customer_id": cust_id,
                "policy_type": "AUTO",
                "status": "ACTIVE",
                "start_date": start_dt.isoformat() + "Z",
                "end_date": end_dt.isoformat() + "Z",
                "coverage_limit": limit_val,
                "deductible": float(r.get("policy_deductable", 500) or 500),
                "covered_assets": [
                    {
                        "asset_type": "VEHICLE",
                        "identifier": vin,
                        "description": f"{r.get('auto_year', 2020)} {r.get('auto_make', 'Car')} {r.get('auto_model', 'Sedan')}",
                    }
                ],
                "created_at": start_dt.isoformat() + "Z",
            })

    if cust_bulk:
        for c in cust_bulk:
            customers_col.update_one({"customer_id": c["customer_id"]}, {"$set": c}, upsert=True)
    if pol_bulk:
        for p in pol_bulk:
            policies_col.update_one({"policy_id": p["policy_id"]}, {"$set": p}, upsert=True)

    print(f"Registered {len(seen_customers)} benchmark customers and {len(seen_policies)} policies in MongoDB.")

def row_to_claim_payload(r: dict, index: int) -> dict:
    pol_num = str(r["policy_number"]).strip()
    cust_id = f"CUST-BENCH-{pol_num}"
    pol_id = f"POL-AUTO-{pol_num}"

    inc_date_str = r.get("incident_date", "2015-01-01")
    try:
        inc_dt = datetime.strptime(inc_date_str, "%Y-%m-%d")
    except Exception:
        inc_dt = datetime(2015, 1, 1)

    inc_iso = inc_dt.strftime("%Y-%m-%d") + "T12:00:00Z"
    rep_iso = (inc_dt + timedelta(days=1)).strftime("%Y-%m-%d") + "T18:00:00Z"

    vin = r.get("_generated_vin") or f"VIN{r.get('auto_make', 'AUTO')[:3].upper()}{pol_num}X{index:04d}"
    total_amount = float(r.get("total_claim_amount", 5000.0) or 5000.0)

    # Assign garages to create clusters for multi-party pattern discovery
    garage_id = f"GAR-BENCH-{(int(pol_num) % 8) + 101}"
    garage_names = {
        "GAR-BENCH-101": "Precision Auto Body",
        "GAR-BENCH-102": "Midwest Collision Works",
        "GAR-BENCH-103": "Buckeye State Auto Repair",
        "GAR-BENCH-104": "National Fleet & Glass",
        "GAR-BENCH-105": "Apex Benchmark Collision",
        "GAR-BENCH-106": "Vance & Sons Restoration",
        "GAR-BENCH-107": "Capital City Auto Repair",
        "GAR-BENCH-108": "Lakefront Body Experts",
    }

    agent_id = f"AGT-BENCH-{(int(pol_num) % 5) + 201}"

    return {
        "policy_id": pol_id,
        "customer_id": cust_id,
        "claim_type": "AUTO",
        "incident_date": inc_iso,
        "reported_date": rep_iso,
        "claimed_amount": total_amount,
        "currency": "USD",
        "description": f"{r.get('incident_type', 'Collision')} ({r.get('collision_type', 'Front')}). Severity: {r.get('incident_severity', 'Minor')}.",
        "location": {
            "street": r.get("incident_location", "100 Main St"),
            "city": r.get("incident_city", "Columbus"),
            "state": r.get("incident_state", "OH"),
            "postal_code": str(r.get("insured_zip", "43210")),
        },
        "involved_entities": [
            {
                "entity_type": "GARAGE",
                "entity_id": garage_id,
                "role": "REPAIR_FACILITY",
                "name": garage_names.get(garage_id, "Auto Repair Center"),
            },
            {
                "entity_type": "AGENT",
                "entity_id": agent_id,
                "role": "HANDLING_BROKER",
                "name": f"Broker {agent_id}",
            },
            {
                "entity_type": "VEHICLE",
                "entity_id": vin,
                "role": "INSURED_VEHICLE",
                "name": f"{r.get('auto_make')} {r.get('auto_model')}",
            },
        ],
        "claim_details": {
            "auto": {
                "vin": vin,
                "license_plate": f"{r.get('incident_state', 'OH')}-{pol_num[-4:]}",
                "vehicle_make": str(r.get("auto_make", "Unknown")),
                "vehicle_model": str(r.get("auto_model", "Unknown")),
                "vehicle_year": int(r.get("auto_year", 2020) or 2020),
                "estimated_repair_cost": float(r.get("vehicle_claim", total_amount * 0.7) or total_amount * 0.7),
                "drivable": r.get("incident_severity") != "Total Loss",
                "police_report_filed": r.get("police_report_available") == "YES",
                "repair_facility_id": garage_id,
            }
        },
    }

def run_ingestion(limit: int = 100):
    download_dataset_if_needed()

    with open(CSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        all_rows = list(reader)

    sample_rows = all_rows[:limit]
    print(f"Loaded {len(sample_rows)} records from {CSV_PATH} for ingestion.")

    client = None
    if MongoClient:
        try:
            client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
            client.admin.command("ping")
            setup_mongo_master_records(client, sample_rows)
        except Exception as e:
            print(f"MongoDB connection notice: {e}")

    # Build claim payloads
    claims_to_lake = []
    success_count = 0
    fail_count = 0

    import urllib.request
    import urllib.error

    print(f"\nIngesting {len(sample_rows)} claims through Next.js Ingestion Engine...")
    for idx, r in enumerate(sample_rows):
        payload = row_to_claim_payload(r, idx)
        req = urllib.request.Request(
            API_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if data.get("success"):
                    success_count += 1
                    claims_to_lake.append(data.get("claim"))
                else:
                    fail_count += 1
        except urllib.error.HTTPError as he:
            # Check if 422 validation failure
            err_body = he.read().decode("utf-8")
            try:
                err_data = json.loads(err_body)
                claims_to_lake.append(err_data.get("claim"))
            except Exception:
                pass
            fail_count += 1
        except Exception as ex:
            fail_count += 1

        if (idx + 1) % 25 == 0 or (idx + 1) == len(sample_rows):
            print(f"  Processed {idx + 1}/{len(sample_rows)} claims ({success_count} valid, {fail_count} invalid/trapped)...")

    # Write all ingested records to Parquet Data Lake
    valid_claims_for_lake = [c for c in claims_to_lake if c]
    if valid_claims_for_lake:
        lake_res = append_claims_to_parquet(valid_claims_for_lake)
        print(f"\n[Parquet Data Lake] {lake_res}")

    print("\nBenchmark dataset ingestion complete!")
    print(f"  Total: {len(sample_rows)} | Succeeded: {success_count} | Validation Trapped: {fail_count}")

if __name__ == "__main__":
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 100
    run_ingestion(count)
