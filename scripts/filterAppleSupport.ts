/**
 * Filter Apple Support threads (bounded-memory streaming, evidence-based — mod #1).
 * Usage: npm run data:filter
 *
 * Logic:
 *  1. Pass 1 streams data/raw/twcs.csv, tracking ONLY /apple/i authors
 *     (stats + outbound tweet_ids — bounded to the ~100k Apple subset, never the 2.8M rows).
 *  2. Pick the top outbound apple-like author as brand (NEVER assumed —
 *     must be observed with majority-outbound evidence).
 *  3. Pass 2 streams again, writing rows where author is brand OR the row links
 *     (via response_tweet_id / in_response_to_tweet_id) to a brand tweet.
 *     Output is written incrementally per chunk; no row accumulation in memory.
 *  4. Write data/processed/apple_threads.csv + apple_identity.json (evidence).
 */
import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";

const RAW_CSV = path.resolve("data/raw/twcs.csv");
const OUT_CSV = path.resolve("data/processed/apple_threads.csv");
const IDENTITY_JSON = path.resolve("data/processed/apple_identity.json");

interface Row {
  tweet_id?: string;
  author_id?: string;
  inbound?: string;
  created_at?: string;
  text?: string;
  response_tweet_id?: string;
  in_response_to_tweet_id?: string;
  [k: string]: string | undefined;
}

function failMissing(): never {
  console.error(`Missing dataset: ${RAW_CSV}`);
  console.error("  mkdir -p data/raw && kaggle datasets download thoughtvector/customer-support-on-twitter -p data/raw --unzip");
  process.exit(1);
}

