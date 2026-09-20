#!/usr/bin/env python3
"""
Real-Time Background Claim Stream Generator Worker
Generates continuous streams of claims with realistic variance,
submits them to the Ingestion API, and flushes to the Parquet Data Lake.
Supports injecting controlled multi-party risk indicators.
"""

import os
import sys
import time
import json
import random
import signal
from datetime import datetime, timedelta, timezone
import urllib.request
import urllib.error

# Project paths
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
STATUS_FILE = os.path.join(PROJECT_ROOT, "data", "stream_status.json")

sys.path.insert(0, os.path.join(PROJECT_ROOT, "spark", "lake"))
from parquet_sink import append_claims_to_parquet

API_URL = os.environ.get("INGESTION_API_URL", "http://127.0.0.1:3000/api/claims")

RUNNING = True

def handle_signal(sig, frame):
    global RUNNING
    print(f"\nCaught signal {sig}. Stopping stream generator...")
    RUNNING = False

signal.signal(signal.SIGINT, handle_signal)
signal.signal(signal.SIGTERM, handle_signal)

# Realistic pools
VEHICLE_MAKES = [
    ("Honda", ["Accord", "Civic", "CR-V"]),
    ("Toyota", ["Camry", "Corolla", "RAV4"]),
    ("Ford", ["F-150", "Explorer", "Fusion"]),
    ("Chevrolet", ["Silverado", "Malibu", "Tahoe"]),
    ("BMW", ["330i", "530i", "X5"]),
]

GARAGES = [
    ("GAR-77401", "Apex Auto Collision"),
    ("GAR-88102", "Lonestar Body & Paint"),
    ("GAR-99210", "Austin Premier Collision"),
    ("GAR-55019", "Capital Auto Restorations"),
]

AGENTS = [
    ("AGT-3029", "David Miller Agency"),
    ("AGT-4401", "Sarah Jenkins Brokerage"),
    ("AGT-1102", "Austin Mutual Direct"),
]

CITIES_TX = [
    ("Austin", "78701"),
    ("Round Rock", "78664"),
    ("San Antonio", "78205"),
    ("Houston", "77002"),
    ("Dallas", "75201"),
]

NARRATIVES = [
    "Front bumper collision during stop-and-go highway traffic.",
    "Side swipe while merging on interstate ramp.",
    "Parking lot scrape to rear right quarter panel.",
    "Windshield and hood hail impact during severe storm.",
    "Rear collision at lighted intersection. Tail lights cracked.",
]

def generate_claim_payload(is_suspicious_pattern: bool = False, pattern_type: str = "GARAGE_RING") -> dict:
    from datetime import timezone
    now = datetime.now(timezone.utc)
    incident_dt = now - timedelta(hours=random.randint(2, 48))

    # Known verified policyholders and vehicle mappings
    valid_pairs = [
        ("CUST-1001", "POL-AUTO-88219", "1HGCR2F83HA019284"),
        ("CUST-1002", "POL-AUTO-99304", "4T1B11HK5JU109482"),
    ]

    if is_suspicious_pattern and pattern_type == "GARAGE_RING":
        # Multi-party pattern: different customers routed to the same garage with elevated repair amounts
        cust_id, pol_id, vin = random.choice(valid_pairs)
        garage = ("GAR-77401", "Apex Auto Collision")
        agent = ("AGT-3029", "David Miller Agency")
        amount = random.uniform(8500.0, 14500.0)
        desc = "Multi-car collision on expressway. Significant front and undercarriage damage."
    else:
        cust_id, pol_id, vin = random.choice(valid_pairs)
        garage = random.choice(GARAGES)
        agent = random.choice(AGENTS)
        amount = random.uniform(850.0, 4200.0)
        desc = random.choice(NARRATIVES)

    make, models = random.choice(VEHICLE_MAKES)
    model = random.choice(models)
    year = random.randint(2018, 2024)
    city, zip_code = random.choice(CITIES_TX)

    return {
        "policy_id": pol_id,
        "customer_id": cust_id,
        "claim_type": "AUTO",
        "incident_date": incident_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "claimed_amount": round(amount, 2),
        "currency": "USD",
        "description": desc,
        "location": {
            "street": f"{random.randint(100, 9999)} Main Arterial Blvd",
            "city": city,
            "state": "TX",
            "postal_code": zip_code,
        },
        "involved_entities": [
            {
                "entity_type": "GARAGE",
                "entity_id": garage[0],
                "role": "REPAIR_FACILITY",
                "name": garage[1],
            },
            {
                "entity_type": "AGENT",
                "entity_id": agent[0],
                "role": "HANDLING_BROKER",
                "name": agent[1],
            },
            {
                "entity_type": "VEHICLE",
                "entity_id": vin,
                "role": "INSURED_VEHICLE",
                "name": f"{year} {make} {model}",
            },
        ],
        "claim_details": {
            "auto": {
                "vin": vin,
                "license_plate": f"TX-{random.randint(100, 999)}-{random.choice(['A','B','C'])}{random.choice(['X','Y','Z'])}",
                "vehicle_make": make,
                "vehicle_model": model,
                "vehicle_year": year,
                "estimated_repair_cost": round(amount, 2),
                "drivable": amount < 6000.0,
                "police_report_filed": amount > 3000.0,
                "repair_facility_id": garage[0],
            }
        },
    }

