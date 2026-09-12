"use client";

import { reasonLabel } from "@/lib/support";

interface Props {
  intentLabel: string;
  confidence: number;
  escalate: boolean;
  reasons: string[];
}

function prettyIntent(label: string): string {
  return label
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function ResultSummary({ intentLabel, confidence, escalate, reasons }: Props) {
  const pct = Math.round(confidence * 100);
  const card =
    "rounded-2xl border border-[#e8e8ed] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]";
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" role="group" aria-label="Analysis summary">
      <div className={card}>
        <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[#6e6e73]">Intent</p>
        <p className="mt-1.5 text-[21px] font-semibold tracking-[-0.01em]">{prettyIntent(intentLabel)}</p>
      </div>
      <div className={card}>
        <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[#6e6e73]">Confidence</p>
        <p className="mt-1.5 text-[21px] font-semibold tabular-nums tracking-[-0.01em]">{pct}%</p>
      </div>
      <div
        className={
          escalate
            ? "rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]"
            : card
        }
        role={escalate ? "alert" : undefined}
      >
        <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[#6e6e73]">
          Human escalation
        </p>
        {escalate ? (
          <>
            <p className="mt-1.5 text-[17px] font-semibold leading-snug text-amber-900">
              Human support recommended
            </p>
            <p className="mt-1 text-sm leading-relaxed text-amber-800">
              Reason: {reasons.length > 0 ? reasons.map(reasonLabel).join("; ") : "Flagged by support policy."}
            </p>
          </>
        ) : (
          <p className="mt-1.5 text-[21px] font-semibold tracking-[-0.01em]">No escalation</p>
        )}
      </div>
    </div>
  );
}
