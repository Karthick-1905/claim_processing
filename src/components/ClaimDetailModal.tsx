"use client";

import React, { useEffect, useState } from "react";
import { X, Clock, AlertTriangle, Building, Car, Activity, User } from "lucide-react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
      <div className="flex h-[88vh] w-full max-w-3xl flex-col rounded-3xl border border-slate-200 bg-white text-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-base font-bold text-slate-900">{claim.claim_id}</span>
            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${getStatusBadgeClass(claim.status)}`}>
              {claim.status}
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-mono text-slate-600">
              {claim.claim_type}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Validation Warnings / Errors */}
          {claim.validation_errors && claim.validation_errors.length > 0 && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
              <div className="flex items-center gap-2 text-rose-800 font-semibold text-xs">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                <span>Validation Failure Rules</span>
              </div>
              <ul className="mt-2 space-y-1 text-xs text-rose-700 font-mono">
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
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3">
              <span className="text-[11px] text-slate-500 block">Claimed Amount</span>
              <span className="text-sm font-bold font-mono text-slate-900">{formatCurrency(claim.claimed_amount, claim.currency)}</span>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3">
              <span className="text-[11px] text-slate-500 block">Incident Date</span>
              <span className="text-xs font-medium text-slate-700">{formatDateTime(claim.incident_date)}</span>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3">
              <span className="text-[11px] text-slate-500 block">Policy Reference</span>
              <span className="text-xs font-mono font-medium text-slate-800">{claim.policy_id}</span>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3">
              <span className="text-[11px] text-slate-500 block">Customer ID</span>
              <span className="text-xs font-mono font-medium text-slate-800">{claim.customer_id}</span>
            </div>
          </div>

          {/* Incident Narrative */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-1.5">
            <span className="text-xs font-semibold text-slate-700 block">Incident Narrative</span>
            <p className="text-xs text-slate-700 leading-relaxed">{claim.description}</p>
            {claim.location && (
              <p className="text-[11px] text-slate-500 pt-1">
                Location: {claim.location.street}, {claim.location.city}, {claim.location.state} {claim.location.postal_code}
              </p>
            )}
          </div>

          {/* Auto Claim Details */}
          {claim.claim_details.auto && (
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-3">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs">
                <Car className="h-4 w-4 text-slate-600" />
                <span>Automobile Details</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                <div>
                  <span className="text-slate-500 text-[11px] block">Vehicle</span>
                  <span className="font-medium text-slate-800">
                    {claim.claim_details.auto.vehicle_year} {claim.claim_details.auto.vehicle_make} {claim.claim_details.auto.vehicle_model}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">VIN</span>
                  <span className="font-mono text-slate-700">{claim.claim_details.auto.vin}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">License Plate</span>
                  <span className="font-mono text-slate-700">{claim.claim_details.auto.license_plate}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">Estimated Repair</span>
                  <span className="font-semibold text-slate-800 font-mono">{formatCurrency(claim.claim_details.auto.estimated_repair_cost)}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">Drivable</span>
                  <span className={claim.claim_details.auto.drivable ? "text-emerald-700 font-medium" : "text-amber-700 font-medium"}>
                    {claim.claim_details.auto.drivable ? "Yes" : "No"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">Police Report</span>
                  <span className="text-slate-700">
                    {claim.claim_details.auto.police_report_number || "None filed"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Health Claim Details */}
          {claim.claim_details.health && (
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-3">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs">
                <Activity className="h-4 w-4 text-rose-600" />
                <span>Health Claim Details</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                <div>
                  <span className="text-slate-500 text-[11px] block">Diagnosis (ICD-10)</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {claim.claim_details.health.diagnosis_codes.map((code) => (
                      <span key={code} className="rounded bg-white border border-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">Procedures (CPT)</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {claim.claim_details.health.procedure_codes.map((code) => (
                      <span key={code} className="rounded bg-white border border-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Involved Parties */}
          {claim.involved_entities && claim.involved_entities.length > 0 && (
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-2.5">
              <span className="text-xs font-semibold text-slate-700 block">
                Involved Parties & Entities
              </span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {claim.involved_entities.map((entity, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs">
                    {entity.entity_type === "GARAGE" && <Building className="h-3.5 w-3.5 text-amber-600 shrink-0" />}
                    {entity.entity_type === "AGENT" && <User className="h-3.5 w-3.5 text-teal-600 shrink-0" />}
                    {entity.entity_type === "HOSPITAL" && <Activity className="h-3.5 w-3.5 text-rose-600 shrink-0" />}
                    {entity.entity_type === "VEHICLE" && <Car className="h-3.5 w-3.5 text-slate-600 shrink-0" />}
                    <div className="overflow-hidden">
                      <span className="text-[11px] font-medium text-slate-800 truncate block">
                        {entity.name || entity.entity_id}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono truncate">
                        {entity.role} · {entity.entity_id}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lifecycle Timeline */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs">
                <Clock className="h-4 w-4 text-slate-600" />
                <span>Audit & Lifecycle Timeline ({events.length} Events)</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">MongoDB claim_events</span>
            </div>

            {loadingEvents ? (
              <p className="text-xs text-slate-400 italic py-2">Loading event history...</p>
            ) : events.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">No event records found.</p>
            ) : (
              <div className="relative pl-5 space-y-3.5 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {events.map((evt, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-5 top-1 h-2 w-2 rounded-full bg-slate-400" />
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-800">{evt.event_type}</span>
                        {evt.to_status && (
                          <span className={`rounded-full px-2 py-0.2 text-[10px] font-medium border ${getStatusBadgeClass(evt.to_status)}`}>
                            {evt.to_status}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {formatDateTime(evt.timestamp)}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500">
                      <span>Source: {evt.trigger_source}</span>
                      {evt.actor && <span className="ml-2">({evt.actor})</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
