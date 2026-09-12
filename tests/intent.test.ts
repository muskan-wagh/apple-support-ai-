import { describe, expect, it, afterEach } from "vitest";
import { classifyIntent, extractJson, keywordClassify } from "../src/intents/classify.js";

const savedKey = process.env["LLM_API_KEY"];

afterEach(() => {
  if (savedKey === undefined) delete process.env["LLM_API_KEY"];
  else process.env["LLM_API_KEY"] = savedKey;
});

describe("keywordClassify (key-free fallback)", () => {
  it("labels a battery complaint with mid confidence", () => {
    const r = keywordClassify("My battery drains so fast after the update");
    expect(r.intent).toBe("battery_power");
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
  });

  it("labels fragments as other with low confidence", () => {
    const r = keywordClassify("@AppleSupport Thank you!");
    expect(r.intent).toBe("other");
    expect(r.confidence).toBeLessThanOrEqual(0.5);
  });
});

describe("classifyIntent routing", () => {
  it("uses keyword fallback when useLlm:false even with a key", async () => {
    process.env["LLM_API_KEY"] = "test-key";
    const r = await classifyIntent("wifi keeps disconnecting", { useLlm: false });
    expect(r.intent).toBe("connectivity");
  });

  it("uses keyword fallback when no key is set", async () => {
    delete process.env["LLM_API_KEY"];
    const r = await classifyIntent("forgot my apple id password");
    expect(r.intent).toBe("account_login");
  });

  it("parses LLM JSON via injected fetch", async () => {
    process.env["LLM_API_KEY"] = "test-key";
    const fetchFn = (async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"intent":"connectivity","confidence":0.92}' } }] }),
    })) as unknown as typeof fetch;
    const r = await classifyIntent("wifi broken", { fetchFn });
    expect(r).toEqual({ intent: "connectivity", confidence: 0.92 });
  });

  it("falls back on LLM HTTP error", async () => {
    process.env["LLM_API_KEY"] = "test-key";
    const fetchFn = (async () => ({ ok: false, status: 429 })) as unknown as typeof fetch;
    const r = await classifyIntent("battery dead", { fetchFn });
    expect(r.intent).toBe("battery_power");
  });

  it("falls back on non-JSON LLM output", async () => {
    process.env["LLM_API_KEY"] = "test-key";
    const fetchFn = (async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "hello there" } }] }),
    })) as unknown as typeof fetch;
    const r = await classifyIntent("screen cracked", { fetchFn });
    expect(r.intent).toBe("device_hardware");
  });

  it("falls back on unknown intent label", async () => {
    process.env["LLM_API_KEY"] = "test-key";
    const fetchFn = (async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"intent":"spaceship","confidence":0.9}' } }] }),
    })) as unknown as typeof fetch;
    const r = await classifyIntent("screen cracked", { fetchFn });
    expect(r.intent).toBe("device_hardware");
  });
});

describe("extractJson", () => {
  it("pulls JSON out of chatter", () => {
    expect(extractJson('Sure! {"intent":"other","confidence":0.5} bye')).toEqual({ intent: "other", confidence: 0.5 });
  });
  it("throws when no object present", () => {
    expect(() => extractJson("no json here")).toThrow();
  });
});
