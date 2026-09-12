import { describe, expect, it } from "vitest";
import { fallbackResponse, generateResponse, sanitizeResponse } from "../src/generation/generate.js";
import { runSupportAgent } from "../src/agent/runSupportAgent.js";
import { majorityIntent } from "../baselines/majority.js";
import { predictKeyword } from "../baselines/keyword.js";
import { predictNearest } from "../baselines/nearestExample.js";

describe("generation fallback (key-free)", () => {
  it("offers a DM handoff when not escalated", async () => {
    const r = await generateResponse(
      { message: "wifi broken", intent: "connectivity", examples: [], escalated: false },
      { useLlm: false },
    );
    expect(r).toMatch(/DM/);
    expect(r.length).toBeLessThanOrEqual(600);
  });

  it("says escalating when escalated", () => {
    const r = fallbackResponse({ message: "x", intent: "battery_power", examples: [], escalated: true });
    expect(r).toMatch(/escalat/i);
  });

  it("sanitizer strips invented links and caps length", () => {
    expect(sanitizeResponse("see https://example.com/foo now")).not.toContain("https://");
    expect(sanitizeResponse("a".repeat(1000)).length).toBeLessThanOrEqual(600);
  });

  it("falls back on LLM error via injected fetch", async () => {
    const fetchFn = (async () => { throw new Error("down"); }) as unknown as typeof fetch;
    const r = await generateResponse(
      { message: "wifi broken", intent: "connectivity", examples: [], escalated: false },
      { fetchFn },
    );
    expect(r).toMatch(/DM/);
  });
});

describe("runSupportAgent (offline: keyword + lexical + template)", () => {
  it("returns a shaped result end to end", async () => {
    const r = await runSupportAgent("My iPhone battery drains so fast", {
      classify: { useLlm: false },
      generate: { useLlm: false },
      useVector: false,
    });
    expect(r.intent).toBe("battery_power");
    expect(r.confidence).toBeGreaterThan(0);
    expect(typeof r.escalated).toBe("boolean");
    expect(r.response.length).toBeGreaterThan(20);
  }, 60000);
});

describe("baselines (pure)", () => {
  it("majority picks the most frequent dev label", () => {
    expect(majorityIntent(["a", "b", "a"])).toBe("a");
  });
  it("keyword mirrors taxonomy rules", () => {
    expect(predictKeyword("forgot my apple id password")).toBe("account_login");
  });
  it("nearest copies the closest dev label", () => {
    const dev = [
      { message: "wifi will not connect at home", intent: "connectivity" },
      { message: "battery drains fast", intent: "battery_power" },
    ];
    expect(predictNearest("wifi connection broken at home", dev)).toBe("connectivity");
    expect(predictNearest("zebra quantum saxophone", dev)).toBe("other");
  });
});
