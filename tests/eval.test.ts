import { describe, expect, it } from "vitest";
import { binaryPrf, mrr, prf, recallAtK } from "../evaluation/metrics.js";
import { heuristicJudge, JudgeSchema } from "../evaluation/judge.js";

describe("metrics (pure)", () => {
  it("prf computes accuracy and macro-F1", () => {
    const r = prf(["a", "a", "b"], ["a", "b", "b"], ["a", "b"]);
    expect(r.accuracy).toBeCloseTo(2 / 3);
    expect(r.perLabel).toHaveLength(2);
    expect(r.macroF1).toBeGreaterThan(0.5);
  });
  it("binaryPrf counts tp/fp/fn/tn", () => {
    const r = binaryPrf([true, true, false], [true, false, false]);
    expect(r).toMatchObject({ tp: 1, fp: 0, fn: 1, tn: 1 });
  });
  it("recallAtK and mrr handle nulls", () => {
    expect(recallAtK([0, 2, null], 1)).toBeCloseTo(1 / 3);
    expect(recallAtK([0, 2, null], 3)).toBeCloseTo(2 / 3);
    expect(mrr([0, 1])).toBeCloseTo(0.75);
    expect(mrr([])).toBe(0);
  });
});

describe("judge", () => {
  it("heuristic flags escalation wording", () => {
    const bad = heuristicJudge({ customerMessage: "x", intent: "battery_power", response: "All good, nothing to do.", escalated: true });
    expect(bad.heuristic).toBe(true);
    expect(bad.score).toBeLessThan(5);
    const good = heuristicJudge({
      customerMessage: "x", intent: "battery_power", response: "Thanks — we're escalating to a specialist. Please share details by DM.",
      escalated: true,
    });
    expect(good.score).toBeGreaterThan(bad.score);
  });
  it("JudgeSchema rejects out-of-range scores", () => {
    expect(() => JudgeSchema.parse({ score: 9, grounded: true, actionable: true, no_invented_policy: true, notes: "x" })).toThrow();
  });
});
