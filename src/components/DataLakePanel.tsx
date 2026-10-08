"use client";

import React, { useState, useEffect } from "react";
import { Layers, Play, Cpu, Database, RefreshCw, BarChart2, FileCode2 } from "lucide-react";

interface DataLakeInfo {
  storageFormat: string;
  totalParquetFiles: number;
  totalSizeBytes: number;
  sizeFormatted: string;
  rawPartitionsCount: number;
  featureFilesCount: number;
  rawLakePath: string;
  featuresPath: string;
}

interface StreamStatus {
  status: string;
  total_generated: number;
  valid_claims: number;
  invalid_claims: number;
  last_claim_id?: string;
  last_updated?: string;
}

interface SparkSummary {
  timestamp: string | null;
  engine: string;
  total_claims_processed: number;
  investigation_candidates_identified: number;
  feature_parquet_path?: string;
  top_garage_clusters?: Array<{ garage_id: string; agent_id: string; pair_count: number }>;
}

function MetricRow({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-slate-500 text-xs">{label}</span>
      <span className={`font-mono text-xs ${highlight ? "text-slate-900 font-semibold" : "text-slate-700"}`}>
        {value}
      </span>
    </div>
  );
}

export function DataLakePanel({ onDataMutated }: { onDataMutated: () => void }) {
  const [lakeInfo, setLakeInfo] = useState<DataLakeInfo | null>(null);
  const [streamStatus, setStreamStatus] = useState<StreamStatus | null>(null);
  const [sparkSummary, setSparkSummary] = useState<SparkSummary | null>(null);

  const [startingStream, setStartingStream] = useState(false);
  const [runningSpark, setRunningSpark] = useState(false);
  const [ingestingBenchmark, setIngestingBenchmark] = useState(false);
  const [ingestingXml, setIngestingXml] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const [lakeRes, streamRes, sparkRes] = await Promise.all([
        fetch("/api/datalake"),
        fetch("/api/stream"),
        fetch("/api/spark"),
      ]);

      const [lakeJson, streamJson, sparkJson] = await Promise.all([
        lakeRes.json(),
        streamRes.json(),
        sparkRes.json(),
      ]);

      if (lakeJson.success) setLakeInfo(lakeJson.data);
      if (streamJson.success) setStreamStatus(streamJson.data);
      if (sparkJson.success) setSparkSummary(sparkJson.data);
    } catch (err) {
      console.error("Error fetching data lake / stream status", err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStartStream = async (count: number) => {
    setStartingStream(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count, interval: 0.5 }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback(`Stream worker started: generating ${count} real-time claims.`);
        setTimeout(() => onDataMutated(), 2500);
      } else {
        setFeedback(`Error: ${json.error}`);
      }
    } catch (err) {
      setFeedback(`Stream failed: ${String(err)}`);
    } finally {
      setStartingStream(false);
    }
  };

  const handleRunSpark = async () => {
    setRunningSpark(true);
    setFeedback("Executing PySpark distributed analytics job over Parquet Lake...");
    try {
      const res = await fetch("/api/spark", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setFeedback("PySpark analytics finished: Feature store updated and candidates marked.");
        fetchStatus();
        onDataMutated();
      } else {
        setFeedback(`Spark error: ${json.error}`);
      }
    } catch (err) {
      setFeedback(`Spark failed: ${String(err)}`);
    } finally {
      setRunningSpark(false);
    }
  };

  const handleIngestBenchmark = async () => {
    setIngestingBenchmark(true);
    setFeedback("Ingesting Kaggle/Mendeley real claims dataset into pipeline & Parquet lake...");
    try {
      const res = await fetch("/api/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 40, interval: 0.2 }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback("Benchmark dataset stream active!");
        setTimeout(() => onDataMutated(), 2500);
      }
    } catch (err) {
      setFeedback(`Benchmark failed: ${String(err)}`);
    } finally {
      setIngestingBenchmark(false);
    }
  };

  const handleIngestXml = async () => {
    setIngestingXml(true);
    setFeedback("Ingesting ACORD & Health XML feeds into database and Parquet lake...");
    try {
      const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<ClaimsBatch source="ACORD_GATEWAY_PARTNER">
  <ACORDClaim>
    <TransactionId>XML-TX-LAKE-8801</TransactionId>
    <PolicyRef>POL-AUTO-88219</PolicyRef>
    <InsuredRef>CUST-1001</InsuredRef>
    <LossType>AUTO</LossType>
    <LossDate>2026-03-20</LossDate>
    <NoticeAt>2026-03-21</NoticeAt>
    <TotalLossAmount>9200.00</TotalLossAmount>
    <Currency>USD</Currency>
    <LossNarrative>Front bumper impact with highway debris.</LossNarrative>
    <RepairFacilityId>GAR-77401</RepairFacilityId>
    <ProducerId>AGT-3029</ProducerId>
    <IncidentLocation>8400 North Mopac Expy</IncidentLocation>
    <IncidentCity>Austin</IncidentCity>
    <IncidentState>TX</IncidentState>
    <InsuredZip>78759</InsuredZip>
    <AutoDetails>
      <Vin>1HGCR2F83HA019284</Vin>
      <LicensePlate>TX-782-KKL</LicensePlate>
      <Make>Honda</Make>
      <Model>Accord Sport</Model>
      <Year>2021</Year>
      <RepairCost>9200.00</RepairCost>
      <IsDrivable>true</IsDrivable>
      <HasPoliceReport>true</HasPoliceReport>
    </AutoDetails>
  </ACORDClaim>
</ClaimsBatch>`;

      const res = await fetch("/api/claims/xml", {
        method: "POST",
        headers: { "Content-Type": "application/xml" },
        body: sampleXml,
      });
      const json = await res.json();
      if (json.success) {
        setFeedback(`ACORD XML feed integrated (${json.successful_ingestions} claims) into Parquet Lake.`);
        fetchStatus();
        onDataMutated();
      } else {
        setFeedback(`XML notice: ${json.error || "Completed"}`);
      }
    } catch (err) {
      setFeedback(`XML ingestion failed: ${String(err)}`);
    } finally {
      setIngestingXml(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 space-y-4.5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Big Data Lake & PySpark Engine
            </h2>
            <p className="text-xs text-slate-500">
              Apache Parquet Columnar Store · ACORD XML Integration · Distributed Analytics
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleIngestXml}
            disabled={ingestingXml}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
            title="Integrate ACORD XML feed into lake"
          >
            <FileCode2 className="h-3.5 w-3.5 text-slate-500" />
            <span>{ingestingXml ? "Ingesting..." : "Ingest XML"}</span>
          </button>

          <button
            onClick={handleIngestBenchmark}
            disabled={ingestingBenchmark}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
            title="Stream real auto insurance benchmark dataset"
          >
            <Database className="h-3.5 w-3.5 text-slate-500" />
            <span>{ingestingBenchmark ? "Streaming..." : "Real Dataset"}</span>
          </button>

          <button
            onClick={() => handleStartStream(20)}
            disabled={startingStream}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
            title="Stream burst of 20 live claims"
          >
            <Play className={`h-3.5 w-3.5 text-slate-500 ${startingStream ? "animate-pulse" : ""}`} />
            <span>{startingStream ? "Streaming..." : "Stream 20"}</span>
          </button>

          <button
            onClick={handleRunSpark}
            disabled={runningSpark}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition shadow-sm disabled:opacity-50"
          >
            <Cpu className={`h-3.5 w-3.5 ${runningSpark ? "animate-spin" : ""}`} />
            <span>{runningSpark ? "Processing..." : "Run PySpark"}</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-700 flex items-center gap-2">
          <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-500 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Grid of 3 Insight Cards */}
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
        {/* Parquet Data Lake */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800">Parquet Data Lake</span>
            <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-mono text-slate-600 border border-slate-200 shadow-2xs">
              Snappy
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            <MetricRow label="Lake Partitions" value={lakeInfo ? `${lakeInfo.rawPartitionsCount} partitions` : "Scanning..."} />
            <MetricRow label="Total Parquet Files" value={`${lakeInfo?.totalParquetFiles || 0} files`} highlight />
            <MetricRow label="Storage Size" value={lakeInfo?.sizeFormatted || "0 KB"} />
          </div>
        </div>

        {/* Real-Time Worker */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800">Streaming Telemetry</span>
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-mono font-medium border ${
                streamStatus?.status === "RUNNING"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-white text-slate-600 border-slate-200"
              }`}
            >
              {streamStatus?.status || "IDLE"}
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            <MetricRow label="Total Streamed" value={`${streamStatus?.total_generated || 0} claims`} />
            <MetricRow label="Valid Pipeline Sinks" value={streamStatus?.valid_claims || 0} highlight />
            <MetricRow label="Validation Trapped" value={streamStatus?.invalid_claims || 0} />
          </div>
        </div>

        {/* PySpark Analytics */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800">PySpark Analytics</span>
            <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-mono text-slate-600 border border-slate-200 shadow-2xs">
              Distributed
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            <MetricRow label="Claims Analyzed" value={sparkSummary?.total_claims_processed || 0} />
            <MetricRow label="Candidates Identified" value={sparkSummary?.investigation_candidates_identified || 0} highlight />
            <MetricRow
              label="Last Run"
              value={sparkSummary?.timestamp ? new Date(sparkSummary.timestamp).toLocaleTimeString() : "Pending"}
            />
          </div>
        </div>
      </div>

      {/* Detected Clusters Banner */}
      {sparkSummary?.top_garage_clusters && sparkSummary.top_garage_clusters.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs">
          <div className="flex items-center gap-2 text-amber-900 font-medium mb-1.5">
            <BarChart2 className="h-4 w-4 text-amber-700" />
            <span>PySpark Multi-Party Relationship Concentrations:</span>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] font-mono">
            {sparkSummary.top_garage_clusters.map((c, i) => (
              <span key={i} className="rounded-lg bg-white border border-amber-200 px-2.5 py-1 text-amber-900 shadow-2xs">
                {c.garage_id || "Direct Provider"} ↔ {c.agent_id} ({c.pair_count} co-occurring claims)
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
