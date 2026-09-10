/**
 * Streaming dataset inspector — never loads the full 3M-row CSV into memory.
 * Usage: npm run data:inspect [-- --max-rows N]
 *
 * Evidence-based Apple account identification (mod #1):
 * ranks author_id values matching /apple/i by outbound volume instead of assuming.
 */
import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";

const RAW_CSV = path.resolve("data/raw/twcs.csv");
const MAX_ROWS_FLAG = process.argv.find((a) => a.startsWith("--max-rows="));
const MAX_ROWS = MAX_ROWS_FLAG ? Number(MAX_ROWS_FLAG.split("=")[1]) : Number.POSITIVE_INFINITY;

interface Row {
  tweet_id?: string;
  author_id?: string;
  inbound?: string;
  created_at?: string;
  text?: string;
  response_tweet_id?: string;
  in_response_to_tweet_id?: string;
}

function failMissing(): never {
  console.error(`Missing dataset: ${RAW_CSV}`);
  console.error("Download it first (not committed to git):");
  console.error("  mkdir -p data/raw");
  console.error("  kaggle datasets download thoughtvector/customer-support-on-twitter -p data/raw --unzip");
  console.error("See https://www.kaggle.com/datasets/thoughtvector/customer-support-on-twitter (CC BY-NC-SA 4.0)");
  process.exit(1);
}

async function main(): Promise<void> {
  if (!fs.existsSync(RAW_CSV)) failMissing();
  const stat = fs.statSync(RAW_CSV);
  console.log(`Inspecting ${RAW_CSV} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);

  const authorStats = new Map<string, { total: number; inbound: number; outbound: number; sampleText: string }>();
  let rows = 0;
  let inboundCount = 0;
  let outboundCount = 0;
  let withResponseId = 0;
  let withInReplyTo = 0;
  const columns = new Set<string>();

  const stream = fs.createReadStream(RAW_CSV, "utf8");
  await new Promise<void>((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Papa.parse(stream as any, {
      header: true,
      skipEmptyLines: true,
      chunkSize: 1024 * 1024 * 5,
      chunk: (results) => {
        for (const row of results.data as Row[]) {
          if (rows >= MAX_ROWS) break;
          rows++;
          for (const k of Object.keys(row)) columns.add(k);
          const inbound = String(row.inbound ?? "").toLowerCase() === "true";
          if (inbound) inboundCount++;
          else outboundCount++;
          if (row.response_tweet_id && row.response_tweet_id.trim() !== "") withResponseId++;
          if (row.in_response_to_tweet_id && row.in_response_to_tweet_id.trim() !== "") withInReplyTo++;
          const author = (row.author_id ?? "").trim() || "(missing)";
          const entry = authorStats.get(author) ?? { total: 0, inbound: 0, outbound: 0, sampleText: "" };
          entry.total++;
          if (inbound) entry.inbound++;
          else entry.outbound++;
          if (!entry.sampleText && row.text) entry.sampleText = row.text.slice(0, 140);
          authorStats.set(author, entry);
        }
      },
      complete: () => resolve(),
      error: (err: unknown) => reject(err),
    });
  });

  console.log(`\nRows scanned: ${rows.toLocaleString()}`);
  console.log(`Columns: ${[...columns].join(", ")}`);
  console.log(`Inbound (customer): ${inboundCount.toLocaleString()} | Outbound (brand): ${outboundCount.toLocaleString()}`);
  console.log(`Rows with response_tweet_id: ${withResponseId.toLocaleString()}`);
  console.log(`Rows with in_response_to_tweet_id: ${withInReplyTo.toLocaleString()}`);

  const appleCandidates = [...authorStats.entries()]
    .filter(([author]) => /apple/i.test(author))
    .sort((a, b) => b[1].outbound - a[1].outbound);

  console.log(`\nAuthor_ids matching /apple/i: ${appleCandidates.length}`);
  console.log("Rank | author_id | total | outbound | inbound | sample");
  appleCandidates.slice(0, 20).forEach(([author, s], i) => {
    console.log(
      `${String(i + 1).padStart(4)} | ${author} | ${s.total.toLocaleString()} | ${s.outbound.toLocaleString()} | ${s.inbound.toLocaleString()} | ${s.sampleText.replace(/\s+/g, " ").slice(0, 90)}`,
    );
  });

  if (appleCandidates.length > 0) {
    const [topId, topStats] = appleCandidates[0];
    const outboundShare = topStats.total > 0 ? ((topStats.outbound / topStats.total) * 100).toFixed(1) : "0.0";
    console.log(`\nEvidence-based candidate for Apple Support: "${topId}"`);
    console.log(`  outbound ${topStats.outbound.toLocaleString()} / total ${topStats.total.toLocaleString()} (${outboundShare}% outbound)`);
    console.log("  Do NOT treat this as final until you confirm the sample texts are support replies.");
    console.log("  Next: npm run data:filter  (writes data/processed/apple_identity.json with this evidence)");
  } else {
    console.log("\nNo author_id matched /apple/i. Inspect top outbound authors manually before filtering.");
    const topOutbound = [...authorStats.entries()].sort((a, b) => b[1].outbound - a[1].outbound).slice(0, 10);
    for (const [author, s] of topOutbound) console.log(`  ${author}: outbound=${s.outbound.toLocaleString()} sample="${s.sampleText.slice(0, 80)}"`);
  }
}

main().catch((err) => {
  console.error("inspect failed:", err);
  process.exit(1);
});
