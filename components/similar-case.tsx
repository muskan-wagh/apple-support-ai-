"use client";

import type { SupportExample } from "@/lib/types";

function clip(text: string, n: number): string {
  const one = text.replace(/\s+/g, " ").trim();
  return one.length > n ? `${one.slice(0, n)}…` : one;
}

export default function SimilarCases({ cases }: { cases: SupportExample[] }) {
  return (
    <section aria-labelledby="similar-heading">
      <h2 id="similar-heading" className="mb-1 text-[21px] font-semibold tracking-[-0.01em]">
        Similar historical cases
      </h2>
      {cases.length === 0 ? (
        <p className="mt-2 text-[15px] text-[#6e6e73]">
          No similar historical cases were found for this message.
        </p>
      ) : (
        <ol className="mt-3 space-y-3">
          {cases.map((c, i) => (
            <li
              key={c.exampleId}
              className="rounded-2xl border border-[#e8e8ed] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]"
            >
              <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.1em] text-[#6e6e73]">
                Case {i + 1}
              </p>
              <div className="space-y-2.5 text-[15px] leading-relaxed">
                <p>
                  <span className="font-semibold">Customer: </span>
                  {clip(c.customerMessage, 400)}
                </p>
                <p className="text-[#515154]">
                  <span className="font-semibold text-[#1d1d1f]">Apple Support: </span>
                  {clip(c.supportResponse, 400)}
                </p>
              </div>
              <p className="mt-3 text-[13px] tabular-nums text-[#6e6e73]">
                Similarity {Math.round(c.score * 100)}%
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