def update_status_file(status: str, total: int, success: int, invalid: int, last_claim_id: str = None):
    os.makedirs(os.path.dirname(STATUS_FILE), exist_ok=True)
    payload = {
        "status": status,
        "total_generated": total,
        "valid_claims": success,
        "invalid_claims": invalid,
        "last_claim_id": last_claim_id,
        "last_updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    with open(STATUS_FILE, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

def run_stream(count: int = None, interval: float = 1.0):
    global RUNNING
    print(f"Starting Real-Time Claim Streaming Generator (Interval: {interval}s, Count: {count or 'Continuous'})...")
    update_status_file("RUNNING", 0, 0, 0)

    total = 0
    success = 0
    invalid = 0
    buffer_for_lake = []
    start_time = time.time()

    try:
        while RUNNING:
            total += 1
            # 20% probability of controlled multi-party risk pattern
            is_suspicious = (random.random() < 0.20)
            payload = generate_claim_payload(is_suspicious_pattern=is_suspicious)

            req = urllib.request.Request(
                API_URL,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )

            last_id = None
            try:
                with urllib.request.urlopen(req, timeout=5) as resp:
                    resp_data = json.loads(resp.read().decode("utf-8"))
                    if resp_data.get("success"):
                        success += 1
                        claim_obj = resp_data.get("claim")
                        last_id = claim_obj.get("claim_id")
                        buffer_for_lake.append(claim_obj)
                    else:
                        invalid += 1
            except urllib.error.HTTPError as he:
                invalid += 1
                try:
                    err_data = json.loads(he.read().decode("utf-8"))
                    if err_data.get("claim"):
                        buffer_for_lake.append(err_data.get("claim"))
                except Exception:
                    pass
            except Exception as ex:
                invalid += 1

            pattern_tag = "[RISK_PATTERN]" if is_suspicious else "[NORMAL]"
            print(f"[{datetime.now().strftime('%H:%M:%S')}] {pattern_tag} Ingested #{total} (ID: {last_id or 'ERR'}) - ${payload['claimed_amount']:,.2f}")

            # Flush to Parquet lake every 10 claims
            if len(buffer_for_lake) >= 10:
                append_claims_to_parquet(buffer_for_lake)
                buffer_for_lake.clear()

            update_status_file("RUNNING", total, success, invalid, last_id)

            if count and total >= count:
                break

            time.sleep(interval)

    finally:
        if buffer_for_lake:
            append_claims_to_parquet(buffer_for_lake)
            buffer_for_lake.clear()

        update_status_file("STOPPED", total, success, invalid)
        duration = time.time() - start_time
        print(f"\nStream Generator Stopped. Total: {total} claims in {duration:.1f}s ({success} valid, {invalid} invalid).")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Real-time Claim Streaming Generator")
    parser.add_argument("--count", type=int, default=None, help="Number of claims to generate (default: continuous)")
    parser.add_argument("--interval", type=float, default=1.0, help="Interval in seconds between claims")
    args = parser.parse_args()

    run_stream(count=args.count, interval=args.interval)
