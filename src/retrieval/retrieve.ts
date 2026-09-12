/**
 * retrieveSimilarExamples(message, topK = 3)
 * Primary: local vector search (Transformers.js embeddings + LanceDB, Apple corpus only).
 * Fallback: deterministic lexical overlap over conversations.jsonl when embeddings
 * are unavailable (no table / no model / network off). Never touches other brands:
 * the corpus file itself is Apple-only by construction (see data pipeline).
 */
import fs from "node:fs";
import { z } from "zod";
import { CONVERSATIONS_JSONL } from "./config.js";
import { cosineFromL2, openTable } from "./store.js";
import { embedQuery } from "./embed.js";

export const RetrievedExampleSchema = z.object({
  exampleId: z.string(),
  customerMessage: z.string(),
  supportResponse: z.string(),
  score: z.number(),
});
export type RetrievedExample = z.infer<typeof RetrievedExampleSchema>;

export interface CorpusExample {
  conversationId: string;
  customerMessage: string;
  supportResponse: string;
}

export interface RetrieveOptions {
  /** Override corpus (used by tests to avoid disk/model). */
  examples?: CorpusExample[];
  /** Set false to skip the vector path (tests / offline). */
  useVector?: boolean;
}

let corpusCache: CorpusExample[] | null = null;

export function loadCorpus(): CorpusExample[] {
  if (!corpusCache) {
    const rows: CorpusExample[] = [];
    for (const line of fs.readFileSync(CONVERSATIONS_JSONL, "utf8").split("\n")) {
      if (!line.trim()) continue;
      const p = JSON.parse(line) as CorpusExample;
      if (p.customerMessage?.trim() && p.supportResponse?.trim()) rows.push(p);
    }
    corpusCache = rows;
  }
  return corpusCache;
}

/** Clear the in-memory corpus cache (tests). */
export function clearCorpusCache(): void {
  corpusCache = null;
}

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((t) => t.length > 2);
}

/** Cosine similarity on binary token sets. Pure + deterministic. */
export function lexicalScore(aTokens: Set<string>, bTokens: Set<string>): number {
  if (aTokens.size === 0 || bTokens.size === 0) return 0;
  let inter = 0;
  for (const t of aTokens) if (bTokens.has(t)) inter++;
  if (inter === 0) return 0;
  return inter / Math.sqrt(aTokens.size * bTokens.size);
}

/** Rank examples by lexical overlap (pure, tested, no model needed). */
export function lexicalSearch(
  message: string,
  examples: CorpusExample[],
  topK: number,
): RetrievedExample[] {
  const q = new Set(tokenize(message));
  return examples
    .map((e) => ({
      exampleId: e.conversationId,
      customerMessage: e.customerMessage,
      supportResponse: e.supportResponse,
      score: lexicalScore(q, new Set(tokenize(e.customerMessage))),
    }))
    .filter((r) => r.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, topK)
    .map((r) => RetrievedExampleSchema.parse(r));
}

async function vectorSearch(message: string, topK: number): Promise<RetrievedExample[]> {
  const table = await openTable();
  const query = await embedQuery(message);
  const hits = await table.search(query).limit(topK).toArray();
  return (hits as Array<Record<string, unknown>>).map((h) =>
    RetrievedExampleSchema.parse({
      exampleId: String(h["exampleId"] ?? ""),
      customerMessage: String(h["customerMessage"] ?? ""),
      supportResponse: String(h["supportResponse"] ?? ""),
      score: cosineFromL2(Number(h["_distance"] ?? 0)),
    }),
  );
}

export async function retrieveSimilarExamples(
  message: string,
  topK = 3,
  opts: RetrieveOptions = {},
): Promise<RetrievedExample[]> {
  const useVector =
    opts.useVector !== false && process.env["APPLE_SUPPORT_RETRIEVAL"] !== "lexical";
  if (useVector) {
    try {
      return await vectorSearch(message, topK);
    } catch (err) {
      console.warn(`vector retrieval unavailable, using lexical fallback: ${(err as Error).message}`);
    }
  }
  return lexicalSearch(message, opts.examples ?? loadCorpus(), topK);
}
