"use client";

import React, { useState } from "react";
import { X, CheckCircle, AlertCircle, Send, Car, Activity } from "lucide-react";
import { ClaimType } from "@/lib/domain/types";

interface NewClaimModalProps {
  onClose: () => void;
  onClaimCreated: () => void;
}

export function NewClaimModal({ onClose, onClaimCreated }: NewClaimModalProps) {
  const [claimType, setClaimType] = useState<ClaimType>("AUTO");
  const [policyId, setPolicyId] = useState("POL-AUTO-88219");
  const [customerId, setCustomerId] = useState("CUST-1001");
  const [claimedAmount, setClaimedAmount] = useState<number>(4500);
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().slice(0, 16));
  const [description, setDescription] = useState("Front collision resulting in cracked bumper and radiator leak.");
  const [vin, setVin] = useState("1HGCR2F83HA019284");
  const [garageId, setGarageId] = useState("GAR-77401");

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    success: boolean;
    message: string;
    errors?: string[];
  } | null>(null);

  const handlePolicyPreset = (type: string) => {
    if (type === "VALID_AUTO_1") {
      setClaimType("AUTO");
      setPolicyId("POL-AUTO-88219");
      setCustomerId("CUST-1001");
      setVin("1HGCR2F83HA019284");
      setGarageId("GAR-77401");
      setDescription("Front impact collision with debris on highway. Bumper cracked.");
    } else if (type === "VALID_AUTO_2") {
      setClaimType("AUTO");
      setPolicyId("POL-AUTO-99304");
      setCustomerId("CUST-1002");
      setVin("4T1B11HK5JU109482");
      setGarageId("GAR-77401");
      setDescription("Rear bumper scrape during parallel parking maneuver.");
    } else if (type === "EXPIRED_POLICY") {
      setClaimType("AUTO");
      setPolicyId("POL-AUTO-EXPIRED");
      setCustomerId("CUST-1004");
      setVin("3FA6P0HD4ER209184");
      setGarageId("GAR-88102");
      setDescription("Parking lot scrape on vehicle right panel.");
    } else if (type === "VIN_MISMATCH") {
      setClaimType("AUTO");
      setPolicyId("POL-AUTO-88219");
      setCustomerId("CUST-1001");
      setVin("VIN_NOT_ON_POLICY_999");
      setDescription("Collision damage with unauthorized vehicle VIN.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    const payload = {
      policy_id: policyId,
      customer_id: customerId,
      claim_type: claimType,
      incident_date: new Date(incidentDate).toISOString(),
      claimed_amount: Number(claimedAmount),
      currency: "USD",
      description,
      location: {
        street: "100 Innovation Way",
        city: "Austin",
        state: "TX",
        postal_code: "78701",
      },
      involved_entities: [
        ...(garageId
          ? [
              {
                entity_type: "GARAGE",
                entity_id: garageId,
                role: "REPAIR_FACILITY",
                name: garageId === "GAR-77401" ? "Apex Auto Collision" : "Lonestar Body & Paint",
              },
            ]
          : []),
      ],
      claim_details: {
        auto:
          claimType === "AUTO"
            ? {
                vin,
                license_plate: "TX-TEST-01",
                vehicle_make: "Honda",
                vehicle_model: "Accord",
                vehicle_year: 2021,
                estimated_repair_cost: Number(claimedAmount),
                drivable: true,
                police_report_filed: false,
                repair_facility_id: garageId,
              }
            : undefined,
      },
    };

    try {
      const res = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({
          success: true,
          message: `Claim successfully created (${json.claim.claim_id})! Passed Tier 1-3 validation and lifecycle staging.`,
        });
        onClaimCreated();
      } else {
        setFeedback({
          success: false,
          message: json.message || "Claim validation failed.",
          errors: json.validation_errors || [json.error],
        });
        onClaimCreated();
      }
    } catch (err) {
      setFeedback({
        success: false,
        message: "Network error submitting claim",
        errors: [String(err)],
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="flex h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-zinc-100">Ingest New Claim</h2>
            <p className="text-xs text-zinc-400">
              Payload is evaluated live by the Multi-Tier Validation Engine
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Preset Buttons for Quick Testing */}
          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
              Quick Test Presets (Seeded Master Records)
            </label>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => handlePolicyPreset("VALID_AUTO_1")}
                className="rounded-lg border border-emerald-800/80 bg-emerald-950/40 px-2.5 py-1 text-emerald-300 hover:bg-emerald-900/50"
              >
                ✓ Valid Auto (Elena / Apex Garage)
              </button>
              <button
                type="button"
                onClick={() => handlePolicyPreset("VALID_AUTO_2")}
                className="rounded-lg border border-emerald-800/80 bg-emerald-950/40 px-2.5 py-1 text-emerald-300 hover:bg-emerald-900/50"
              >
                ✓ Valid Auto (Marcus / Apex Garage)
              </button>
              <button
                type="button"
                onClick={() => handlePolicyPreset("EXPIRED_POLICY")}
                className="rounded-lg border border-rose-800/80 bg-rose-950/40 px-2.5 py-1 text-rose-300 hover:bg-rose-900/50"
              >
                ✗ Test Expired Policy Error
              </button>
              <button
                type="button"
                onClick={() => handlePolicyPreset("VIN_MISMATCH")}
                className="rounded-lg border border-amber-800/80 bg-amber-950/40 px-2.5 py-1 text-amber-300 hover:bg-amber-900/50"
              >
                ✗ Test VIN Mismatch Error
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1">Claim Type</label>
              <select
                value={claimType}
                onChange={(e) => setClaimType(e.target.value as ClaimType)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="AUTO">AUTO (Automobile Collision)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1">Claimed Amount (USD)</label>
              <input
                type="number"
                value={claimedAmount}
                onChange={(e) => setClaimedAmount(Number(e.target.value))}
                required
                min={1}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1">Policy ID</label>
              <input
                type="text"
                value={policyId}
                onChange={(e) => setPolicyId(e.target.value)}
                required
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1">Customer ID</label>
              <input
                type="text"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                required
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1">Vehicle VIN</label>
              <input
                type="text"
                value={vin}
                onChange={(e) => setVin(e.target.value)}
                required
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1">Repair Facility / Garage ID</label>
              <input
                type="text"
                value={garageId}
                onChange={(e) => setGarageId(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1">Incident Date & Time</label>
            <input
              type="datetime-local"
              value={incidentDate}
              onChange={(e) => setIncidentDate(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1">Incident Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Feedback Area */}
          {feedback && (
            <div
              className={`rounded-xl border p-4 ${
                feedback.success
                  ? "border-emerald-800/80 bg-emerald-950/40 text-emerald-200"
                  : "border-rose-800/80 bg-rose-950/40 text-rose-200"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-xs">
                {feedback.success ? (
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-rose-400" />
                )}
                <span>{feedback.message}</span>
              </div>
              {feedback.errors && feedback.errors.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs font-mono text-rose-300">
                  {feedback.errors.map((err, idx) => (
                    <li key={idx}>• {err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{submitting ? "Processing..." : "Submit Claim for Ingestion"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
