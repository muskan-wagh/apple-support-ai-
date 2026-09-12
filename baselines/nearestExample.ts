/**
 * Nearest-example baseline: lexical overlap against golden-dev (gold labels),
 * predict the top-1 neighbor's intent. No embeddings, no LLM.
 */
import { lexicalSearch, type CorpusExample } from "../src/retrieval/retrieve.js";

export interface LabeledExample {
  message: string;
  intent: string;
}

export function predictNearest(message: string, dev: LabeledExample[]): string {
  const corpus: CorpusExample[] = dev.map((d, i) => ({
    conversationId: `dev-${i}`,
    customerMessage: d.message,
    supportResponse: d.intent, // stash label; lexicalSearch ranks on customerMessage only
  }));
  const hits = lexicalSearch(message, corpus, 1);
  if (hits.length === 0) return "other";
  return hits[0].supportResponse;
}