async function main(): Promise<void> {
  if (!fs.existsSync(RAW_CSV)) failMissing();
  fs.mkdirSync(path.dirname(OUT_CSV), { recursive: true });

  // ---- Pass 1: rank apple-like authors; collect THEIR outbound tweet_ids only ----
  const stats = new Map<string, { total: number; outbound: number; sample: string }>();
  const appleOutboundIds = new Map<string, Set<string>>();
  let columns: string[] = [];
  let totalRows = 0;

  await new Promise<void>((resolve, reject) => {
    const stream = fs.createReadStream(RAW_CSV, "utf8");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Papa.parse(stream as any, {
      header: true,
      skipEmptyLines: true,
      chunkSize: 1024 * 1024 * 5,
      chunk: (results: Papa.ParseResult<Row>) => {
        if (columns.length === 0 && results.meta.fields) columns = results.meta.fields;
        for (const row of results.data as Row[]) {
          totalRows++;
          const author = (row.author_id ?? "").trim();
          if (!author || !/apple/i.test(author)) continue;
          const e = stats.get(author) ?? { total: 0, outbound: 0, sample: "" };
          e.total++;
          const outbound = String(row.inbound ?? "").toLowerCase() !== "true";
          if (outbound) {
            e.outbound++;
            if (row.tweet_id) {
              let set = appleOutboundIds.get(author);
              if (!set) {
                set = new Set<string>();
                appleOutboundIds.set(author, set);
              }
              set.add(row.tweet_id.trim());
            }
          }
          if (!e.sample && row.text) e.sample = row.text.slice(0, 200);
          stats.set(author, e);
        }
      },
      complete: () => resolve(),
      error: (err: unknown) => reject(err),
    });
  });

  const candidates = [...stats.entries()].sort((x, y) => y[1].outbound - x[1].outbound);
  if (candidates.length === 0) {
    console.error("No author_id matched /apple/i — aborting. Run npm run data:inspect to investigate.");
    process.exit(1);
  }
  const [brandAuthor, s] = candidates[0];
  const outboundShare = s.total ? s.outbound / s.total : 0;
  if (outboundShare < 0.5) {
    console.error(`Top apple-like author "${brandAuthor}" is only ${(outboundShare * 100).toFixed(1)}% outbound — refusing to treat as brand. Inspect manually.`);
    process.exit(1);
  }
  const brandIds = appleOutboundIds.get(brandAuthor) ?? new Set<string>();
  fs.writeFileSync(
    IDENTITY_JSON,
    JSON.stringify(
      {
        brandAuthorId: brandAuthor,
        evidence: {
          totalRows: s.total,
          outboundRows: s.outbound,
          outboundShare: Number(outboundShare.toFixed(4)),
          brandTweetIdsCollected: brandIds.size,
          sampleText: s.sample,
          candidatesConsidered: candidates.slice(0, 10).map(([a, v]) => ({ author_id: a, total: v.total, outbound: v.outbound })),
          method: "ranked author_id matching /apple/i by outbound volume from streaming scan of data/raw/twcs.csv",
        },
      },
      null,
      2,
    ),
  );
  console.log(`Scanned ${totalRows.toLocaleString()} rows. Brand identity: "${brandAuthor}" (${s.outbound.toLocaleString()} outbound / ${s.total.toLocaleString()} total). Evidence -> ${IDENTITY_JSON}`);

  // ---- Pass 2: stream + incrementally write kept rows (chunk-bounded memory) ----
  const out = fs.createWriteStream(OUT_CSV, "utf8");
  let kept = 0;
  let headerWritten = false;

  await new Promise<void>((resolve, reject) => {
    const stream = fs.createReadStream(RAW_CSV, "utf8");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Papa.parse(stream as any, {
      header: true,
      skipEmptyLines: true,
      chunkSize: 1024 * 1024 * 5,
      chunk: (results: Papa.ParseResult<Row>) => {
        const rows = results.data as Row[];
        const keepChunk: Row[] = [];
        for (const row of rows) {
          const isBrand = (row.author_id ?? "").trim() === brandAuthor;
          const linksBrand =
            (row.response_tweet_id != null && row.response_tweet_id.trim() !== "" && brandIds.has(row.response_tweet_id.trim())) ||
            (row.in_response_to_tweet_id != null && row.in_response_to_tweet_id.trim() !== "" && brandIds.has(row.in_response_to_tweet_id.trim()));
          if (isBrand || linksBrand) keepChunk.push(row);
        }
        if (keepChunk.length > 0) {
          // Papa.unparse joins rows with \r\n and emits NO trailing newline.
          // Append \r\n (not \n): Papa auto-detects the file's newline as \r\n,
          // and a bare \n would be treated as a literal char, merging two rows
          // into one TooManyFields record on re-parse (seen: ~4.8k lost rows).
          const csv = Papa.unparse(keepChunk, { columns, header: !headerWritten });
          out.write(csv + "\r\n");
          headerWritten = true;
          kept += keepChunk.length;
        }
      },
      complete: () => resolve(),
      error: (err: unknown) => reject(err),
    });
  });

  await new Promise<void>((resolve, reject) => {
    out.end(() => resolve());
    out.on("error", reject);
  });

  const bytes = fs.statSync(OUT_CSV).size;
  console.log(`Kept ${kept.toLocaleString()} Apple-linked rows (${(bytes / 1024 / 1024).toFixed(2)} MB) -> ${OUT_CSV}`);
  console.log("Note: full 3M rows are NEVER embedded (mod #3). Next: npm run data:conversations");
}

// Exported for unit tests (small in-memory inputs, no file I/O).
export function identifyBrandAuthor(rows: Row[]): { brandAuthorId: string | null; evidence: string } {
  const stats = new Map<string, { total: number; outbound: number }>();
  for (const row of rows) {
    const author = (row.author_id ?? "").trim();
    if (!author || !/apple/i.test(author)) continue;
    const e = stats.get(author) ?? { total: 0, outbound: 0 };
    e.total++;
    if (String(row.inbound ?? "").toLowerCase() !== "true") e.outbound++;
    stats.set(author, e);
  }
  const ranked = [...stats.entries()].sort((a, b) => b[1].outbound - a[1].outbound);
  if (ranked.length === 0) return { brandAuthorId: null, evidence: "no /apple/i author observed" };
  const [id, v] = ranked[0];
  return { brandAuthorId: id, evidence: `outbound ${v.outbound}/${v.total} in sample` };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("filter failed:", err);
    process.exit(1);
  });
}
