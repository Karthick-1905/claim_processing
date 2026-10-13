"use client";

import React from "react";
import { FileText, CheckCircle2, ShieldAlert, AlertOctagon } from "lucide-react";

interface ClaimMetricsProps {
  summary: {
    total: number;
    validated: number;
    flagged?: number;
    underReview?: number;
    invalid: number;
  };
}

export function ClaimMetrics({ summary }: ClaimMetricsProps) {
  const flaggedCount = summary.flagged !== undefined ? summary.flagged : (summary.underReview || 0);

  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
      {/* Total Ingested */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] transition-all hover:border-slate-300">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Total Ingested</span>
          <span className="rounded-xl bg-slate-100 p-2 text-slate-600">
            <FileText className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-3">
          <span className="text-2xl font-bold font-mono tracking-tight text-slate-900">
            {summary.total}
          </span>
          <p className="text-[11px] text-slate-500 mt-0.5">MongoDB operational records</p>
        </div>
      </div>

      {/* Validated Claims */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] transition-all hover:border-slate-300">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Validated Clean</span>
          <span className="rounded-xl bg-emerald-50 p-2 text-emerald-600 border border-emerald-100">
            <CheckCircle2 className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-3">
          <span className="text-2xl font-bold font-mono tracking-tight text-emerald-700">
            {summary.validated}
          </span>
          <p className="text-[11px] text-slate-500 mt-0.5">Passed all policy checks</p>
        </div>
      </div>

      {/* Flagged Collusion Rings */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] transition-all hover:border-slate-300">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Flagged Fraud Rings</span>
          <span className="rounded-xl bg-rose-50 p-2 text-rose-600 border border-rose-100">
            <ShieldAlert className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-3">
          <span className="text-2xl font-bold font-mono tracking-tight text-rose-700">
            {flaggedCount}
          </span>
          <p className="text-[11px] text-slate-500 mt-0.5">Multi-party collusion candidates</p>
        </div>
      </div>

      {/* Validation Failures */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] transition-all hover:border-slate-300">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Validation Failures</span>
          <span className="rounded-xl bg-slate-100 p-2 text-slate-600 border border-slate-200">
            <AlertOctagon className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-3">
          <span className="text-2xl font-bold font-mono tracking-tight text-slate-700">
            {summary.invalid}
          </span>
          <p className="text-[11px] text-slate-500 mt-0.5">Trapped by temporal & limit rules</p>
        </div>
      </div>
    </div>
  );
}
