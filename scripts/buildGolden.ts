/**
 * Golden candidate sampler — Phase 3.
 * Stratified sample of 200 Apple conversations by weak intent label (assignIntent),
 * split 100 dev / 100 test (stratified, seeded). Output is CANDIDATES for human
 * validation only — final golden files are written after manual review.
 * Usage: npm run golden:sample (add script) or npx tsx scripts/buildGolden.ts --sample
 */
import fs from "node:fs";
import path from "node:path";
import { assignIntent, type IntentName } from "../src/intents/taxonomy.js";
import { CONVERSATIONS_JSONL } from "../src/retrieval/config.js";

const OUT_DIR = path.resolve("data/golden");
const QUOTA: Record<IntentName, number> = {
  account_login: 16,
  purchase_billing: 16,
  backup_sync: 12,
  battery_power: 22,
  connectivity: 16,
  device_hardware: 16,
  software_update: 28,
  software_quality: 20,
  apps_services: 16,
  howto_settings: 12,
  other: 26,
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Convo {
  conversationId: string;
  customerMessage: string;
  supportResponse: string;
}

function main(): void {
  const onlySample = process.argv.includes("--sample");
  if (!onlySample) {
    console.log("Use --sample to write candidates. Final goldens are written after manual validation.");
    return;
  }
  const rand = mulberry32(42);
  const buckets = new Map<IntentName, Convo[]>();
  let total = 0;
  for (const line of fs.readFileSync(CONVERSATIONS_JSONL, "utf8").split("\n")) {
    if (!line.trim()) continue;
    const p = JSON.parse(line) as Convo;
    if (!p.conversationId || !p.customerMessage?.trim() || !p.supportResponse?.trim()) continue;
    const w = assignIntent(p.customerMessage);
    if (!buckets.has(w)) buckets.set(w, []);
    buckets.get(w)!.push(p);
    total++;
  }
  console.log(`corpus=${total}`);
  for (const [k, v] of buckets) console.log(`  weak ${k}: ${v.length}`);
  // Seeded shuffle each bucket, take quota
  const picked: Array<Convo & { weakIntent: IntentName }> = [];
  for (const [intent, quota] of Object.entries(QUOTA) as Array<[IntentName, number]>) {
    const pool = buckets.get(intent) ?? [];
    // Fisher-Yates with seeded rand
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [pool[i], pool[j]] = [pool[j]!, pool[i]!];
    }
    if (pool.length < quota) throw new Error(`not enough ${intent}: ${pool.length} < ${quota}`);
    for (const c of pool.slice(0, quota)) picked.push({ ...c, weakIntent: intent });
  }
  // Global shuffle then stratified split: split each intent half/half
  console.log(`picked=${picked.length}`);
  const dev: typeof picked = [];
  const test: typeof picked = [];
  for (const [intent] of Object.entries(QUOTA) as Array<[IntentName, number]>) {
    const group = picked.filter((p) => p.weakIntent === intent);
    // already shuffled; split half
    const half = group.length / 2;
    dev.push(...group.slice(0, half));
    test.push(...group.slice(half));
  }
  // Shuffle dev/test order deterministically
  for (const arr of [dev, test]) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "candidates-dev.jsonl"), dev.map((r) => JSON.stringify(r)).join("\n") + "\n");
  fs.writeFileSync(path.join(OUT_DIR, "candidates-test.jsonl"), test.map((r) => JSON.stringify(r)).join("\n") + "\n");
  console.log(`wrote candidates-dev.jsonl (${dev.length}) + candidates-test.jsonl (${test.length})`);
}
main();
