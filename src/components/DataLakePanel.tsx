"use client";

import React, { useState, useEffect } from "react";
import { Layers, Play, Cpu, Database, CheckCircle2, AlertTriangle, RefreshCw, BarChart3 } from "lucide-react";

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

function PanelMetricRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className={`font-mono ${highlight ? "text-cyan-400 font-semibold" : "text-zinc-200"}`}>
        {value}
      </span>
    </div>
  );
}

export function DataLakePanel({ onDataMutated }: { onDataMutated: () => void }) {
  const [lakeInfo, setLakeInfo] = useState<DataLakeInfo | null>(null);
  const [streamStatus, setStreamStatus] = useState<StreamStatus | null>(null);
  const [sparkSummary, setSparkSummary] = useState<SparkSummary | null>(null);

  const [loadingLake, setLoadingLake] = useState(false);
  const [startingStream, setStartingStream] = useState(false);
  const [runningSpark, setRunningSpark] = useState(false);
  const [ingestingBenchmark, setIngestingBenchmark] = useState(false);
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
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleStartStream = async (count: number) => {
    setStartingStream(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count, interval: 0.6 }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback(`Real-time stream worker initiated for ${count} claims!`);
        setTimeout(() => onDataMutated(), 2000);
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
    setFeedback("Running PySpark Feature Analytics Job across Parquet Lake...");
    try {
      const res = await fetch("/api/spark", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setFeedback("PySpark Analytics Job completed! Feature vectors persisted and MongoDB candidates updated.");
        fetchStatus();
        onDataMutated();
      } else {
        setFeedback(`PySpark job error: ${json.error}`);
      }
    } catch (err) {
      setFeedback(`Spark failed: ${String(err)}`);
    } finally {
      setRunningSpark(false);
    }
  };

  const handleIngestBenchmark = async () => {
    setIngestingBenchmark(true);
    setFeedback("Ingesting 50 real claims from Kaggle/Mendeley benchmark dataset into pipeline & Parquet lake...");
    try {
      const res = await fetch("/api/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 50, interval: 0.2 }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback("Benchmark dataset claims stream initiated into pipeline and Parquet lake!");
        setTimeout(() => onDataMutated(), 3000);
      }
    } catch (err) {
      setFeedback(`Benchmark ingestion failed: ${String(err)}`);
    } finally {
      setIngestingBenchmark(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-5 shadow-lg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <Layers className="h-5 w-5 text-cyan-400" />
          <div>
            <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
              Big Data Lake & PySpark Analytics Engine
            </h2>
            <p className="text-xs text-zinc-400">
              Intermediate Apache Parquet Storage (Snappy) · Streaming Ingestion · Distributed Feature Analytics
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleIngestBenchmark}
            disabled={ingestingBenchmark}
            className="flex items-center gap-1.5 rounded-lg border border-cyan-800/70 bg-cyan-950/40 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-900/50 disabled:opacity-50 transition"
            title="Ingests real Kaggle/Mendeley claims into the pipeline"
          >
            <Database className="h-3.5 w-3.5" />
            <span>{ingestingBenchmark ? "Streaming..." : "Ingest Real Dataset"}</span>
          </button>

          <button
            onClick={() => handleStartStream(20)}
            disabled={startingStream}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-800/70 bg-emerald-950/40 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-900/50 disabled:opacity-50 transition"
            title="Stream 20 real-time claims with controlled multi-party risk indicators"
          >
            <Play className={`h-3.5 w-3.5 ${startingStream ? "animate-pulse" : ""}`} />
            <span>{startingStream ? "Starting..." : "Stream 20 Claims"}</span>
          </button>

          <button
            onClick={handleRunSpark}
            disabled={runningSpark}
            className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-50 transition shadow-sm"
          >
            <Cpu className={`h-3.5 w-3.5 ${runningSpark ? "animate-spin text-white" : ""}`} />
            <span>{runningSpark ? "Spark Running..." : "Run PySpark Analytics"}</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-900/90 px-3 py-2 text-xs text-cyan-200 flex items-center gap-2">
          <RefreshCw className="h-3.5 w-3.5 animate-spin text-cyan-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Grid of 3 Insight Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Parquet Data Lake Specs */}
        <div className="rounded-xl border border-zinc-800/90 bg-zinc-900/40 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Parquet Data Lake</span>
            <span className="rounded bg-cyan-950 px-1.5 py-0.5 text-[10px] font-mono text-cyan-400 border border-cyan-800/60">
              Snappy Columnar
            </span>
          </div>
          <div className="space-y-1.5 text-xs">
            <PanelMetricRow label="Parquet Partitions" value={lakeInfo ? `${lakeInfo.rawPartitionsCount} partitions` : "Scanning..."} />
            <PanelMetricRow label="Total Parquet Files" value={`${lakeInfo?.totalParquetFiles || 0} files`} highlight />
            <PanelMetricRow label="Lake Storage Size" value={lakeInfo?.sizeFormatted || "0 KB"} />
            <PanelMetricRow label="Feature Store Files" value={`${lakeInfo?.featureFilesCount || 0} features`} />
          </div>
        </div>

        {/* Real-Time Background Worker Telemetry */}
        <div className="rounded-xl border border-zinc-800/90 bg-zinc-900/40 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Stream Worker</span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold border ${
                streamStatus?.status === "RUNNING"
                  ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                  : "bg-zinc-800 text-zinc-400 border-zinc-700"
              }`}
            >
              {streamStatus?.status || "IDLE"}
            </span>
          </div>
          <div className="space-y-1.5 text-xs">
            <PanelMetricRow label="Total Stream Ingested" value={`${streamStatus?.total_generated || 0} claims`} />
            <PanelMetricRow label="Valid Pipeline Ingests" value={streamStatus?.valid_claims || 0} highlight />
            <PanelMetricRow label="Validation Trapped" value={streamStatus?.invalid_claims || 0} />
            <PanelMetricRow label="Last Claim ID" value={streamStatus?.last_claim_id || "None"} />
          </div>
        </div>

        {/* PySpark Risk Insights */}
        <div className="rounded-xl border border-zinc-800/90 bg-zinc-900/40 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">PySpark Analytics</span>
            <span className="rounded bg-cyan-950 px-1.5 py-0.5 text-[10px] font-mono text-cyan-400 border border-cyan-800/60">
              Distributed SQL
            </span>
          </div>
          <div className="space-y-1.5 text-xs">
            <PanelMetricRow label="Engine" value={sparkSummary?.engine || "Apache Spark"} />
            <PanelMetricRow label="Claims Analyzed" value={sparkSummary?.total_claims_processed || 0} />
            <PanelMetricRow label="Investigation Candidates" value={sparkSummary?.investigation_candidates_identified || 0} highlight />
            <PanelMetricRow
              label="Last Spark Execution"
              value={sparkSummary?.timestamp ? new Date(sparkSummary.timestamp).toLocaleTimeString() : "Pending run"}
            />
          </div>
        </div>
      </div>

      {/* Detected Clusters Banner if any */}
      {sparkSummary?.top_garage_clusters && sparkSummary.top_garage_clusters.length > 0 && (
        <div className="rounded-xl border border-amber-800/60 bg-amber-950/20 p-3 text-xs">
          <div className="flex items-center gap-2 text-amber-400 font-semibold mb-1">
            <BarChart3 className="h-4 w-4" />
            <span>PySpark Detected Multi-Party Concentration Outliers:</span>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] font-mono mt-1">
            {sparkSummary.top_garage_clusters.map((c, i) => (
              <span key={i} className="rounded bg-amber-950/70 border border-amber-800/80 px-2 py-0.5 text-amber-200">
                {c.garage_id} ↔ {c.agent_id} ({c.pair_count} co-occurring claims)
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
