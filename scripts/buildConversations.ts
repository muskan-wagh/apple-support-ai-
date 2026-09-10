/**
 * Reconstruct customer -> Apple Support pairs using ACTUAL response relationships (mod #6: no random pairing).
 * Usage: npm run data:conversations
 * Input: data/processed/apple_threads.csv (+ apple_identity.json)
 * Output: data/processed/conversations.jsonl + conversations.stats.json
 */
import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";

const IN_CSV = path.resolve("data/processed/apple_threads.csv");
const IDENTITY_JSON = path.resolve("data/processed/apple_identity.json");
const OUT_JSONL = path.resolve("data/processed/conversations.jsonl");
const OUT_STATS = path.resolve("data/processed/conversations.stats.json");

export interface TweetRow {
  tweet_id: string;
  author_id: string;
  inbound: string;
  created_at: string;
  text: string;
  response_tweet_id: string;
  in_response_to_tweet_id: string;
}

export interface Conversation {
  conversationId: string;
  customerMessage: string;
  supportResponse: string;
  timestamp: string;
  customerTweetId: string;
  supportTweetId: string;
}

/** Pure, testable reconstruction from rows. No random pairing. */
export function reconstructConversations(rows: TweetRow[], brandAuthorId: string): Conversation[] {
  const byId = new Map<string, TweetRow>();
  for (const r of rows) if (r.tweet_id) byId.set(r.tweet_id, r);
  const out: Conversation[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const isCustomer = String(row.inbound).toLowerCase() === "true";
    if (!isCustomer || !row.response_tweet_id) continue;
    const reply = byId.get(row.response_tweet_id);
    if (!reply) continue;
    if (reply.author_id !== brandAuthorId) continue; // only Apple Support responses (mod: no other brands)
    if (!row.text?.trim() || !reply.text?.trim()) continue;
    const key = `${row.tweet_id}->${reply.tweet_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      conversationId: key,
      customerMessage: row.text.trim(),
      supportResponse: reply.text.trim(),
      timestamp: row.created_at || reply.created_at || "",
      customerTweetId: row.tweet_id,
      supportTweetId: reply.tweet_id,
    });
  }
  return out;
}

async function main(): Promise<void> {
  if (!fs.existsSync(IN_CSV)) {
    console.error(`Missing input: ${IN_CSV}\nRun npm run data:filter first.`);
    process.exit(1);
  }
  if (!fs.existsSync(IDENTITY_JSON)) {
    console.error(`Missing identity: ${IDENTITY_JSON}\nRun npm run data:filter first.`);
    process.exit(1);
  }
  const brandAuthorId = (JSON.parse(fs.readFileSync(IDENTITY_JSON, "utf8")) as { brandAuthorId: string }).brandAuthorId;
  const text = fs.readFileSync(IN_CSV, "utf8");
  const parsed = Papa.parse<TweetRow>(text, { header: true, skipEmptyLines: true });
  const rows = (parsed.data as TweetRow[]).filter((r) => r.tweet_id && r.text);
  const convos = reconstructConversations(rows, brandAuthorId);

  // Deduplicate identical customer+support text pairs (keeps retrieval corpus clean, mod #3).
  const deduped = new Map<string, Conversation>();
  for (const c of convos) {
    const key = `${c.customerMessage}\n---\n${c.supportResponse}`;
    if (!deduped.has(key)) deduped.set(key, c);
  }
  const finalConvos = [...deduped.values()];
  fs.writeFileSync(OUT_JSONL, finalConvos.map((c) => JSON.stringify(c)).join("\n") + (finalConvos.length ? "\n" : ""));
  const bytes = fs.existsSync(OUT_JSONL) ? fs.statSync(OUT_JSONL).size : 0;
  const stats = {
    brandAuthorId,
    inputRows: rows.length,
    rawPairs: convos.length,
    dedupedPairs: finalConvos.length,
    duplicatesRemoved: convos.length - finalConvos.length,
    outputBytes: bytes,
    outputMB: Number((bytes / 1024 / 1024).toFixed(2)),
    method: "join inbound.response_tweet_id -> outbound tweet_id where author == brand; drop empty/dedup identical pairs",
  };
  fs.writeFileSync(OUT_STATS, JSON.stringify(stats, null, 2));
  console.log(`Pairs: ${convos.length.toLocaleString()} raw -> ${finalConvos.length.toLocaleString()} deduped (${stats.outputMB} MB) -> ${OUT_JSONL}`);
  console.log(`Stats -> ${OUT_STATS}`);
  console.log("Embedding gate (mod #5): run `npm run embeddings -- --report-only` before embedding this corpus.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("conversations build failed:", err);
    process.exit(1);
  });
}
