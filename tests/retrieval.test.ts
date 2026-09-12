import { describe, expect, it } from "vitest";
import { chunk } from "../src/retrieval/embed.js";
import {
  RetrievedExampleSchema,
  lexicalScore,
  lexicalSearch,
  retrieveSimilarExamples,
  tokenize,
  type CorpusExample,
} from "../src/retrieval/retrieve.js";
import { cosineFromL2 } from "../src/retrieval/store.js";

const FIXTURE: CorpusExample[] = [
  {
    conversationId: "1->2",
    customerMessage: "My iPhone will not connect to wifi at home",
    supportResponse: "Try restarting your router and resetting network settings",
  },
  {
    conversationId: "3->4",
    customerMessage: "Battery drains very fast after updating iOS",
    supportResponse: "Check battery usage in Settings and try a restart",
  },
  {
    conversationId: "5->6",
    customerMessage: "Forgot my Apple ID password cannot log in",
    supportResponse: "Reset your password at the Apple ID account page",
  },
];

describe("retrieval helpers (pure, key-free, model-free)", () => {
  it("tokenizes to lowercase alphanumerics longer than 2 chars", () => {
    // Apostrophes split tokens ("won't" -> "won" + "t", "t" dropped for length).
    expect(tokenize("My Wi-Fi won't CONNECT!")).toEqual(["won", "connect"]);
  });

  it("lexicalScore is 1 for identical sets, 0 for disjoint", () => {
    expect(lexicalScore(new Set(["a", "b"]), new Set(["a", "b"]))).toBeCloseTo(1);
    expect(lexicalScore(new Set(["a"]), new Set(["b"]))).toBe(0);
    expect(lexicalScore(new Set(), new Set(["b"]))).toBe(0);
  });

  it("lexicalSearch ranks the wifi question first", () => {
    const hits = lexicalSearch("iphone wifi connection broken", FIXTURE, 3);
    // Only one fixture overlaps, so zero-score rows are filtered out.
    expect(hits).toHaveLength(1);
    expect(hits[0].exampleId).toBe("1->2");
    expect(hits[0].customerMessage).toContain("wifi");
    expect(hits[0].supportResponse).toContain("router");
  });

  it("lexicalSearch returns [] when nothing overlaps", () => {
    expect(lexicalSearch("zebra quantum saxophone", FIXTURE, 3)).toEqual([]);
  });

  it("chunk splits evenly and unevenly", () => {
    expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
    expect(chunk([1, 2, 3], 2)).toEqual([[1, 2], [3]]);
    expect(() => chunk([1], 0)).toThrow();
  });

  it("cosineFromL2 maps zero distance to 1", () => {
    expect(cosineFromL2(0)).toBeCloseTo(1);
    expect(cosineFromL2(Math.SQRT2)).toBeCloseTo(0);
  });

  it("Zod rejects malformed retrieval results", () => {
    expect(() =>
      RetrievedExampleSchema.parse({ exampleId: "x", customerMessage: "a" }),
    ).toThrow();
  });
});

describe("retrieveSimilarExamples (lexical path)", () => {
  it("returns shaped results with injected examples and useVector:false", async () => {
    const hits = await retrieveSimilarExamples("apple id password login help", 2, {
      examples: FIXTURE,
      useVector: false,
    });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].exampleId).toBe("5->6");
    for (const h of hits) {
      expect(() => RetrievedExampleSchema.parse(h)).not.toThrow();
      expect(h.customerMessage.trim().length).toBeGreaterThan(0);
      expect(h.supportResponse.trim().length).toBeGreaterThan(0);
    }
  });

  it("falls back to lexical when the vector backend is disabled via env", async () => {
    process.env["APPLE_SUPPORT_RETRIEVAL"] = "lexical";
    try {
      const hits = await retrieveSimilarExamples("battery drains fast", 1, { examples: FIXTURE });
      expect(hits).toHaveLength(1);
      expect(hits[0].exampleId).toBe("3->4");
    } finally {
      delete process.env["APPLE_SUPPORT_RETRIEVAL"];
    }
  });
});
