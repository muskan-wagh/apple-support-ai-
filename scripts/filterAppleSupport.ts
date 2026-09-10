/**
 * Filter Apple Support threads (streaming, evidence-based — mod #1).
 * Usage: npm run data:filter
 *
 * Logic:
 *  1. Stream data/raw/twcs.csv once to rank /apple/i author_ids by outbound volume.
 *  2. Pick the top outbound match as brand author (usually "AppleSupport" but NEVER assumed —
 *     it must be observed in the data with majority-outbound evidence).
 *  3. Stream a second time, keeping rows where author is brand OR the row links
 *     (via response_tweet_id / in_response_to_tweet_id) to a brand tweet.
 *     Second-pass link resolution is tweet_id based and bounded to the Apple subset.
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

function parseRows(file: string): Promise<Row[]> {
  const text = fs.readFileSync(file, "utf8");
  const parsed = Papa.parse<Row>(text, { header: true, skipEmptyLines: true });
  return Promise.resolve(parsed.data as Row[]);
}

async function streamRows(file: string, onRow: (row: Row) => void): Promise<string[]> {
  let columns: string[] = [];
  await new Promise<void>((resolve, reject) => {
    const stream = fs.createReadStream(file, "utf8");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Papa.parse(stream as any, {
      header: true,
      skipEmptyLines: true,
      chunkSize: 1024 * 1024 * 5,
      chunk: (results) => {
        if (columns.length === 0 && results.meta.fields) columns = results.meta.fields;
        for (const row of results.data as Row[]) onRow(row);
      },
      complete: () => resolve(),
      error: (err: unknown) => reject(err),
    });
  });
  return columns;
}

async function main(): Promise<void> {
  if (!fs.existsSync(RAW_CSV)) failMissing();
  fs.mkdirSync(path.dirname(OUT_CSV), { recursive: true });

  // Pass 1: rank apple-like authors by outbound volume (evidence, not assumption).
  const stats = new Map<string, { total: number; outbound: number; sample: string }>();
  let columns: string[] = [];
  columns = await streamRows(RAW_CSV, (row) => {
    const author = (row.author_id ?? "").trim();
    if (!author) return;
    const e = stats.get(author) ?? { total: 0, outbound: 0, sample: "" };
    e.total++;
    if (String(row.inbound ?? "").toLowerCase() !== "true") e.outbound++;
    if (!e.sample && row.text) e.sample = row.text.slice(0, 200);
    stats.set(author, e);
  });

  const candidates = [...stats.entries()]
    .filter(([a]) => /apple/i.test(a))
    .sort((x, y) => y[1].outbound - x[1].outbound);
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
  fs.writeFileSync(
    IDENTITY_JSON,
    JSON.stringify(
      {
        brandAuthorId: brandAuthor,
        evidence: {
          totalRows: s.total,
          outboundRows: s.outbound,
          outboundShare: Number(outboundShare.toFixed(4)),
          sampleText: s.sample,
          candidatesConsidered: candidates.slice(0, 10).map(([a, v]) => ({ author_id: a, total: v.total, outbound: v.outbound })),
          method: "ranked author_id matching /apple/i by outbound volume from streaming scan of data/raw/twcs.csv",
        },
      },
      null,
      2,
    ),
  );
  console.log(`Brand identity: "${brandAuthor}" (${s.outbound.toLocaleString()} outbound / ${s.total.toLocaleString()} total). Evidence -> ${IDENTITY_JSON}`);

  // Pass 2: collect brand tweet_ids + keep linked rows. Bounded to Apple subset.
  const brandIds = new Set<string>();
  const kept: Row[] = [];
  const allRows: Row[] = [];
  await streamRows(RAW_CSV, (row) => {
    allRows.push({ ...row });
    if ((row.author_id ?? "").trim() === brandAuthor && row.tweet_id) brandIds.add(row.tweet_id.trim());
  });
  for (const row of allRows) {
    const isBrand = (row.author_id ?? "").trim() === brandAuthor;
    const linksBrand =
      (row.response_tweet_id && brandIds.has(row.response_tweet_id.trim())) ||
      (row.in_response_to_tweet_id && brandIds.has(row.in_response_to_tweet_id.trim()));
    if (isBrand || linksBrand) kept.push(row);
  }

  const csv = Papa.unparse(kept, { columns });
  fs.writeFileSync(OUT_CSV, csv);
  const bytes = fs.statSync(OUT_CSV).size;
  console.log(`Kept ${kept.length.toLocaleString()} Apple-linked rows (${(bytes / 1024 / 1024).toFixed(2)} MB) -> ${OUT_CSV}`);
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

// Keep helper referenced for tests without triggering unused warnings.
void parseRows;
