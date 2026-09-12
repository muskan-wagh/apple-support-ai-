/**
 * Embedding builder — GATED (mod #3, #5).
 * NEVER embeds the full 3M-row TWCS. Only the filtered + deduped Apple corpus
 * (data/processed/conversations.jsonl). Never reads data/raw/twcs.csv.
 *
 *   npm run embeddings -- --report-only   # prints corpus size + estimate, downloads NOTHING
 *   npm run embeddings                    # downloads model (first run) + builds LanceDB index
 *
 * Estimate model: Xenova/all-MiniLM-L6-v2 (384 dims, float32) =>
 *   ~1.5 KB/vector + text row overhead. LanceDB overhead ~1.3x.
 */
import fs from "node:fs";
import path from "node:path";
import {
  EMBEDDINGS_STATS_JSON,
  EMBEDDING_DIMS,
  EMBEDDING_MODEL,
  LANCEDB_DIR,
  TRANSFORMERS_CACHE_DIR,
  CONVERSATIONS_JSONL as CONV_JSONL,
} from "../src/retrieval/config.js";
import { chunk, embedBatch } from "../src/retrieval/embed.js";
import { createTable, type ExampleRow } from "../src/retrieval/store.js";

const CONV_STATS = path.resolve("data/processed/conversations.stats.json");
const EMBED_BATCH_SIZE = 256;
const SHARD_DIR = path.resolve("tmp/embed-shards");

/** Actual free disk space in MB via statvfs; null when unavailable (caller prints fallback). */
function getDisk(dir: string): { availMB: number; totalMB: number } | null {
  try {
    const st = fs.statfsSync(dir);
    return {
      availMB: (st.bavail * st.bsize) / 1024 / 1024,
      totalMB: (st.blocks * st.bsize) / 1024 / 1024,
    };
  } catch {
    return null;
  }
}

/** Recursive directory size in bytes (for model cache + index reporting). */
export function dirBytes(dir: string): number {
  let total = 0;
  if (!fs.existsSync(dir)) return 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) total += dirBytes(full);
    else if (entry.isFile()) {
      try {
        total += fs.statSync(full).size;
      } catch {
        // Racy file, ignore.
      }
    }
  }
  return total;
}

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
  // Deduplication evidence from the conversation builder (when present).
  let statsLine = "conversations.stats.json: not found (run npm run data:conversations)";
  try {
    const s = JSON.parse(fs.readFileSync(CONV_STATS, "utf8")) as {
      rawPairs?: number;
      dedupedPairs?: number;
      duplicatesRemoved?: number;
    };
    statsLine =
      `conversations.stats.json: rawPairs=${(s.rawPairs ?? lines).toLocaleString()} ` +
      `dedupedPairs=${(s.dedupedPairs ?? lines).toLocaleString()} ` +
      `duplicatesRemoved=${(s.duplicatesRemoved ?? 0).toLocaleString()}`;
  } catch {
    // Keep the fallback line above.
  }
  const vecBytes = lines * 384 * 4;
  const estDbMb = (vecBytes * 1.3 + stat.size) / 1024 / 1024;
  const modelMb = 80;
  const totalEstMb = estDbMb + modelMb;
  console.log(`Apple retrieval corpus: ${lines.toLocaleString()} pairs, ${mb.toFixed(2)} MB jsonl`);
  console.log(statsLine);
  console.log(`Estimated vectors: ${(vecBytes / 1024 / 1024).toFixed(1)} MB raw + ~30% index overhead`);
  console.log(`Estimated LanceDB dir: ~${estDbMb.toFixed(1)} MB + ~${modelMb} MB one-time model download`);
  console.log(`Total estimated additional disk: ~${totalEstMb.toFixed(1)} MB`);
  const disk = getDisk(path.dirname(CONV_JSONL));
  if (disk) {
    const usedPct = (((disk.totalMB - disk.availMB) / disk.totalMB) * 100).toFixed(1);
    console.log(
      `Disk (data volume): ${(disk.availMB / 1024).toFixed(1)} GB available ` +
        `of ${(disk.totalMB / 1024).toFixed(1)} GB (${usedPct}% used)`,
    );
    console.log(
      disk.availMB > totalEstMb * 5
        ? "Verdict: SAFE to download — estimates are <20% of available disk."
        : "Verdict: REVIEW NEEDED — estimates are large relative to available disk.",
    );
  } else {
    console.log("Available disk: unknown via statfs (run `df -h .` manually before approving).");
  }
  console.log("Approve this size, then run `npm run embeddings` without --report-only.");
  console.log("Full embedding implementation lands in the retrieval phase; this gate stays.");
}

