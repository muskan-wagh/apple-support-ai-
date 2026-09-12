/**
 * Full support agent pipeline — Phase 8.
 * classify (intent+confidence) -> retrieve (similar Apple examples) ->
 * escalate (multi-signal) -> generate (grounded reply).
 */
import { classifyIntent, type ClassifyOptions } from "../intents/classify.js";
import { retrieveSimilarExamples, type RetrievedExample } from "../retrieval/retrieve.js";
import { decideEscalation } from "../escalation/decide.js";
import { generateResponse, type GenerateOptions } from "../generation/generate.js";
import type { IntentName } from "../intents/taxonomy.js";

export const VERSION = "0.1.0";
export const APP_NAME = "apple-support-ai";

export interface AgentResult {
  intent: IntentName;
  confidence: number;
  escalated: boolean;
  escalationReasons: string[];
  examples: RetrievedExample[];
  response: string;
}

export interface AgentOptions {
  topK?: number;
  classify?: ClassifyOptions;
  generate?: GenerateOptions;
  useVector?: boolean;
}

export async function runSupportAgent(message: string, opts: AgentOptions = {}): Promise<AgentResult> {
  const { intent, confidence } = await classifyIntent(message, opts.classify);
  const examples = await retrieveSimilarExamples(message, opts.topK ?? 3, { useVector: opts.useVector });
  const { escalate, reasons } = decideEscalation({ message, intent, confidence });
  const response = await generateResponse({ message, intent, examples, escalated: escalate }, opts.generate);
  return { intent, confidence, escalated: escalate, escalationReasons: reasons, examples, response };
}
