"use client";

import { useState } from "react";
import { postSupport } from "@/lib/api";
import type { SupportSuccess } from "@/lib/types";
import SupportInput from "@/components/support-input";
import ResultSummary from "@/components/result-summary";
import SimilarCases from "@/components/similar-case";
import ResponseCard from "@/components/response-card";
import LoadingState from "@/components/loading-state";

export default function Home() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SupportSuccess | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (loading) return;
    setError(null);
    setResult(null);
    if (!message.trim()) {
      setError("Please describe your issue first.");
      return;
    }
    setLoading(true);
    try {
      const data = await postSupport(message);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong while processing your request.");
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setMessage("");
    setResult(null);
    setError(null);
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-16 pt-12 sm:px-6 sm:pt-16">
      <header className="mb-10 text-center sm:mb-12">
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#6e6e73]">
          Historical support intelligence
        </p>
        <h1 className="mx-auto mt-3 max-w-xl text-4xl font-semibold leading-[1.08] tracking-[-0.02em] sm:text-5xl">
          Apple Support AI
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[17px] leading-relaxed text-[#6e6e73]">
          Describe a customer issue. The agent classifies it, finds similar past cases, and drafts a
          response.
        </p>
      </header>

      <SupportInput message={message} loading={loading} onChange={setMessage} onSubmit={handleSubmit} />

      <div aria-live="polite" className="mt-8 space-y-8">
        {loading && <LoadingState />}

        {error && !loading && (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-relaxed text-red-800">
            {error}
          </div>
        )}

        {result && !loading && (
          <>
            <section aria-label="Your message">
              <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.1em] text-[#6e6e73]">
                Customer message
              </p>
              <p className="text-[17px] leading-relaxed">{result.message}</p>
            </section>

            <ResultSummary
              intentLabel={result.intent.label}
              confidence={result.intent.confidence}
              escalate={result.escalate}
              reasons={result.escalationReasons}
            />

            <SimilarCases cases={result.retrieval} />

            <ResponseCard response={result.response} />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleClear}
                className="rounded-full border border-[#d2d2d7] bg-white px-5 py-2 text-sm font-medium text-[#1d1d1f] transition hover:border-[#6e6e73] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2"
              >
                Clear
              </button>
            </div>
          </>
        )}
      </div>

      <footer className="mt-14 border-t border-[#e8e8ed] pt-6 text-center text-[13px] leading-relaxed text-[#6e6e73]">
        A web demo over the existing support agent — replies are generated from historical
        conversations, not official Apple responses.
      </footer>
    </main>
  );
}
