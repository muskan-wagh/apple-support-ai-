"use client";

import { useEffect, useState } from "react";

const STEPS = ["Analyzing your issue…", "Finding similar cases…", "Preparing a response…"];

export default function LoadingState() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 2500);
    return () => clearInterval(id);
  }, []);
  return (
    <div
      className="rounded-2xl border border-[#e8e8ed] bg-white p-8 text-center shadow-[0_2px_16px_rgba(0,0,0,0.04)]"
      role="status"
      aria-live="polite"
    >
      <div
        className="mx-auto h-6 w-6 motion-safe:animate-spin rounded-full border-2 border-[#e8e8ed] border-t-[#0071e3]"
        aria-hidden="true"
      />
      <p className="mt-4 text-[15px] font-medium">{STEPS[step]}</p>
      <p className="mt-1 text-[13px] text-[#6e6e73]">Running the support agent — please wait.</p>
    </div>
  );
}
