import { describe, expect, it } from "vitest";
import { reasonLabel, toSupportResponse, validateMessage } from "../lib/support";
import type { AgentResult } from "../src/agent/runSupportAgent";

describe("validateMessage (web input guard)", () => {
  it("rejects empty messages", () => {
    expect(validateMessage("   ")).toEqual({ ok: false, error: "Please describe your issue first." });
    expect(validateMessage(undefined)).toEqual({ ok: false, error: "Please describe your issue first." });
  });

  it("rejects over-long messages", () => {
    const r = validateMessage("x".repeat(2001));
    expect(r.ok).toBe(false);
  });

  it("accepts and trims normal messages", () => {
    expect(validateMessage("  wifi broken  ")).toEqual({ ok: true, message: "wifi broken" });
  });
});

describe("toSupportResponse (no invented data)", () => {
  const agent: AgentResult = {
    intent: "connectivity",
    confidence: 0.91,
    escalated: false,
    escalationReasons: [],
    examples: [
      { exampleId: "1->2", customerMessage: "wifi broken", supportResponse: "restart router", score: 0.87 },
    ],
    response: "Try restarting your router.",
  };

  it("preserves the agent output shape verbatim", () => {
    const out = toSupportResponse("wifi broken?", agent);
    expect(out).toEqual({
      message: "wifi broken?",
      intent: { label: "connectivity", confidence: 0.91 },
      retrieval: [{ exampleId: "1->2", customerMessage: "wifi broken", supportResponse: "restart router", score: 0.87 }],
      escalate: false,
      escalationReasons: [],
      response: "Try restarting your router.",
    });
  });

  it("labels escalation reasons without inventing new ones", () => {
    expect(reasonLabel("lockout")).toBe("Account or device lockout");
    expect(reasonLabel("some_future_code")).toBe("some future code");
  });
});
