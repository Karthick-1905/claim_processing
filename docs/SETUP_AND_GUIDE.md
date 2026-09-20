# Setup & Operational Guide

---

## 1. Quick Start

### 1.1 Prerequisites
- **Node.js**: v20+ / pnpm v10+
- **Docker & Docker Compose**: v29+ / Compose v5+
- **Java**: OpenJDK 17+ or 21+ (for Apache Spark)
- **Python**: 3.12+ (with virtual environment in `.venv`)
- **Neo4j Aura**: Free or Professional cloud instance

---

## 2. Infrastructure Setup (Docker Compose)

The project includes containerized MongoDB with persistent data volumes.

### 2.1 Start MongoDB
```bash
docker compose up -d mongodb
```

To verify MongoDB is healthy:
```bash
docker compose ps
```

---

## 3. Environment Variables Configuration

Create or update `.env` in the project root:

```env
# MongoDB Connection
MONGODB_URI=mongodb://admin:password123@localhost:27017/claims_db?authSource=admin
MONGODB_DB_NAME=claims_db

# Neo4j Aura Instance Connection
NEO4J_URI=neo4j+s://your-instance-id.databases.neo4j.io
NEO4J_USERNAME=your-username
NEO4J_PASSWORD=your_secure_aura_password
NEO4J_DATABASE=neo4j

# Application Environment
NODE_ENV=development
PORT=3000
```

---

## 4. Master Data & Real Dataset Ingestion

### 4.1 Option A: Seed Initial Master Records
```bash
pnpm seed
# Or click "Seed Master Data" on the web dashboard
```

### 4.2 Option B: Ingest Real Kaggle/Mendeley Claims Dataset
Downloads and ingests 1,000 real auto insurance claims from the standard benchmark dataset into the pipeline, validates each row against MongoDB master policies, and appends to the Parquet Data Lake:
```bash
.venv/bin/python spark/pipelines/ingest_benchmark_dataset.py 100
# Or click "Ingest Real Dataset" on the Data Lake web panel
```

---

## 5. Real-Time Background Streaming Generator

The background worker generates a continuous stream of realistic claims with configurable velocities and injects controlled multi-party risk indicators (dense garage rings, broker collusion):

```bash
# Ingest 20 claims at 0.5s interval
.venv/bin/python spark/pipelines/stream_generator.py --count 20 --interval 0.5

# Run continuous background daemon
.venv/bin/python spark/pipelines/stream_generator.py --interval 1.0
```
*Can also be started directly via the web dashboard's **"Stream 20 Claims"** button.*

---

## 6. Intermediate Apache Parquet Data Lake

All raw and validated claims are staged in an industry-standard columnar Data Lake:
- **Raw Lake Directory**: `datalake/raw/claims/year=YYYY/month=MM/day=DD/*.parquet`
- **Compression**: Snappy
- **Feature Store Output**: `datalake/analytics/features/run_*.parquet`

Inspect via API:
```bash
curl http://localhost:3000/api/datalake
```

---

## 7. PySpark Large-Scale Feature Engineering & Risk Analytics

Run the distributed PySpark job to compute rolling statistical features (Z-scores, garage anomaly deviation, agent-garage co-occurrence density), persist feature vectors to the Data Lake, and update MongoDB candidates:

```bash
# Run via CLI
.venv/bin/python spark/jobs/claim_feature_analytics.py

# Or trigger via HTTP API / Web Dashboard
curl -X POST http://localhost:3000/api/spark
```

---

## 8. Static Code Intelligence with Fallow

Run the static analysis suite across all TypeScript, React, and server files to ensure clean code, zero dead code, zero dead exports, and high maintainability:

```bash
# Run dead-code audit (0% dead files, 0% dead exports)
pnpm fallow dead-code

# Run duplication audit (0% code duplication)
pnpm fallow dupes

# Run health score check
pnpm fallow --score
```
