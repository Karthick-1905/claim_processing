"use client";

import React, { useState } from "react";
import { Database, Network, RefreshCw, Plus, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

interface SystemStatusBarProps {
  mongoStatus: "CONNECTED" | "ERROR" | "DISCONNECTED";
  mongoCounts: { claims: number; policies: number; customers: number };
  neo4jStatus: "CONNECTED" | "DISCONNECTED";
  neo4jMessage: string;
  onNewClaimClick: () => void;
  onDataMutated: () => void;
}

export function SystemStatusBar({
  mongoStatus,
  mongoCounts,
  neo4jStatus,
  neo4jMessage,
  onNewClaimClick,
  onDataMutated,
}: SystemStatusBarProps) {
  const [seeding, setSeeding] = useState(false);
  const [seedNotice, setSeedNotice] = useState<string | null>(null);

  const handleSeed = async () => {
    setSeeding(true);
    setSeedNotice(null);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setSeedNotice("Master policies and sample claims initialized successfully.");
        onDataMutated();
      } else {
        setSeedNotice(`Error: ${json.error}`);
      }
    } catch (err) {
      setSeedNotice(`Seed failed: ${String(err)}`);
    } finally {
      setSeeding(false);
      setTimeout(() => setSeedNotice(null), 5000);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-6 py-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      <div className="max-w-7xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Brand & Project Identity */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white font-mono font-bold text-sm shadow-sm">
            CN
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold tracking-tight text-slate-900">
                ClaimNexus
              </h1>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 border border-slate-200">
                Big Data & Graph Engine
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Insurance Ingestion · Parquet Lake · Neo4j Aura · PySpark Analytics
            </p>
          </div>
        </div>

        {/* Status Indicators & Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* MongoDB Status */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-1.5 text-xs text-slate-700">
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  mongoStatus === "CONNECTED" ? "bg-emerald-400" : "bg-rose-400"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  mongoStatus === "CONNECTED" ? "bg-emerald-500" : "bg-rose-500"
                }`}
              />
            </span>
            <div className="flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-slate-500" />
              <span className="font-medium text-slate-800">Mongo:</span>
              <span className="font-mono text-slate-600 font-semibold">{mongoCounts.claims}</span>
              <span className="text-slate-400 text-[11px]">claims</span>
            </div>
          </div>

          {/* Neo4j Aura Status */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-1.5 text-xs text-slate-700">
            <span className="relative flex h-2 w-2">
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  neo4jStatus === "CONNECTED" ? "bg-teal-500" : "bg-amber-500"
                }`}
              />
            </span>
            <div className="flex items-center gap-1.5">
              <Network className="h-3.5 w-3.5 text-slate-500" />
              <span className="font-medium text-slate-800">Neo4j Aura:</span>
              <span
                className={`text-[11px] font-medium truncate max-w-[120px] ${
                  neo4jStatus === "CONNECTED" ? "text-teal-700" : "text-amber-700"
                }`}
                title={neo4jMessage}
              >
                {neo4jStatus === "CONNECTED" ? "Connected" : "Notice"}
              </span>
            </div>
          </div>

          {/* Seed Master Data Action */}
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition shadow-xs disabled:opacity-50"
            title="Initialize master customers, policies, and repair centers"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${seeding ? "animate-spin text-slate-800" : ""}`} />
            <span>{seeding ? "Seeding..." : "Seed Data"}</span>
          </button>

          {/* New Claim CTA */}
          <button
            onClick={onNewClaimClick}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition shadow-sm active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Claim</span>
          </button>
        </div>
      </div>

      {seedNotice && (
        <div className="max-w-7xl mx-auto mt-2.5 flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2 text-xs text-slate-700 border border-slate-200 animate-in fade-in duration-200">
          {seedNotice.startsWith("Error") ? (
            <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          )}
          <span>{seedNotice}</span>
        </div>
      )}
    </header>
  );
}
