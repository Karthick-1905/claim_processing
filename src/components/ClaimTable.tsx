"use client";

import React, { useState } from "react";
import { Search, Eye, Filter, Car, Activity, Home, AlertCircle } from "lucide-react";
import { Claim } from "@/lib/domain/types";
import { formatCurrency, formatDateTime, getStatusBadgeClass, getGraphBadgeClass } from "@/lib/utils";

interface ClaimTableProps {
  claims: Claim[];
  onSelectClaim: (claim: Claim) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  typeFilter: string;
  onTypeFilterChange: (type: string) => void;
}

export function ClaimTable({
  claims,
  onSelectClaim,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
}: ClaimTableProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredClaims = claims.filter((claim) => {
    const matchesSearch =
      claim.claim_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.customer_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.policy_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || claim.status === statusFilter;
    const matchesType = typeFilter === "ALL" || claim.claim_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 shadow-sm overflow-hidden">
      {/* Search & Filter Header */}
      <div className="flex flex-col gap-3 border-b border-zinc-800 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search claim ID, policy, customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Filter className="h-3.5 w-3.5 text-zinc-500" />
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="READY_FOR_ANALYSIS">Ready for Analysis</option>
            <option value="VALIDATED">Validated</option>
            <option value="INVALID">Invalid</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="INVESTIGATION_CANDIDATE">Investigation Candidate</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Types</option>
            <option value="AUTO">Auto</option>
            <option value="HEALTH">Health</option>
            <option value="PROPERTY">Property</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-zinc-300">
          <thead className="border-b border-zinc-800 bg-zinc-950/80 text-[11px] uppercase tracking-wider text-zinc-400">
            <tr>
              <th className="px-4 py-3">Claim ID</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Customer & Policy</th>
              <th className="px-4 py-3">Incident Date</th>
              <th className="px-4 py-3">Claimed Amount</th>
              <th className="px-4 py-3">Lifecycle Status</th>
              <th className="px-4 py-3">Graph Sync</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 font-normal">
            {filteredClaims.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <AlertCircle className="h-5 w-5 text-zinc-600" />
                    <span>No claims match the filter criteria.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredClaims.map((claim) => (
                <tr
                  key={claim.claim_id}
                  className="hover:bg-zinc-800/30 transition cursor-pointer"
                  onClick={() => onSelectClaim(claim)}
                >
                  <td className="px-4 py-3 font-mono font-medium text-cyan-400">
                    {claim.claim_id}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-zinc-300">
                      {claim.claim_type === "AUTO" && <Car className="h-3.5 w-3.5 text-zinc-400" />}
                      {claim.claim_type === "HEALTH" && <Activity className="h-3.5 w-3.5 text-zinc-400" />}
                      {claim.claim_type === "PROPERTY" && <Home className="h-3.5 w-3.5 text-zinc-400" />}
                      <span>{claim.claim_type}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-mono text-zinc-200">{claim.customer_id}</span>
                      <span className="font-mono text-[10px] text-zinc-500">{claim.policy_id}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {formatDateTime(claim.incident_date)}
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-100">
                    {formatCurrency(claim.claimed_amount, claim.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getStatusBadgeClass(claim.status)}`}>
                      {claim.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-mono text-[11px] font-medium ${getGraphBadgeClass(claim.graph_sync_status)}`}>
                      {claim.graph_sync_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectClaim(claim);
                      }}
                      className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 text-[11px] font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition"
                    >
                      <Eye className="h-3 w-3" />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
