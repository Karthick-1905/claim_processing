# ==============================================================================
# PySpark & Big Data Pipeline Makefile
# Usage:
#   make -C spark help
# ==============================================================================

SHELL := /bin/bash
PROJECT_ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST)))/..)
VENV := $(PROJECT_ROOT)/.venv
PYTHON := $(VENV)/bin/python
PIP := $(VENV)/bin/pip

COUNT ?= 20
INTERVAL ?= 0.5
BENCH_COUNT ?= 100

.PHONY: help setup stream stream-continuous ingest-benchmark ingest-xml analytics status clean-lake clean-pycache

help:
	@echo "======================================================================"
	@echo "  Insurance Claim Big Data & PySpark Pipeline Commands"
	@echo "======================================================================"
	@echo "  make setup              - Initialize .venv and install Python dependencies"
	@echo "  make stream             - Run streaming generator for a burst (default: COUNT=20 INTERVAL=0.5)"
	@echo "  make stream-continuous  - Run real-time stream worker daemon continuously"
	@echo "  make ingest-benchmark   - Ingest Kaggle/Mendeley real claims dataset (default: BENCH_COUNT=100)"
	@echo "  make ingest-xml         - Ingest ACORD & Health XML feeds from data/xml_claims/"
	@echo "  make analytics          - Execute PySpark feature engineering and anomaly detection job"
	@echo "  make status             - Show streaming worker status and Parquet lake stats"
	@echo "  make clean-lake         - Clean Parquet Data Lake (raw and analytics)"
	@echo "  make clean-pycache      - Remove Python bytecode and cache folders"
	@echo "======================================================================"

setup:
	@if [ ! -d "$(VENV)" ]; then \
		echo "Creating virtual environment at $(VENV)..."; \
		python3 -m venv $(VENV); \
	fi
	@echo "Installing pipeline dependencies from requirements.txt..."
	@$(PIP) install -r $(PROJECT_ROOT)/spark/requirements.txt
	@echo "Setup complete. Virtual environment ready."

stream:
	@echo "Running stream generator (Burst of $(COUNT) claims at $(INTERVAL)s interval)..."
	@VIRTUAL_ENV=$(VENV) PATH=$(VENV)/bin:$$PATH \
	python3 $(PROJECT_ROOT)/spark/pipelines/stream_generator.py --count $(COUNT) --interval $(INTERVAL)

stream-continuous:
	@echo "Starting continuous real-time stream generator (Press Ctrl+C to stop)..."
	@VIRTUAL_ENV=$(VENV) PATH=$(VENV)/bin:$$PATH \
	python3 $(PROJECT_ROOT)/spark/pipelines/stream_generator.py --interval $(INTERVAL)

ingest-benchmark:
	@echo "Ingesting real benchmark claims dataset ($(BENCH_COUNT) claims)..."
	@VIRTUAL_ENV=$(VENV) PATH=$(VENV)/bin:$$PATH \
	python3 $(PROJECT_ROOT)/spark/pipelines/ingest_benchmark_dataset.py $(BENCH_COUNT)

ingest-xml:
	@echo "Ingesting ACORD and partner XML feeds from data/xml_claims/..."
	@VIRTUAL_ENV=$(VENV) PATH=$(VENV)/bin:$$PATH \
	python3 $(PROJECT_ROOT)/spark/pipelines/ingest_xml_claims.py

analytics:
	@echo "Executing PySpark Feature Engineering & Anomaly Analytics Job..."
	@VIRTUAL_ENV=$(VENV) PATH=$(VENV)/bin:$$PATH \
	python3 $(PROJECT_ROOT)/spark/jobs/claim_feature_analytics.py

status:
	@echo "--- Streaming Worker Telemetry ---"
	@if [ -f "$(PROJECT_ROOT)/data/stream_status.json" ]; then \
		cat $(PROJECT_ROOT)/data/stream_status.json; \
	else \
		echo "No stream worker status available."; \
	fi
	@echo ""
	@echo "--- Parquet Data Lake Files ---"
	@find $(PROJECT_ROOT)/datalake/ -type f 2>/dev/null | wc -l | awk '{print $$1, "parquet file(s) found"}'
	@echo ""
	@echo "--- PySpark Analytics Summary ---"
	@if [ -f "$(PROJECT_ROOT)/data/spark_analytics_summary.json" ]; then \
		cat $(PROJECT_ROOT)/data/spark_analytics_summary.json; \
	else \
		echo "No PySpark summary available."; \
	fi

clean-lake:
	@echo "Clearing Parquet Data Lake..."
	@rm -rf $(PROJECT_ROOT)/datalake/raw/claims/*
	@rm -rf $(PROJECT_ROOT)/datalake/analytics/features/*
	@echo "Data Lake cleared."

clean-pycache:
	@echo "Removing Python cache..."
	@find $(PROJECT_ROOT)/spark -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find $(PROJECT_ROOT)/spark -type f -name "*.pyc" -delete 2>/dev/null || true
	@echo "Python cache cleaned."
