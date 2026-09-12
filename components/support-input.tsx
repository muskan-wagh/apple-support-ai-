"use client";

import { MAX_MESSAGE_LENGTH } from "@/lib/types";

interface Props {
  message: string;
  loading: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

const EXAMPLES = [
  "My iPhone battery is draining unusually fast after the latest update.",
  "My iPhone won't connect to WiFi at home since yesterday.",
  "I forgot my Apple ID password and can't log in.",
  "My screen cracked and the touch stopped working.",
];

export default function SupportInput({ message, loading, onChange, onSubmit }: Props) {
  return (
    <section aria-labelledby="ask-heading" className="rounded-2xl border border-[#e8e8ed] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)] sm:p-7">
      <h2 id="ask-heading" className="sr-only">
        Describe your issue
      </h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <label htmlFor="issue" className="mb-2 block text-[15px] font-medium">
          Describe your issue
        </label>
        <textarea
          id="issue"
          rows={4}
          value={message}
          disabled={loading}
          maxLength={MAX_MESSAGE_LENGTH + 100}
          onChange={(e) => onChange(e.target.value)}
          placeholder="My iPhone battery is draining unusually fast after the latest update."
          className="w-full resize-y rounded-xl border border-[#d2d2d7] bg-[#fbfbfd] px-4 py-3 text-[17px] leading-relaxed placeholder:text-[#86868b] focus:border-[#0071e3] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#0071e3]/15 disabled:opacity-60"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[13px] tabular-nums text-[#6e6e73]" aria-live="polite">
            {message.length}/{MAX_MESSAGE_LENGTH}
          </p>
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-[#0071e3] px-6 py-2.5 text-[15px] font-medium text-white transition hover:bg-[#0077ed] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Working…" : "Ask Apple Support"}
          </button>
        </div>
      </form>
      <div className="mt-5 border-t border-[#f5f5f7] pt-5">
        <p className="mb-2.5 text-[13px] font-semibold uppercase tracking-[0.1em] text-[#6e6e73]">
          Try an example
        </p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              disabled={loading}
              onClick={() => onChange(ex)}
              className="rounded-full bg-[#f5f5f7] px-4 py-2 text-left text-sm text-[#1d1d1f] transition hover:bg-[#e8e8ed] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2 disabled:opacity-60"
            >
              {ex.length > 64 ? `${ex.slice(0, 64)}…` : ex}
            </button>
          ))}
        </div>
        <p className="mt-2.5 text-[13px] text-[#86868b]">Example prompts only — clicking fills the box above.</p>
      </div>
    </section>
  );
}
