"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { SystemStatusBar } from "./SystemStatusBar";
import { ClaimMetrics } from "./ClaimMetrics";
import { DataLakePanel } from "./DataLakePanel";
import { ClaimTable } from "./ClaimTable";
import { ClaimDetailModal } from "./ClaimDetailModal";
import { NewClaimModal } from "./NewClaimModal";
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
  const [claims] = useState<Claim[]>(initialClaims);
  const [summary] = useState(initialSummary);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const handleDataMutated = () => {
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
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
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* KPI Metrics */}
        <ClaimMetrics summary={summary} />

        {/* Big Data Lake & PySpark Analytics Panel */}
        <DataLakePanel onDataMutated={handleDataMutated} />

        {/* Claims Table View */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Operational Claim Ingestion & Staging Pipeline
            </h2>
            <span className="text-xs text-zinc-500">
              Showing {claims.length} claims directly from MongoDB
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