interface Conversation {
  conversationId: string;
  customerMessage: string;
  supportResponse: string;
}

function loadCorpus(): Conversation[] {
  const rows: Conversation[] = [];
  for (const line of fs.readFileSync(CONV_JSONL, "utf8").split("\n")) {
    if (!line.trim()) continue;
    const p = JSON.parse(line) as Conversation;
    if (p.conversationId && p.customerMessage?.trim() && p.supportResponse?.trim()) rows.push(p);
  }
  return rows;
}

async function build(): Promise<void> {
  if (!fs.existsSync(CONV_JSONL)) {
    console.error(`Missing corpus: ${CONV_JSONL}. Run data pipeline first.`);
    process.exit(1);
  }
  const started = Date.now();
  const diskBefore = getDisk(path.dirname(CONV_JSONL));
  console.log(
    `Disk before: ${diskBefore ? `${(diskBefore.availMB / 1024).toFixed(1)} GB available` : "unknown"} ` +
      `(model downloads to ${TRANSFORMERS_CACHE_DIR})`,
  );

  const corpus = loadCorpus();
  console.log(`Loaded ${corpus.length.toLocaleString()} Apple conversations (jsonl, verbatim texts).`);
  if (corpus.length === 0) {
    console.error("Empty corpus, refusing to build an empty index.");
    process.exit(1);
  }

  // Embed customer messages in batches. First call downloads the model (approval was given).
  const batches = chunk(corpus, EMBED_BATCH_SIZE);
  console.log(`Embedding ${batches.length.toLocaleString()} batches of ${EMBED_BATCH_SIZE} with ${EMBEDDING_MODEL}...`);
  const rows: ExampleRow[] = [];
  let done = 0;
  for (const [i, batch] of batches.entries()) {
    const vectors = await embedBatch(batch.map((c) => c.customerMessage));
    for (let j = 0; j < batch.length; j++) {
      const c = batch[j];
      const v = vectors[j];
      if (v.length !== EMBEDDING_DIMS) throw new Error(`bad dims at batch ${i} row ${j}`);
      rows.push({
        exampleId: c.conversationId,
        customerMessage: c.customerMessage,
        supportResponse: c.supportResponse,
        vector: v,
      });
    }
    done += batch.length;
    if ((i + 1) % 25 === 0 || i === batches.length - 1) {
      const el = ((Date.now() - started) / 1000).toFixed(0);
      console.log(`  embedded ${done.toLocaleString()}/${corpus.length.toLocaleString()} (${el}s elapsed)`);
    }
  }

  console.log(`Writing LanceDB table -> ${LANCEDB_DIR} (mode: overwrite)...`);
  const table = await createTable(rows);
  const count = await table.countRows();
  console.log(`Indexed rows: ${count.toLocaleString()}`);
  if (count !== rows.length) throw new Error(`index count mismatch: ${count} vs ${rows.length}`);

  writeStats(corpus.length, count, started, diskBefore);
}

async function main(): Promise<void> {
  if (process.argv.includes("--report-only")) {
    reportOnly();
    return;
  }
  const shardArg = process.argv.find((a) => a.startsWith("--shard="));
  if (shardArg) {
    // --shard=K/N : embed slice K of N, write tmp/embed-shards/shard-K.json (no DB write).
    const m = /^--shard=(\d+)\/(\d+)$/.exec(shardArg);
    if (!m) throw new Error(`bad --shard flag (want --shard=K/N): ${shardArg}`);
    await buildShard(Number(m[1]), Number(m[2]));
    return;
  }
  if (process.argv.includes("--merge")) {
    await mergeShards();
    return;
  }
  await build();
}

/** Embed one slice of the corpus; used to parallelize across CPU cores. */
async function buildShard(shard: number, numShards: number): Promise<void> {
  if (!fs.existsSync(CONV_JSONL)) {
    console.error(`Missing corpus: ${CONV_JSONL}. Run data pipeline first.`);
    process.exit(1);
  }
  const started = Date.now();
  const corpus = loadCorpus();
  const slice = corpus.filter((_, i) => i % numShards === shard);
  console.log(`Shard ${shard}/${numShards}: ${slice.length.toLocaleString()} of ${corpus.length.toLocaleString()} conversations.`);
  const batches = chunk(slice, EMBED_BATCH_SIZE);
  const rows: ExampleRow[] = [];
  let done = 0;
  for (const [i, batch] of batches.entries()) {
    const vectors = await embedBatch(batch.map((c) => c.customerMessage));
    for (let j = 0; j < batch.length; j++) {
      const c = batch[j];
      const v = vectors[j];
      if (v.length !== EMBEDDING_DIMS) throw new Error(`bad dims at batch ${i} row ${j}`);
      rows.push({ exampleId: c.conversationId, customerMessage: c.customerMessage, supportResponse: c.supportResponse, vector: v });
    }
    done += batch.length;
    if ((i + 1) % 10 === 0 || i === batches.length - 1) {
      console.log(`  [shard ${shard}] embedded ${done.toLocaleString()}/${slice.length.toLocaleString()} (${((Date.now() - started) / 1000).toFixed(0)}s)`);
    }
  }
  fs.mkdirSync(SHARD_DIR, { recursive: true });
  const outFile = path.join(SHARD_DIR, `shard-${shard}.json`);
  fs.writeFileSync(outFile, JSON.stringify(rows));
  console.log(`[shard ${shard}] wrote ${rows.length.toLocaleString()} rows -> ${outFile} (${((Date.now() - started) / 1000).toFixed(0)}s total)`);
}

