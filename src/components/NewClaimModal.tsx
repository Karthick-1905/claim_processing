"use client";

import React, { useState } from "react";
import { X, CheckCircle2, AlertCircle, Send, FileCode2, Edit3, Sparkles } from "lucide-react";
import { ClaimType } from "@/lib/domain/types";
import { SAMPLE_ACORD_XML } from "@/lib/services/xml-parser-service";

interface NewClaimModalProps {
  onClose: () => void;
  onClaimCreated: () => void;
}

const SAMPLE_HEALTH_XML = `<?xml version="1.0" encoding="UTF-8"?>
<InsuranceClaim xmlns="http://www.hl7.org/claim">
  <TransactionId>XML-TX-HLTH-7721</TransactionId>
  <PolicyRef>POL-HEALTH-301</PolicyRef>
  <InsuredRef>CUST-HLTH-88</InsuredRef>
  <LossType>HEALTH</LossType>
  <LossDate>2026-03-24</LossDate>
  <NoticeAt>2026-03-25</NoticeAt>
  <TotalLossAmount>6400.00</TotalLossAmount>
  <Currency>USD</Currency>
  <LossNarrative>Emergency room admission following sudden acute trauma.</LossNarrative>
  <FacilityId>HOSP-STDAVIDS-01</FacilityId>
  <FacilityName>St. David's Medical Center</FacilityName>
  <ProducerId>AGENT-AUSTIN-LIFE</ProducerId>
  <ProducerName>Austin Life and Health Brokers</ProducerName>
  <IncidentLocation>919 E 32nd St</IncidentLocation>
  <IncidentCity>Austin</IncidentCity>
  <IncidentState>TX</IncidentState>
  <InsuredZip>78705</InsuredZip>
  <HealthDetails>
    <DiagnosisCodes>S13.4XXA, M54.2</DiagnosisCodes>
    <ProcedureCodes>99284, 72040, 72125</ProcedureCodes>
  </HealthDetails>
</InsuranceClaim>`;

