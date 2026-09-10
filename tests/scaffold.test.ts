import { describe, expect, it } from "vitest";
import { APP_NAME, VERSION } from "../src/agent/runSupportAgent.js";

describe("scaffold", () => {
  it("exposes app metadata", () => {
    expect(APP_NAME).toBe("apple-support-ai");
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("requires .env.example to document LLM vars", async () => {
    const fs = await import("node:fs");
    const example = fs.readFileSync(".env.example", "utf8");
    for (const key of ["LLM_API_KEY", "LLM_MODEL", "LLM_BASE_URL"]) {
      expect(example).toContain(key);
    }
  });
});
