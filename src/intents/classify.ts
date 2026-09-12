/**
 * Intent classifier — Phase 4.
 * Primary: OpenRouter chat model (LLM_MODEL) with a strict JSON-only prompt, validated by Zod.
 * Fallback (no key / network error / bad JSON / unknown intent): deterministic keyword rules
 * (assignIntent) with a heuristic confidence. Pure fallback path is key-free and tested.
 */
import "dotenv/config";
import { z } from "zod";
import { INTENT_DEFS, INTENT_NAMES, assignIntent, matchIntents, type IntentName } from "./taxonomy.js";

export const ClassifyResultSchema = z.object({
  intent: z.enum(INTENT_NAMES as unknown as [string, ...string[]]),
  confidence: z.number().min(0).max(1),
});
export type ClassifyResult = { intent: IntentName; confidence: number };

function fallbackConfidence(message: string): number {
  const hits = matchIntents(message);
  if (hits.length === 1 && hits[0] !== "other") return 0.7;
  if (hits.length > 1) return 0.6;
  return 0.4;
}

export function keywordClassify(message: string): ClassifyResult {
  return { intent: assignIntent(message), confidence: fallbackConfidence(message) };
}

function intentListPrompt(): string {
  return INTENT_NAMES.map((n) => `- ${n}: ${INTENT_DEFS[n].definition} Excludes: ${INTENT_DEFS[n].excludes}`).join("\n");
}

export interface ClassifyOptions {
  /** Override fetch (tests). */
  fetchFn?: typeof fetch;
  /** Force the keyword fallback (tests / offline). */
  useLlm?: boolean;
  /** Request timeout ms. */
  timeoutMs?: number;
}

export async function classifyIntent(message: string, opts: ClassifyOptions = {}): Promise<ClassifyResult> {
  const useLlm = opts.useLlm !== false && process.env["APPLE_SUPPORT_CLASSIFIER"] !== "keyword";
  const apiKey = process.env["LLM_API_KEY"]?.trim();
  if (!useLlm || !apiKey) return keywordClassify(message);
  try {
    return await llmClassify(message, apiKey, opts);
  } catch (err) {
    console.warn(`LLM classifier unavailable, using keyword fallback: ${(err as Error).message}`);
    return keywordClassify(message);
  }
}

async function llmClassify(message: string, apiKey: string, opts: ClassifyOptions): Promise<ClassifyResult> {
  const base = (process.env["LLM_BASE_URL"] ?? "https://openrouter.ai/api/v1").replace(/\/$/, "");
  const model = process.env["LLM_MODEL"]?.trim() || "nex-agi/nex-n2.5-mini:free";
  const fetchFn = opts.fetchFn ?? fetch;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 20000);
  try {
    const res = await fetchFn(`${base}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 120,
        messages: [
          {
            role: "system",
            content:
              "You are an Apple Support intent classifier. Read the customer message and reply with ONLY " +
              `a JSON object {"intent": <one of: ${INTENT_NAMES.join(", ")}>, "confidence": <0-1>}. Rules:\n` +
              intentListPrompt() +
              "\nSingle label only: named need beats question form; post-update breakage by symptom; " +
              "bare versions are software_update; fragments with no need are other.",
          },
          { role: "user", content: message },
        ],
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
    const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = body.choices?.[0]?.message?.content ?? "";
    const parsed = ClassifyResultSchema.parse(extractJson(content));
    return { intent: parsed.intent as IntentName, confidence: parsed.confidence };
  } finally {
    clearTimeout(timer);
  }
}

/** Pull the first {...} JSON object out of model chatter. */
export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON object in LLM output");
  return JSON.parse(text.slice(start, end + 1));
}
