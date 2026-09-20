"use client";

import React, { useEffect, useState } from "react";
import { X, Clock, ShieldAlert, CheckCircle, AlertTriangle, Building, Car, Activity, User, FileText } from "lucide-react";
import { Claim, ClaimEvent } from "@/lib/domain/types";
import { formatCurrency, formatDateTime, getStatusBadgeClass } from "@/lib/utils";

interface ClaimDetailModalProps {
  claim: Claim;
  onClose: () => void;
}

export function ClaimDetailModal({ claim, onClose }: ClaimDetailModalProps) {
  const [events, setEvents] = useState<ClaimEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch(`/api/claims/${claim.claim_id}`);
        const json = await res.json();
        if (json.success && json.data.events) {
          setEvents(json.data.events);
        }
      } catch (err) {
        console.error("Failed to load events:", err);
      } finally {
        setLoadingEvents(false);
      }
    }
    loadEvents();
  }, [claim.claim_id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="flex h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-200 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg font-bold text-zinc-100">{claim.claim_id}</span>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClass(claim.status)}`}>
              {claim.status}
            </span>
            <span className="rounded-md bg-zinc-800/80 px-2 py-0.5 text-[11px] font-mono text-zinc-400">
              {claim.claim_type}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Validation Warnings / Errors if any */}
          {claim.validation_errors && claim.validation_errors.length > 0 && (
            <div className="rounded-xl border border-rose-800/60 bg-rose-950/30 p-4">
              <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>Validation Failure Taxonomy</span>
              </div>
              <ul className="mt-2 space-y-1 text-xs text-rose-300 font-mono">
                {claim.validation_errors.map((err, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-rose-500">•</span>
                    <span>{err}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
              <span className="text-[11px] text-zinc-500 block">Claimed Amount</span>
              <span className="text-base font-bold text-zinc-100">{formatCurrency(claim.claimed_amount, claim.currency)}</span>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
              <span className="text-[11px] text-zinc-500 block">Incident Date</span>
              <span className="text-xs font-medium text-zinc-200">{formatDateTime(claim.incident_date)}</span>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
              <span className="text-[11px] text-zinc-500 block">Policy Reference</span>
              <span className="text-xs font-mono text-cyan-400">{claim.policy_id}</span>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
              <span className="text-[11px] text-zinc-500 block">Customer ID</span>
              <span className="text-xs font-mono text-zinc-300">{claim.customer_id}</span>
            </div>
          </div>

          {/* Description & Incident Geolocation */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Incident Narrative</span>
            <p className="text-sm text-zinc-200">{claim.description}</p>
            {claim.location && (
              <p className="text-xs text-zinc-400">
                Location: {claim.location.street}, {claim.location.city}, {claim.location.state} {claim.location.postal_code}
              </p>
            )}
          </div>

          {/* Polymorphic Claim Details */}
          {claim.claim_details.auto && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
              <div className="flex items-center gap-2 text-zinc-200 font-semibold text-xs uppercase tracking-wider">
                <Car className="h-4 w-4 text-cyan-400" />
                <span>Auto Claim Payload</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                <div>
                  <span className="text-zinc-500 block">Vehicle</span>
                  <span className="font-medium text-zinc-200">
                    {claim.claim_details.auto.vehicle_year} {claim.claim_details.auto.vehicle_make} {claim.claim_details.auto.vehicle_model}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">VIN</span>
                  <span className="font-mono text-zinc-300">{claim.claim_details.auto.vin}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">License Plate</span>
                  <span className="font-mono text-zinc-300">{claim.claim_details.auto.license_plate}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Estimated Repair Cost</span>
                  <span className="font-semibold text-zinc-200">{formatCurrency(claim.claim_details.auto.estimated_repair_cost)}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Drivable</span>
                  <span className={claim.claim_details.auto.drivable ? "text-emerald-400" : "text-amber-400"}>
                    {claim.claim_details.auto.drivable ? "Yes" : "No"}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Police Report</span>
                  <span className="text-zinc-300">
                    {claim.claim_details.auto.police_report_number || "None filed"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {claim.claim_details.health && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
              <div className="flex items-center gap-2 text-zinc-200 font-semibold text-xs uppercase tracking-wider">
                <Activity className="h-4 w-4 text-rose-400" />
                <span>Health Claim Payload</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                <div>
                  <span className="text-zinc-500 block">Diagnosis Codes (ICD-10)</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {claim.claim_details.health.diagnosis_codes.map((code) => (
                      <span key={code} className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[11px] text-zinc-200">
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-zinc-500 block">Procedure Codes (CPT)</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {claim.claim_details.health.procedure_codes.map((code) => (
                      <span key={code} className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[11px] text-zinc-200">
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-zinc-500 block">Facility ID</span>
                  <span className="font-mono text-zinc-300">{claim.claim_details.health.treatment_facility_id || "Unspecified"}</span>
                </div>
              </div>
            </div>
          )}

          {/* Involved Entities Network */}
          {claim.involved_entities && claim.involved_entities.length > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                Involved Parties & Network Connections
              </span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {claim.involved_entities.map((entity, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 rounded-lg border border-zinc-800/80 bg-zinc-950 p-2.5">
                    {entity.entity_type === "GARAGE" && <Building className="h-4 w-4 text-amber-400 shrink-0" />}
                    {entity.entity_type === "AGENT" && <User className="h-4 w-4 text-cyan-400 shrink-0" />}
                    {entity.entity_type === "HOSPITAL" && <Activity className="h-4 w-4 text-rose-400 shrink-0" />}
                    {entity.entity_type === "VEHICLE" && <Car className="h-4 w-4 text-emerald-400 shrink-0" />}
                    <div className="overflow-hidden">
                      <span className="text-[11px] font-semibold text-zinc-200 truncate block">
                        {entity.name || entity.entity_id}
                      </span>
                      <span className="text-[10px] text-zinc-500 block">
                        {entity.role} · {entity.entity_id}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lifecycle Audit Events Timeline */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-200 font-semibold text-xs uppercase tracking-wider">
                <Clock className="h-4 w-4 text-cyan-400" />
                <span>Lifecycle & Validation Audit Trail ({events.length} Events)</span>
              </div>
              <span className="text-[10px] text-zinc-500">MongoDB `claim_events` Collection</span>
            </div>

            {loadingEvents ? (
              <p className="text-xs text-zinc-500 italic py-2">Loading chronological event log...</p>
            ) : events.length === 0 ? (
              <p className="text-xs text-zinc-500 py-2">No event records found for this claim.</p>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-800">
                {events.map((evt, idx) => (
                  <div key={idx} className="relative">
                    {/* Timeline bullet */}
                    <div className="absolute -left-6 top-1 h-2.5 w-2.5 rounded-full border border-zinc-950 bg-cyan-400" />
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-zinc-200">{evt.event_type}</span>
                        {evt.to_status && (
                          <span className={`rounded px-1.5 py-0.2 text-[10px] font-medium border ${getStatusBadgeClass(evt.to_status)}`}>
                            {evt.to_status}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-zinc-500 font-mono mt-0.5 sm:mt-0">
                        {formatDateTime(evt.timestamp)}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-zinc-400">
                      <span className="text-zinc-500">Source: </span>
                      <span className="font-mono text-[11px] text-zinc-300">{evt.trigger_source}</span>
                      {evt.actor && (
                        <span className="text-zinc-500 ml-2">by {evt.actor}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-zinc-800 bg-zinc-950 px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
