/**
 * Retrieval verification — runs representative Apple Support queries against the
 * local LanceDB index and prints real results (nothing fabricated).
 * Usage: npm run retrieval:verify [-- --top-k 3]
 */
import { retrieveSimilarExamples } from "../src/retrieval/retrieve.js";

const QUERIES = [
  "My iPhone won't connect to WiFi",
  "Battery drains too fast after the update",
  "I forgot my Apple ID password and can't log in",
  "My screen is cracked, what can I do?",
  "How do I update to the newest iOS version?",
];

function clip(s: string, n: number): string {
  const one = s.replace(/\s+/g, " ").trim();
  return one.length > n ? `${one.slice(0, n)}…` : one;
}

async function main(): Promise<void> {
  const topKFlag = process.argv.find((a) => a.startsWith("--top-k="));
  const topK = topKFlag ? Number(topKFlag.split("=")[1]) : 3;
  let failures = 0;
  for (const q of QUERIES) {
    console.log(`\n=== QUERY: ${q}`);
    const hits = await retrieveSimilarExamples(q, topK);
    if (hits.length === 0) {
      console.log("  (no results)");
      failures++;
      continue;
    }
    for (const [i, h] of hits.entries()) {
      const okShape = Boolean(h.exampleId && h.customerMessage?.trim() && h.supportResponse?.trim());
      if (!okShape) failures++;
      console.log(`  [${i + 1}] id=${h.exampleId} score=${h.score.toFixed(4)}${okShape ? "" : "  <-- BAD SHAPE"}`);
      console.log(`      customer: ${clip(h.customerMessage, 160)}`);
      console.log(`      support : ${clip(h.supportResponse, 160)}`);
    }
  }
  console.log(failures === 0 ? "\nAll queries returned well-formed results." : `\n${failures} BAD RESULT(S).`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("verify failed:", err);
  process.exit(1);
});
