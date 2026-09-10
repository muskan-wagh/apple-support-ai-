/**
 * Embedding builder — GATED (mod #3, #5).
 * NEVER embeds the full 3M-row TWCS. Only the filtered + deduped Apple corpus.
 *
 *   npm run embeddings -- --report-only   # prints corpus size + estimate, downloads NOTHING
 *   npm run embeddings                    # full build (requires explicit corpus approval)
 *
 * Estimate model: Xenova/all-MiniLM-L6-v2 (384 dims, float32) =>
 *   ~1.5 KB/vector + text row overhead. LanceDB overhead ~1.3x.
 */
import fs from "node:fs";
import path from "node:path";

const CONV_JSONL = path.resolve("data/processed/conversations.jsonl");

function reportOnly(): void {
  if (!fs.existsSync(CONV_JSONL)) {
    console.log(`No corpus yet: ${CONV_JSONL}`);
    console.log("Run npm run data:filter && npm run data:conversations first.");
    console.log("Nothing was downloaded. No embeddings were generated.");
    return;
  }
  const stat = fs.statSync(CONV_JSONL);
  const lines = fs.readFileSync(CONV_JSONL, "utf8").split("\n").filter((l) => l.trim()).length;
  const mb = stat.size / 1024 / 1024;
  const vecBytes = lines * 384 * 4;
  const estDbMb = (vecBytes * 1.3 + stat.size) / 1024 / 1024;
  const modelMb = 80;
  console.log(`Apple retrieval corpus: ${lines.toLocaleString()} pairs, ${mb.toFixed(2)} MB jsonl`);
  console.log(`Estimated vectors: ${(vecBytes / 1024 / 1024).toFixed(1)} MB raw + ~30% index overhead`);
  console.log(`Estimated LanceDB dir: ~${estDbMb.toFixed(1)} MB + ~${modelMb} MB one-time model download`);
  console.log(`Available disk: (checked at build time by installer)`);
  console.log("Approve this size, then run `npm run embeddings` without --report-only.");
  console.log("Full embedding implementation lands in the retrieval phase; this gate stays.");
}

async function main(): Promise<void> {
  if (process.argv.includes("--report-only")) {
    reportOnly();
    return;
  }
  // Full build lands in retrieval phase. Refuse to silently embed without a corpus.
  if (!fs.existsSync(CONV_JSONL)) {
    console.error(`Missing corpus: ${CONV_JSONL}. Run data pipeline first.`);
    process.exit(1);
  }
  console.log("Full embedding build not yet implemented (retrieval phase).");
  console.log("Use `npm run embeddings -- --report-only` to review corpus size first.");
}

main().catch((err) => {
  console.error("embeddings failed:", err);
  process.exit(1);
});
