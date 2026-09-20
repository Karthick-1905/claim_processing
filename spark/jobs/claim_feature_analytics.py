#!/usr/bin/env python3
"""
PySpark Large-Scale Feature Engineering & Multi-Party Risk Analytics Job
Reads Parquet Data Lake, runs distributed aggregations and window functions,
identifies statistical outliers and multi-party relationship density,
and outputs feature vectors to Parquet and MongoDB.
"""

import os
import sys
import json
from datetime import datetime

# Project root paths
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
DATALAKE_RAW = os.path.join(PROJECT_ROOT, "datalake", "raw", "claims")
DATALAKE_FEATURES = os.path.join(PROJECT_ROOT, "datalake", "analytics", "features")
SUMMARY_OUTPUT = os.path.join(PROJECT_ROOT, "data", "spark_analytics_summary.json")

MONGO_URI = os.environ.get("MONGODB_URI", "mongodb://admin:password123@localhost:27017/claims_db?authSource=admin")

def run_spark_analytics():
    print("=" * 70)
    print("Initializing PySpark Large-Scale Claim Analytics Job...")
    print("=" * 70)

    try:
        from pyspark.sql import SparkSession
        from pyspark.sql import functions as F
        from pyspark.sql.window import Window
    except ImportError:
        print("PySpark is not yet installed in this environment. Falling back to PyArrow/Pandas engine for feature generation.")
        return run_arrow_analytics()

    spark = (
        SparkSession.builder
        .appName("ClaimMultiPartyRiskAnalytics")
        .master("local[*]")
        .config("spark.sql.adaptive.enabled", "true")
        .config("spark.ui.enabled", "false")
        .getOrCreate()
    )
    spark.sparkContext.setLogLevel("WARN")

    if not os.path.exists(DATALAKE_RAW) or not os.listdir(DATALAKE_RAW):
        print(f"No parquet datasets found at {DATALAKE_RAW}. Run stream or benchmark ingestion first.")
        spark.stop()
        return

    print(f"Reading Parquet Data Lake from {DATALAKE_RAW} ...")
    df = spark.read.parquet(DATALAKE_RAW)
    total_records = df.count()
    print(f"Loaded {total_records:,} claim record(s) into PySpark DataFrame.")

    # 1. Garage Statistical Profiling
    garage_window = Window.partitionBy("garage_id")
    df_with_stats = (
        df
        .withColumn("garage_avg_amount", F.avg("claimed_amount").over(garage_window))
        .withColumn("garage_stddev", F.coalesce(F.stddev("claimed_amount").over(garage_window), F.lit(1.0)))
        .withColumn("garage_total_claims", F.count("claim_id").over(garage_window))
    )

    # 2. Cost Outlier Metric (Z-score deviation)
    df_with_outliers = (
        df_with_stats
        .withColumn(
            "cost_z_score",
            F.abs(F.col("claimed_amount") - F.col("garage_avg_amount")) / (F.col("garage_stddev") + 1.0)
        )
    )

    # 3. Multi-Party Concentration (Agent-Garage Co-occurrence)
    agent_garage_window = Window.partitionBy("garage_id", "agent_id")
    df_with_network = (
        df_with_outliers
        .withColumn("agent_garage_pair_count", F.count("claim_id").over(agent_garage_window))
    )

    # 4. Repeated Asset Frequency (Vehicle VIN claim velocity)
    vin_window = Window.partitionBy("vehicle_vin")
    df_analyzed = (
        df_with_network
        .withColumn("vin_claim_velocity", F.count("claim_id").over(vin_window))
        .withColumn(
            "flag_cost_outlier",
            F.when(F.col("cost_z_score") > 2.0, True).otherwise(False)
        )
        .withColumn(
            "flag_dense_cluster",
            F.when((F.col("agent_garage_pair_count") >= 3) & (F.col("garage_id") != ""), True).otherwise(False)
        )
        .withColumn(
            "flag_recycled_vin",
            F.when((F.col("vin_claim_velocity") >= 2) & (F.col("vehicle_vin") != ""), True).otherwise(False)
        )
    )

    # Write Feature Store output to Parquet Data Lake
    os.makedirs(DATALAKE_FEATURES, exist_ok=True)
    out_path = os.path.join(DATALAKE_FEATURES, f"run_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}")
    print(f"Persisting enriched feature vectors to Parquet Data Lake: {out_path} ...")
    df_analyzed.write.mode("overwrite").parquet(out_path)

    # Collect flagged investigation candidates
    flagged_df = df_analyzed.filter(
        F.col("flag_cost_outlier") | F.col("flag_dense_cluster") | F.col("flag_recycled_vin")
    )
    flagged_records = flagged_df.collect()
    print(f"\n[PySpark Analytics Result] Identified {len(flagged_records)} investigation candidate(s) exhibiting risk indicators.")

    # Update MongoDB with risk indicators & watermark
    update_mongo_candidates(flagged_records)

    # Write summary
    summary = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "engine": "Apache Spark (PySpark)",
        "total_claims_processed": total_records,
        "investigation_candidates_identified": len(flagged_records),
        "feature_parquet_path": out_path,
        "top_garage_clusters": [
            {"garage_id": row["garage_id"], "agent_id": row["agent_id"], "pair_count": row["agent_garage_pair_count"]}
            for row in df_analyzed.select("garage_id", "agent_id", "agent_garage_pair_count").distinct().filter(F.col("agent_garage_pair_count") >= 2).take(5)
        ],
    }

    os.makedirs(os.path.dirname(SUMMARY_OUTPUT), exist_ok=True)
    with open(SUMMARY_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    spark.stop()
    print("PySpark Analytics Job Completed Successfully!")

def run_arrow_analytics():
    """Fallback high-speed Arrow/Pandas analytical feature generation if PySpark is installing."""
    import pyarrow.parquet as pq
    import pandas as pd

    if not os.path.exists(DATALAKE_RAW):
        print(f"No parquet lake found at {DATALAKE_RAW}")
        return

    print("Executing Feature Analytics via PyArrow & Pandas...")
    dataset = pq.ParquetDataset(DATALAKE_RAW)
    table = dataset.read()
    df = table.to_pandas()

    if df.empty:
        print("Parquet lake is empty.")
        return

    # 1. Garage stats
    garage_stats = df.groupby("garage_id")["claimed_amount"].agg(["mean", "std", "count"]).reset_index()
    garage_stats.columns = ["garage_id", "garage_avg_amount", "garage_stddev", "garage_total_claims"]
    garage_stats["garage_stddev"] = garage_stats["garage_stddev"].fillna(1.0)
    df = df.merge(garage_stats, on="garage_id", how="left")

    # 2. Cost z-score
    df["cost_z_score"] = (df["claimed_amount"] - df["garage_avg_amount"]).abs() / (df["garage_stddev"] + 1.0)
    df["flag_cost_outlier"] = df["cost_z_score"] > 2.0

    # 3. Agent-Garage cluster count
    pair_counts = df[df["garage_id"] != ""].groupby(["garage_id", "agent_id"])["claim_id"].transform("count")
    df["agent_garage_pair_count"] = pair_counts.fillna(1).astype(int)
    df["flag_dense_cluster"] = df["agent_garage_pair_count"] >= 3

    # 4. VIN velocity
    vin_counts = df[df["vehicle_vin"] != ""].groupby("vehicle_vin")["claim_id"].transform("count")
    df["vin_claim_velocity"] = vin_counts.fillna(1).astype(int)
    df["flag_recycled_vin"] = df["vin_claim_velocity"] >= 2

    # Save features to Parquet
    os.makedirs(DATALAKE_FEATURES, exist_ok=True)
    feature_file = os.path.join(DATALAKE_FEATURES, f"features_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.parquet")
    df.to_parquet(feature_file, compression="snappy")
    print(f"Features saved to {feature_file}")

    # Flagged records
    flagged = df[df["flag_cost_outlier"] | df["flag_dense_cluster"] | df["flag_recycled_vin"]]
    print(f"Identified {len(flagged)} candidates with risk indicators.")

    # Update MongoDB
    flagged_records = flagged.to_dict(orient="records")
    update_mongo_candidates(flagged_records)

    summary = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "engine": "PyArrow / Vectorized Analytics",
        "total_claims_processed": len(df),
        "investigation_candidates_identified": len(flagged),
        "feature_parquet_path": feature_file,
    }
    with open(SUMMARY_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

def update_mongo_candidates(records):
    try:
        from pymongo import MongoClient
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
        db = client["claims_db"]
        claims_col = db["claims"]
        events_col = db["claim_events"]

        now_iso = datetime.utcnow().isoformat() + "Z"
        updated_count = 0

        for r in records:
            claim_id = r["claim_id"] if isinstance(r, dict) else r.claim_id
            cost_outlier = r.get("flag_cost_outlier") if isinstance(r, dict) else r.flag_cost_outlier
            dense_cluster = r.get("flag_dense_cluster") if isinstance(r, dict) else r.flag_dense_cluster
            recycled_vin = r.get("flag_recycled_vin") if isinstance(r, dict) else r.flag_recycled_vin

            indicators = []
            if cost_outlier:
                indicators.append("RISK_COST_OUTLIER_ANOMALY: Claim amount exceeds 2 standard deviations from garage historical mean.")
            if dense_cluster:
                indicators.append("RISK_DENSE_MULTI_PARTY_CLUSTER: Unusual concentration of claims shared between garage and agent.")
            if recycled_vin:
                indicators.append("RISK_REPEATED_ASSET_VELOCITY: Vehicle VIN appears in multiple claims across short window.")

            if indicators:
                res = claims_col.update_one(
                    {"claim_id": claim_id, "status": {"$ne": "INVALID"}},
                    {
                        "$set": {
                            "status": "INVESTIGATION_CANDIDATE",
                            "risk_indicators": indicators,
                            "pyspark_batch_watermark": now_iso,
                            "updated_at": now_iso,
                        }
                    }
                )
                if res.modified_count > 0:
                    updated_count += 1
                    events_col.insert_one({
                        "event_id": f"EVT-SPARK-{datetime.utcnow().strftime('%s%f')}",
                        "claim_id": claim_id,
                        "event_type": "INVESTIGATION_FLAGGED",
                        "from_status": "READY_FOR_ANALYSIS",
                        "to_status": "INVESTIGATION_CANDIDATE",
                        "timestamp": now_iso,
                        "trigger_source": "PYSPARK_ANALYTICS_JOB",
                        "actor": "pyspark_engine",
                        "details": {"indicators": indicators},
                    })

        print(f"Updated {updated_count} claim(s) in MongoDB with INVESTIGATION_CANDIDATE status and risk indicators.")
    except Exception as e:
        print(f"Notice updating MongoDB: {e}")

if __name__ == "__main__":
    run_spark_analytics()
