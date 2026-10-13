"use client";

import React, { useState, useEffect } from "react";
import { Layers, Play, Database, RefreshCw, FileCode2, CheckCircle2 } from "lucide-react";

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

  const [startingStream, setStartingStream] = useState(false);
  const [ingestingXml, setIngestingXml] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const [lakeRes, streamRes] = await Promise.all([
        fetch("/api/datalake"),
        fetch("/api/stream"),
      ]);

      const [lakeJson, streamJson] = await Promise.all([
        lakeRes.json(),
        streamRes.json(),
      ]);

      if (lakeJson.success) setLakeInfo(lakeJson.data);
      if (streamJson.success) setStreamStatus(streamJson.data);
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
    setFeedback(`Generating and ingesting ${count} live claims through validation pipeline...`);
    try {
      const res = await fetch("/api/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback(`Live stream completed: Ingested ${count} real-time claims.`);
        fetchStatus();
        onDataMutated();
      } else {
        setFeedback(`Error: ${json.error}`);
      }
    } catch (err) {
      setFeedback(`Stream failed: ${String(err)}`);
    } finally {
      setStartingStream(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleIngestXml = async () => {
    setIngestingXml(true);
    setFeedback("Ingesting ACORD partner XML feed into validation engine...");
    try {
      const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<ClaimsBatch source="ACORD_GATEWAY_PARTNER">
  <ACORDClaim>
    <TransactionId>XML-TX-AUTO-${Date.now()}</TransactionId>
    <PolicyRef>POL-AUTO-88219</PolicyRef>
    <InsuredRef>CUST-1001</InsuredRef>
    <LossType>AUTO</LossType>
    <LossDate>${new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10)}</LossDate>
    <NoticeAt>${new Date().toISOString().slice(0, 10)}</NoticeAt>
    <TotalLossAmount>6850.00</TotalLossAmount>
    <Currency>USD</Currency>
    <LossNarrative>ACORD Gateway Feed: Front bumper collision damage with sensor alignment.</LossNarrative>
    <RepairFacilityId>GAR-77401</RepairFacilityId>
    <RepairFacilityName>Apex Auto Collision Center</RepairFacilityName>
    <ProducerId>AGT-3029</ProducerId>
    <ProducerName>David Miller Agency</ProducerName>
    <IncidentLocation>1200 S Congress Ave</IncidentLocation>
    <IncidentCity>Austin</IncidentCity>
    <IncidentState>TX</IncidentState>
    <InsuredZip>78704</InsuredZip>
    <AutoDetails>
      <Vin>1HGCR2F83HA019284</Vin>
      <LicensePlate>TX-448-ABC</LicensePlate>
      <Make>Honda</Make>
      <Model>Accord</Model>
      <Year>2021</Year>
      <RepairCost>6850.00</RepairCost>
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
        setFeedback(`ACORD XML feed ingested successfully! Claim: ${json.data.claim_id}`);
        onDataMutated();
      } else {
        setFeedback(`XML Ingest Error: ${json.error || json.message}`);
      }
    } catch (err) {
      setFeedback(`XML failed: ${String(err)}`);
    } finally {
      setIngestingXml(false);
      setTimeout(() => setFeedback(null), 5000);
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
              Data Ingestion & Columnar Data Lake
            </h2>
            <p className="text-xs text-slate-500">
              Apache Parquet Columnar Lake · ACORD XML Integration · Real-Time Streaming Feeds
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleIngestXml}
            disabled={ingestingXml}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
            title="Integrate ACORD XML feed into pipeline"
          >
            <FileCode2 className="h-3.5 w-3.5 text-slate-500" />
            <span>{ingestingXml ? "Ingesting..." : "Ingest ACORD XML"}</span>
          </button>

          <button
            onClick={() => handleStartStream(10)}
            disabled={startingStream}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition shadow-sm disabled:opacity-50"
            title="Stream burst of 10 live claims"
          >
            <Play className={`h-3.5 w-3.5 ${startingStream ? "animate-pulse" : ""}`} />
            <span>{startingStream ? "Streaming..." : "Stream 10 Claims"}</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-700 flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Grid of 2 Insight Cards */}
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        {/* Parquet Data Lake */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800">Parquet Columnar Data Lake</span>
            <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-mono text-slate-600 border border-slate-200 shadow-2xs">
              Snappy Compressed
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            <MetricRow label="Lake Partitions" value={lakeInfo ? `${lakeInfo.rawPartitionsCount} partitions` : "Scanning..."} />
            <MetricRow label="Total Parquet Files" value={`${lakeInfo?.totalParquetFiles || 0} files`} highlight />
            <MetricRow label="Storage Size" value={lakeInfo?.sizeFormatted || "0 KB"} />
            <MetricRow label="Format Standard" value="Apache Parquet" />
          </div>
        </div>

        {/* Real-Time Telemetry */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800">Real-Time Ingestion Telemetry</span>
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-mono font-medium border ${
                streamStatus?.status === "RUNNING"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-white text-slate-600 border-slate-200"
              }`}
            >
              {streamStatus?.status || "ACTIVE"}
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            <MetricRow label="Total Streamed" value={`${streamStatus?.total_generated || 0} claims`} />
            <MetricRow label="Valid Pipeline Sinks" value={streamStatus?.valid_claims || 0} highlight />
            <MetricRow label="Validation Trapped" value={streamStatus?.invalid_claims || 0} />
            <MetricRow label="Ingress Engine" value="Next.js / Node.js Engine" />
          </div>
        </div>
      </div>
    </div>
  );
}