/** Merge shard files into the LanceDB table + stats (single writer). */
async function mergeShards(): Promise<void> {
  const started = Date.now();
  const diskBefore = getDisk(path.dirname(CONV_JSONL));
  const corpus = loadCorpus();
  if (!fs.existsSync(SHARD_DIR)) {
    console.error(`No shards in ${SHARD_DIR}. Run --shard=K/N workers first.`);
    process.exit(1);
  }
  const seen = new Map<string, ExampleRow>();
  const files = fs.readdirSync(SHARD_DIR).filter((f) => f.endsWith(".json")).sort();
  for (const f of files) {
    const rows = JSON.parse(fs.readFileSync(path.join(SHARD_DIR, f), "utf8")) as ExampleRow[];
    for (const r of rows) {
      if (!r.exampleId || !r.customerMessage?.trim() || !r.supportResponse?.trim() || r.vector?.length !== EMBEDDING_DIMS) {
        throw new Error(`bad row in ${f} (id=${r?.exampleId})`);
      }
      seen.set(r.exampleId, r);
    }
    console.log(`merged ${f}: ${rows.length.toLocaleString()} rows`);
  }
  console.log(`Merging ${seen.size.toLocaleString()} unique rows vs corpus ${corpus.length.toLocaleString()}...`);
  if (seen.size !== corpus.length) {
    throw new Error(`shard coverage mismatch: ${seen.size} unique vs ${corpus.length} corpus (missing=${corpus.length - seen.size})`);
  }
  // Deterministic corpus order.
  const ordered = corpus.map((c) => {
    const r = seen.get(c.conversationId);
    if (!r) throw new Error(`missing id ${c.conversationId}`);
    return r;
  });
  console.log(`Writing LanceDB table -> ${LANCEDB_DIR} (mode: overwrite)...`);
  const table = await createTable(ordered);
  const count = await table.countRows();
  console.log(`Indexed rows: ${count.toLocaleString()}`);
  if (count !== ordered.length) throw new Error(`index count mismatch: ${count} vs ${ordered.length}`);
  writeStats(corpus.length, count, started, diskBefore);
}

function writeStats(
  corpusPairs: number,
  count: number,
  started: number,
  diskBefore: { availMB: number; totalMB: number } | null,
): void {
  const diskAfter = getDisk(path.dirname(CONV_JSONL));
  const modelBytes = dirBytes(TRANSFORMERS_CACHE_DIR);
  const indexBytes = dirBytes(LANCEDB_DIR);
  const stats = {
    model: EMBEDDING_MODEL,
    dims: EMBEDDING_DIMS,
    vectorSource: "customerMessage (verbatim; supportResponse stored, not embedded)",
    corpusPairs,
    indexedExamples: count,
    corpusBytes: fs.statSync(CONV_JSONL).size,
    modelBytes,
    modelMB: Number((modelBytes / 1024 / 1024).toFixed(2)),
    indexBytes,
    indexMB: Number((indexBytes / 1024 / 1024).toFixed(2)),
    diskBeforeMB: diskBefore,
    diskAfterMB: diskAfter,
    durationSec: Number(((Date.now() - started) / 1000).toFixed(1)),
    builtAt: new Date().toISOString(),
  };
  fs.writeFileSync(EMBEDDINGS_STATS_JSON, JSON.stringify(stats, null, 2));
  console.log(`Stats -> ${EMBEDDINGS_STATS_JSON}`);
  console.log(
    `Done: ${count.toLocaleString()} examples, model ${stats.modelMB} MB, ` +
      `index ${stats.indexMB} MB, ` +
      `disk now ${(diskAfter ? (diskAfter.availMB / 1024).toFixed(1) : "?")} GB available.`,
  );
}

main().catch((err) => {
  console.error("embeddings failed:", err);
  process.exit(1);
});