export function NewClaimModal({ onClose, onClaimCreated }: NewClaimModalProps) {
  const [activeTab, setActiveTab] = useState<"FORM" | "XML">("FORM");

  // Form State
  const [claimType, setClaimType] = useState<ClaimType>("AUTO");
  const [policyId, setPolicyId] = useState("POL-AUTO-88219");
  const [customerId, setCustomerId] = useState("CUST-1001");
  const [claimedAmount, setClaimedAmount] = useState<number>(4500);
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().slice(0, 16));
  const [description, setDescription] = useState("Front collision resulting in cracked bumper and radiator leak.");
  const [vin, setVin] = useState("1HGCR2F83HA019284");
  const [garageId, setGarageId] = useState("GAR-77401");

  // XML State
  const [xmlContent, setXmlContent] = useState<string>(SAMPLE_ACORD_XML);

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

  const handleFormSubmit = async (e: React.FormEvent) => {
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
          message: `Claim successfully ingested (${json.claim.claim_id}). Normalized and stored in MongoDB & Lake.`,
        });
        onClaimCreated();
      } else {
        setFeedback({
          success: false,
          message: json.message || "Validation failed.",
          errors: json.validation_errors || [json.error],
        });
        onClaimCreated();
      }
    } catch (err) {
      setFeedback({
        success: false,
        message: "Submission error",
        errors: [String(err)],
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleXmlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/claims/xml", {
        method: "POST",
        headers: { "Content-Type": "application/xml" },
        body: xmlContent,
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({
          success: true,
          message: `ACORD XML integration successful: ${json.successful_ingestions} claim(s) parsed & stored in Lake.`,
        });
        onClaimCreated();
      } else {
        const errorList = json.errors ? json.errors.map((e: { error: string }) => e.error) : [json.error];
        setFeedback({
          success: false,
          message: json.error || "XML validation failure.",
          errors: errorList,
        });
        onClaimCreated();
      }
    } catch (err) {
      setFeedback({
        success: false,
        message: "XML integration failed",
        errors: [String(err)],
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
      <div className="flex h-[88vh] w-full max-w-2xl flex-col rounded-3xl border border-slate-200 bg-white text-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Ingest Insurance Claim</h2>
            <p className="text-xs text-slate-500">
              Evaluated by multi-tier rules, MongoDB operational store & Parquet Lake
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-slate-100 bg-slate-50/70 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab("FORM")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === "FORM"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>Interactive Form</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("XML")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === "XML"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileCode2 className="h-3.5 w-3.5" />
            <span>ACORD & Enterprise XML</span>
          </button>
        </div>

        {/* Tab 1: Form Body */}
        {activeTab === "FORM" && (
          <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto px-6 py-4.5 space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Quick Test Presets
              </label>
              <div className="flex flex-wrap gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => handlePolicyPreset("VALID_AUTO_1")}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-800 hover:bg-emerald-100 transition"
                >
                  ✓ Valid Auto (Elena / Apex Garage)
                </button>
                <button
                  type="button"
                  onClick={() => handlePolicyPreset("VALID_AUTO_2")}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-800 hover:bg-emerald-100 transition"
                >
                  ✓ Valid Auto (Marcus / Apex Garage)
                </button>
                <button
                  type="button"
                  onClick={() => handlePolicyPreset("EXPIRED_POLICY")}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-rose-800 hover:bg-rose-100 transition"
                >
                  ✗ Expired Policy Test
                </button>
                <button
                  type="button"
                  onClick={() => handlePolicyPreset("VIN_MISMATCH")}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-800 hover:bg-amber-100 transition"
                >
                  ✗ VIN Mismatch Test
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Claim Type</label>
                <select
                  value={claimType}
                  onChange={(e) => setClaimType(e.target.value as ClaimType)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-slate-400"
                >
                  <option value="AUTO">AUTO (Automobile Collision)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Claimed Amount (USD)</label>
                <input
                  type="number"
                  value={claimedAmount}
                  onChange={(e) => setClaimedAmount(Number(e.target.value))}
                  required
                  min={1}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-slate-400 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Policy ID</label>
                <input
                  type="text"
                  value={policyId}
                  onChange={(e) => setPolicyId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-slate-400 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Customer ID</label>
                <input
                  type="text"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-slate-400 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Vehicle VIN</label>
                <input
                  type="text"
                  value={vin}
                  onChange={(e) => setVin(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-slate-400 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Repair Center ID</label>
                <input
                  type="text"
                  value={garageId}
                  onChange={(e) => setGarageId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-slate-400 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Incident Date & Time</label>
              <input
                type="datetime-local"
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-slate-400 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Incident Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-slate-400"
              />
            </div>

            {feedback && <FeedbackCard feedback={feedback} />}

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 transition shadow-sm disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{submitting ? "Ingesting..." : "Submit Claim"}</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: ACORD & Enterprise XML Editor */}
        {activeTab === "XML" && (
          <form onSubmit={handleXmlSubmit} className="flex-1 flex flex-col justify-between overflow-y-auto px-6 py-4.5 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  XML Feed Envelope
                </label>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setXmlContent(SAMPLE_ACORD_XML)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-50 transition text-[11px]"
                  >
                    <Sparkles className="h-3 w-3 text-teal-600" />
                    <span>ACORD Auto XML</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setXmlContent(SAMPLE_HEALTH_XML)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-50 transition text-[11px]"
                  >
                    <Sparkles className="h-3 w-3 text-purple-600" />
                    <span>Health XML</span>
                  </button>
                </div>
              </div>

              <textarea
                rows={11}
                value={xmlContent}
                onChange={(e) => setXmlContent(e.target.value)}
                required
                className="w-full font-mono text-xs rounded-2xl border border-slate-200 bg-slate-900 p-3.5 text-emerald-300 focus:outline-none focus:border-slate-400 shadow-inner"
              />
              <p className="text-[11px] text-slate-500 mt-1.5">
                The XML Parser service normalizes ACORD tags, extracts graph entities, and sinks records into Parquet.
              </p>
            </div>

            {feedback && <FeedbackCard feedback={feedback} />}

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 transition shadow-sm disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{submitting ? "Integrating XML..." : "Ingest XML"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function FeedbackCard({
  feedback,
}: {
  feedback: { success: boolean; message: string; errors?: string[] };
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        feedback.success
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-rose-200 bg-rose-50 text-rose-900"
      }`}
    >
      <div className="flex items-center gap-2 font-semibold text-xs">
        {feedback.success ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        ) : (
          <AlertCircle className="h-4 w-4 text-rose-600" />
        )}
        <span>{feedback.message}</span>
      </div>
      {feedback.errors && feedback.errors.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs font-mono text-rose-700">
          {feedback.errors.map((err, idx) => (
            <li key={idx}>• {err}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
