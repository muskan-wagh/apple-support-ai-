import { describe, expect, it } from "vitest";
import { decideEscalation } from "../src/escalation/decide.js";

describe("decideEscalation (deterministic, key-free)", () => {
  it("escalates safety (swollen battery)", () => {
    const d = decideEscalation({ message: "brand new battery swelling and causing the phone to split" });
    expect(d.escalate).toBe(true);
    expect(d.reasons).toContain("safety");
  });

  it("escalates lockout", () => {
    const d = decideEscalation({ message: "Completely locked out, forgot password option only" });
    expect(d.escalate).toBe(true);
    expect(d.reasons).toContain("lockout");
  });

  it("escalates money disputes", () => {
    const d = decideEscalation({ message: "charged my account $16.99 for nothing, run me my refund" });
    expect(d.escalate).toBe(true);
    expect(d.reasons).toContain("money");
  });

  it("escalates unusable devices", () => {
    const d = decideEscalation({ message: "haven't been able to use my phone at ALL" });
    expect(d.escalate).toBe(true);
    expect(d.reasons).toContain("unusable");
  });

  it("escalates repeated failure", () => {
    const d = decideEscalation({ message: "3.5 hours, 4 different reps and a supervisor who never called" });
    expect(d.escalate).toBe(true);
    expect(d.reasons).toContain("repeated_failure");
  });

  it("does not escalate single complaints", () => {
    expect(decideEscalation({ message: "iOS 11 sucks, fix it" }).escalate).toBe(false);
    expect(decideEscalation({ message: "How do I turn off wifi?" }).escalate).toBe(false);
  });

  it("escalates low-confidence high-stakes", () => {
    const d = decideEscalation({ message: "hmm not sure", intent: "purchase_billing", confidence: 0.3 });
    expect(d.escalate).toBe(true);
    expect(d.reasons).toContain("low_confidence_high_stakes");
  });

  it("handles curly apostrophes", () => {
    const d = decideEscalation({ message: "My MacBookPro won’t turn on" });
    expect(d.escalate).toBe(true);
  });
});
