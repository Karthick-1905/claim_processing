"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, Network, Table } from "lucide-react";
import { SystemStatusBar } from "./SystemStatusBar";
import { ClaimMetrics } from "./ClaimMetrics";
import { DataLakePanel } from "./DataLakePanel";
import { ClaimTable } from "./ClaimTable";
import { ClaimDetailModal } from "./ClaimDetailModal";
import { NewClaimModal } from "./NewClaimModal";
import { FraudGraphExplorer } from "./graph/FraudGraphExplorer";
import { Claim } from "@/lib/domain/types";

interface ClaimsDashboardProps {
  initialClaims: Claim[];
  initialSummary: {
    total: number;
    validated: number;
    readyForAnalysis: number;
    underReview: number;
    investigationCandidate: number;
    invalid: number;
  };
  initialMongoStatus: "CONNECTED" | "ERROR" | "DISCONNECTED";
  initialMongoCounts: { claims: number; policies: number; customers: number };
  initialNeo4jStatus: "CONNECTED" | "DISCONNECTED";
  initialNeo4jMessage: string;
}

export function ClaimsDashboard({
  initialClaims,
  initialSummary,
  initialMongoStatus,
  initialMongoCounts,
  initialNeo4jStatus,
  initialNeo4jMessage,
}: ClaimsDashboardProps) {
  const router = useRouter();
  const [activeView, setActiveView] = useState<"LEDGER" | "GRAPH">("GRAPH");
  const [claims] = useState<Claim[]>(initialClaims);
  const [summary] = useState(initialSummary);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const handleDataMutated = () => {
    router.refresh();
  };

  const handleSelectClaimById = (claimId: string) => {
    const found = claims.find((c) => c.claim_id === claimId);
    if (found) {
      setSelectedClaim(found);
    } else {
      // Fetch directly if not in initial list
      fetch(`/api/claims/${claimId}`)
        .then((r) => r.json())
        .then((json) => {
          if (json.success && json.data.claim) {
            setSelectedClaim(json.data.claim);
          }
        })
        .catch(console.error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 flex flex-col font-sans antialiased selection:bg-slate-900 selection:text-white">
      {/* System Status Navigation Bar */}
      <SystemStatusBar
        mongoStatus={initialMongoStatus}
        mongoCounts={initialMongoCounts}
        neo4jStatus={initialNeo4jStatus}
        neo4jMessage={initialNeo4jMessage}
        onNewClaimClick={() => setIsNewModalOpen(true)}
        onDataMutated={handleDataMutated}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:px-6 space-y-5">
        {/* View Mode Switcher Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveView("GRAPH")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                activeView === "GRAPH"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Network className="h-3.5 w-3.5" />
              <span>Fraud Graph & Collusion Rings</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                  activeView === "GRAPH" ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-600"
                }`}
              >
                Neo4j Web
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView("LEDGER")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                activeView === "LEDGER"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Table className="h-3.5 w-3.5" />
              <span>Claims Ledger & Data Lake</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                  activeView === "LEDGER" ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"
                }`}
              >
                {claims.length}
              </span>
            </button>
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Operational Mode:</span>
            <span className="font-semibold text-slate-800 font-mono">
              {activeView === "GRAPH" ? "Neo4j Bloom Force Simulation" : "MongoDB Operational Ledger"}
            </span>
          </div>
        </div>

        {/* View 1: Interactive Neo4j Fraud Graph & How We Found Them */}
        {activeView === "GRAPH" && (
          <FraudGraphExplorer onSelectClaim={handleSelectClaimById} />
        )}

        {/* View 2: Claims Ledger, KPIs & Data Lake Panel */}
        {activeView === "LEDGER" && (
          <div className="space-y-5 animate-in fade-in duration-150">
            {/* KPI Metrics */}
            <ClaimMetrics summary={summary} />

            {/* Big Data Lake & PySpark Analytics Panel */}
            <DataLakePanel onDataMutated={handleDataMutated} />

            {/* Claims Table View */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Operational Claims Ledger
                </h2>
                <span className="text-xs text-slate-400 font-mono">
                  {claims.length} records in MongoDB
                </span>
              </div>

              <ClaimTable
                claims={claims}
                onSelectClaim={(claim) => setSelectedClaim(claim)}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                typeFilter={typeFilter}
                onTypeFilterChange={setTypeFilter}
              />
            </div>
          </div>
        )}
      </main>

      {/* Claim Inspection Modal */}
      {selectedClaim && (
        <ClaimDetailModal
          claim={selectedClaim}
          onClose={() => setSelectedClaim(null)}
        />
      )}

      {/* New Claim Ingestion Modal */}
      {isNewModalOpen && (
        <NewClaimModal
          onClose={() => setIsNewModalOpen(false)}
          onClaimCreated={() => {
            handleDataMutated();
          }}
        />
      )}
    </div>
  );
}
