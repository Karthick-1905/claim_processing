"use client";

import React from "react";
import { FileText, CheckCircle, ShieldAlert, XCircle } from "lucide-react";

interface ClaimMetricsProps {
  summary: {
    total: number;
    validated: number;
    readyForAnalysis: number;
    underReview: number;
    investigationCandidate: number;
    invalid: number;
  };
}

export function ClaimMetrics({ summary }: ClaimMetricsProps) {
  const readyCount = summary.validated + summary.readyForAnalysis;
  const reviewCount = summary.underReview + summary.investigationCandidate;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {/* Total Claims Card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400">Total Ingested</span>
          <span className="rounded-md bg-zinc-800 p-1.5 text-zinc-400">
            <FileText className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-3">
          <span className="text-2xl font-bold text-zinc-100">{summary.total}</span>
          <p className="text-[11px] text-zinc-500 mt-0.5">Claims registered in MongoDB</p>
        </div>
      </div>

      {/* Validated / Staged for Big Data */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400">Ready for Analysis</span>
          <span className="rounded-md bg-emerald-950/70 p-1.5 text-emerald-400 border border-emerald-900/50">
            <CheckCircle className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-3">
          <span className="text-2xl font-bold text-emerald-400">{readyCount}</span>
          <p className="text-[11px] text-zinc-500 mt-0.5">Normalized & staged for PySpark/Graph</p>
        </div>
      </div>

      {/* Investigation Candidates */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400">Investigation Candidates</span>
          <span className="rounded-md bg-amber-950/70 p-1.5 text-amber-400 border border-amber-900/50">
            <ShieldAlert className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-3">
          <span className="text-2xl font-bold text-amber-400">{reviewCount}</span>
          <p className="text-[11px] text-zinc-500 mt-0.5">Suspicious multi-party patterns flagged</p>
        </div>
      </div>

      {/* Invalid Records */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400">Validation Failures</span>
          <span className="rounded-md bg-rose-950/70 p-1.5 text-rose-400 border border-rose-900/50">
            <XCircle className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-3">
          <span className="text-2xl font-bold text-rose-400">{summary.invalid}</span>
          <p className="text-[11px] text-zinc-500 mt-0.5">Trapped by Tier 1-3 validation rules</p>
        </div>
      </div>
    </div>
  );
}
