/** Keyword baseline: the transparent taxonomy rules (same as Phase 9 reference). */
import { assignIntent, type IntentName } from "../src/intents/taxonomy.js";

export function predictKeyword(message: string): IntentName {
  return assignIntent(message);
}
