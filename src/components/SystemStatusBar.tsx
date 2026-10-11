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
            CP
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold tracking-tight text-slate-900">
                Claim Processing
              </h1>
            </div>
            <p className="text-xs text-slate-500">
              Multi-Party Fraud Detection in Insurance Claim Processing
            </p>
          </div>
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
