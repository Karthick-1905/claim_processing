"use client";

import React, { useState } from "react";
import { Database, Network, RefreshCw, PlusCircle, CheckCircle2, AlertCircle } from "lucide-react";

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
        setSeedNotice("Master data & seed claims initialized in MongoDB!");
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
    <header className="border-b border-zinc-800 bg-zinc-950 px-6 py-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-zinc-100">
              Claim Processing & Fraud Investigation Platform
            </h1>
            <span className="rounded-full bg-cyan-950/80 px-2.5 py-0.5 text-xs font-semibold text-cyan-400 border border-cyan-800/60">
              Phase 1 Foundation
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            MongoDB Operational Store · Neo4j Aura Graph · Clean Data Pipeline
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* MongoDB Status Badge */}
          <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/90 px-3 py-1.5 text-xs">
            <Database className="h-4 w-4 text-emerald-400" />
            <div className="flex flex-col">
              <span className="font-semibold text-zinc-200">
                MongoDB:{" "}
                <span
                  className={
                    mongoStatus === "CONNECTED"
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }
                >
                  {mongoStatus}
                </span>
              </span>
              <span className="text-[10px] text-zinc-400">
                {mongoCounts.claims} claims · {mongoCounts.policies} policies · {mongoCounts.customers} cust
              </span>
            </div>
          </div>

          {/* Neo4j Aura Status Badge */}
          <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/90 px-3 py-1.5 text-xs">
            <Network className="h-4 w-4 text-cyan-400" />
            <div className="flex flex-col">
              <span className="font-semibold text-zinc-200">
                Neo4j Aura:{" "}
                <span
                  className={
                    neo4jStatus === "CONNECTED"
                      ? "text-cyan-400"
                      : "text-amber-400"
                  }
                >
                  {neo4jStatus}
                </span>
              </span>
              <span className="text-[10px] text-zinc-400 truncate max-w-[170px]" title={neo4jMessage}>
                {neo4jMessage}
              </span>
            </div>
          </div>

          {/* Seed Master Data Button */}
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-700 hover:text-white transition disabled:opacity-50"
            title="Seed verified policies, customers, and claims into MongoDB"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${seeding ? "animate-spin text-cyan-400" : ""}`} />
            <span>{seeding ? "Seeding..." : "Seed Master Data"}</span>
          </button>

          {/* New Claim Button */}
          <button
            onClick={onNewClaimClick}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 shadow-sm transition"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Ingest Claim</span>
          </button>
        </div>
      </div>

      {seedNotice && (
        <div className="mt-3 flex items-center gap-2 rounded-md bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 border border-zinc-700">
          {seedNotice.startsWith("Error") ? (
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          )}
          <span>{seedNotice}</span>
        </div>
      )}
    </header>
  );
}
