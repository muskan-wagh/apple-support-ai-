"use client";

export default function ResponseCard({ response }: { response: string }) {
  return (
    <section
      aria-labelledby="response-heading"
      className="rounded-2xl bg-[#161617] p-5 text-white shadow-[0_8px_32px_rgba(0,0,0,0.12)] sm:p-7"
    >
      <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-white/60">
        Suggested response
      </p>
      <h2 id="response-heading" className="sr-only">
        Suggested response
      </h2>
      <p className="mt-3 whitespace-pre-wrap text-[17px] leading-relaxed">{response}</p>
      <p className="mt-5 border-t border-white/15 pt-4 text-[13px] leading-relaxed text-white/60">
        Generated using historical Apple Support examples. Not an official Apple response.
      </p>
    </section>
  );
}
