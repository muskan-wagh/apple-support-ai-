/**
 * Intent distribution over the verified Apple corpus using taxonomy keyword rules.
 * Usage: npm run intents:count
 * Output: single-label distribution (priority order), multi-hit rate, and a
 * self-check that every taxonomy example matches its own intent.
 * These are transparent weak-label counts — NOT golden truth (Phase 3).
 */
import fs from "node:fs";
import {
  INTENT_DEFS,
  INTENT_NAMES,
  INTENT_PRIORITY,
  assignIntent,
  matchIntents,
  type IntentName,
} from "../src/intents/taxonomy.js";
import { CONVERSATIONS_JSONL } from "../src/retrieval/config.js";

function main(): void {
  // 1. Self-check: every verbatim taxonomy example must at least MATCH its intent.
  let exampleFails = 0;
  for (const name of INTENT_NAMES) {
    INTENT_DEFS[name].examples.forEach((ex, i) => {
      const hits = matchIntents(ex);
      const single = assignIntent(ex);
      const ok = hits.includes(name);
      if (!ok) exampleFails++;
      console.log(
        `${ok ? "OK  " : "FAIL"} ${name}[${i}] single=${single} multi=[${hits.join(",")}]`,
      );
    });
  }
  console.log(`example self-check: ${exampleFails} failures`);

  // 2. Full-corpus counts (customer messages only).
  const single = new Map<IntentName, number>();
  const multi = new Map<IntentName, number>();
  let total = 0;
  let multiHit = 0;
  for (const line of fs.readFileSync(CONVERSATIONS_JSONL, "utf8").split("\n")) {
    if (!line.trim()) continue;
    const p = JSON.parse(line) as { customerMessage?: string };
    const msg = p.customerMessage ?? "";
    total++;
    const hits = matchIntents(msg);
    if (hits.length > 1 || (hits.length === 1 && hits[0] !== "other")) {
      if (hits.length > 1) multiHit++;
    }
    for (const h of hits) multi.set(h, (multi.get(h) ?? 0) + 1);
    const s = assignIntent(msg);
    single.set(s, (single.get(s) ?? 0) + 1);
  }
  console.log(`\ntotal=${total.toLocaleString()} multi-hit=${multiHit.toLocaleString()} (${((100 * multiHit) / total).toFixed(1)}%)`);
  console.log("\nintent,single_count,single_pct,multi_count,multi_pct");
  for (const name of INTENT_PRIORITY) {
    const s = single.get(name) ?? 0;
    const m = multi.get(name) ?? 0;
    console.log(
      `${name},${s},${((100 * s) / total).toFixed(2)},${m},${((100 * m) / total).toFixed(2)}`,
    );
  }
  if (exampleFails > 0) process.exitCode = 1;
}

main();
