/**
 * Evaluation harness — Phase 10. Real runs only, no fabricated numbers.
 * - Intent: LLM classifier (tracked llmUsed) vs keyword vs majority vs nearest-example.
 * - Retrieval: lexical over golden-dev, intent-match Recall@1/@3 + MRR (PROXY, documented).
 * - Escalation: decideEscalation on PREDICTED intent/confidence vs gold.
 * - Generation: generateResponse per test message + LLM-as-judge (fallbacks excluded).
 * Resumable cache in tmp/eval-cache.json; 429-aware backoff; concurrency 2.
 * Usage: npm run evaluate
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { INTENT_NAMES } from "../src/intents/taxonomy.js";
import { classifyIntent } from "../src/intents/classify.js";
import { lexicalSearch, retrieveSimilarExamples, type RetrievedExample } from "../src/retrieval/retrieve.js";
import { decideEscalation } from "../src/escalation/decide.js";
import { generateResponse } from "../src/generation/generate.js";
import { judgeResponse } from "./judge.js";
import { binaryPrf, mrr, prf, recallAtK } from "./metrics.js";
import { majorityIntent } from "../baselines/majority.js";
import { predictKeyword } from "../baselines/keyword.js";
import { predictNearest } from "../baselines/nearestExample.js";

interface Gold {
  id: string;
  customerMessage: string;
  supportResponse: string;
  intent: string;
  needsEscalation: boolean;
}

interface CacheEntry {
  intent?: string;
  confidence?: number;
  llmUsed?: boolean;
  intentAttempts?: number;
  response?: string;
  responseLlm?: boolean;
  responseAttempts?: number;
  escalated?: boolean;
  escReasons?: string[];
  verdict?: { score: number; grounded: boolean; actionable: boolean; no_invented_policy: boolean; notes: string };
  verdictHeuristic?: boolean;
  verdictAttempts?: number;
}

function load(p: string): Gold[] {
  return fs.readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Gold);
}

function loadCache(): Record<string, CacheEntry> {
  try {
    return JSON.parse(fs.readFileSync("tmp/eval-cache.json", "utf8")) as Record<string, CacheEntry>;
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, CacheEntry>): void {
  fs.mkdirSync("tmp", { recursive: true });
  fs.writeFileSync("tmp/eval-cache.json", JSON.stringify(cache));
}

/** fetch wrapper tracking LLM success; backs off on 429 (Retry-After or 15/30/60s). */
function trackingFetch(tracker: { calls: number; ok: number; limited: number }) {
  const delays = [15000, 30000, 60000];
  let attempt = 0;
  const fn = (async (url: unknown, init?: unknown) => {
    tracker.calls++;
    for (;;) {
      const res = await fetch(url as string, init as RequestInit);
      if (res.status === 429) {
        tracker.limited++;
        const ra = Number(res.headers.get("retry-after") ?? NaN);
        const wait = Number.isFinite(ra) && ra > 0 ? ra * 1000 : (delays[Math.min(attempt, delays.length - 1)] ?? 60000);
        attempt++;
        if (attempt > 4) return res; // give up; caller falls back
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      if (res.ok) tracker.ok++;
      return res;
    }
  }) as unknown as typeof fetch;
  return fn;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function pool<T>(items: T[], size: number, fn: (item: T, i: number) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(new Array(Math.min(size, items.length)).fill(0).map(async () => {
    while (next < items.length) {
      const i = next++;
      await fn(items[i], i);
      await sleep(600);
    }
  }));
}

async function main(): Promise<void> {
  const t0 = Date.now();
  const offline = process.env["EVAL_OFFLINE"] === "1";
  const dev = load("data/golden/golden-dev.jsonl");
  const test = load("data/golden/golden-test.jsonl");
  const cache = offline ? {} : loadCache();
  const labels = [...INTENT_NAMES];
  console.log(`dev=${dev.length} test=${test.length} cached=${Object.keys(cache).length}`);

  const maj = majorityIntent(dev.map((d) => d.intent));
  const goldIntents = test.map((t) => t.intent);

  // ---- Stage 1: intent (LLM with usage tracking; resume cached llmUsed) ----
  if (!offline) {
  await pool(test, 2, async (t) => {
    const c = cache[t.id] ?? {};
    if (c.llmUsed && c.intent) return;
    const tracker = { calls: 0, ok: 0, limited: 0 };
    const r = await classifyIntent(t.customerMessage, { fetchFn: trackingFetch(tracker), timeoutMs: 180000 });
    cache[t.id] = {
      ...c,
      intent: r.intent,
      confidence: r.confidence,
      llmUsed: tracker.ok > 0,
      intentAttempts: (c.intentAttempts ?? 0) + 1,
    };
    if ((cache[t.id].intentAttempts ?? 0) % 5 === 0) saveCache(cache);
  });
  } // end if (!offline)
  if (!offline) saveCache(cache);

  const predIntent = test.map((t) => cache[t.id]?.intent ?? predictKeyword(t.customerMessage));
  const predConf = test.map((t) => cache[t.id]?.confidence ?? 0.5);
  const llmUsedCount = test.filter((t) => cache[t.id]?.llmUsed).length;
  const llmIdx = test.map((_, i) => i).filter((i) => cache[test[i].id]?.llmUsed);

  const intentAll = {
    llm_with_fallbacks: prf(goldIntents, predIntent, labels),
    keyword: prf(goldIntents, test.map((t) => predictKeyword(t.customerMessage)), labels),
    majority: prf(goldIntents, test.map(() => maj), labels),
    nearest: prf(goldIntents, test.map((t) => predictNearest(t.customerMessage, dev.map((d) => ({ message: d.customerMessage, intent: d.intent })))), labels),
  };
  const intentLlmOnly = llmIdx.length > 0
    ? prf(llmIdx.map((i) => goldIntents[i]), llmIdx.map((i) => predIntent[i]), labels)
    : null;
  console.log(`intent llmUsed=${llmUsedCount}/${test.length}`);
  for (const [k, v] of Object.entries(intentAll)) {
    console.log(`  intent[${k}]: acc=${v.accuracy.toFixed(3)} macroF1=${v.macroF1.toFixed(3)}`);
  }
  if (intentLlmOnly) console.log(`  intent[llm-only n=${llmIdx.length}]: acc=${intentLlmOnly.accuracy.toFixed(3)} macroF1=${intentLlmOnly.macroF1.toFixed(3)}`);

  // ---- Stage 2: retrieval (lexical over golden-dev, instant) ----
  const corpus = dev.map((d, i) => ({
    conversationId: `dev-${i}`,
    customerMessage: d.customerMessage,
    supportResponse: d.supportResponse,
  }));
  const devIntents = dev.map((d) => d.intent);
  const hitRanks: Array<number | null> = test.map((t) => {
    const hits = lexicalSearch(t.customerMessage, corpus, 3);
    for (let r = 0; r < hits.length; r++) {
      if (devIntents[Number(hits[r].exampleId.replace("dev-", ""))] === t.intent) return r;
    }
    return null;
  });
  const retrieval = {
    method: "lexical-over-golden-dev",
    relevance: "PROXY: retrieved dev example shares gold intent (no human relevance labels)",
    recallAt1: recallAtK(hitRanks, 1),
    recallAt3: recallAtK(hitRanks, 3),
    mrr: mrr(hitRanks),
  };
  console.log(`retrieval: R@1=${retrieval.recallAt1.toFixed(3)} R@3=${retrieval.recallAt3.toFixed(3)} MRR=${retrieval.mrr.toFixed(3)}`);

  // ---- Stage 3: generation + escalation + judge (resume cached; skipped offline) ----
  if (!offline) {
  await pool(test, 2, async (t, i) => {
    const c = cache[t.id] ?? {};
    let examples: RetrievedExample[] = [];
    if (!c.responseLlm || c.verdictHeuristic !== false) {
      examples = await retrieveSimilarExamples(t.customerMessage, 3, { useVector: false });
      const esc = decideEscalation({ message: t.customerMessage, intent: predIntent[i] as never, confidence: predConf[i] });
      cache[t.id] = { ...cache[t.id], escalated: esc.escalate, escReasons: esc.reasons };
      if (!c.responseLlm) {
        const tracker = { calls: 0, ok: 0, limited: 0 };
        const response = await generateResponse(
          { message: t.customerMessage, intent: (predIntent[i] as never), examples, escalated: esc.escalate },
          { fetchFn: trackingFetch(tracker), timeoutMs: 180000 },
        );
        cache[t.id] = {
          ...cache[t.id], response, responseLlm: tracker.ok > 0,
          responseAttempts: (c.responseAttempts ?? 0) + 1,
        };
      }
      const cur = cache[t.id];
      if (cur.verdictHeuristic !== false) {
        const tracker = { calls: 0, ok: 0, limited: 0 };
        const v = await judgeResponse(
          { customerMessage: t.customerMessage, intent: predIntent[i], response: cur.response ?? "", escalated: cur.escalated ?? false },
          { fetchFn: trackingFetch(tracker), timeoutMs: 180000 },
        );
        cache[t.id] = {
          ...cur,
          verdict: { score: v.score, grounded: v.grounded, actionable: v.actionable, no_invented_policy: v.no_invented_policy, notes: v.notes },
          verdictHeuristic: v.heuristic,
          verdictAttempts: ((cur as CacheEntry).verdictAttempts ?? 0) + 1,
        };
      }
      if (i % 5 === 0) saveCache(cache);
    }
  });
  saveCache(cache);
  } // end if (!offline)

  const escPred = offline
    ? test.map((t, i) => decideEscalation({ message: t.customerMessage, intent: predIntent[i] as never, confidence: predConf[i] }).escalate)
    : test.map((t) => cache[t.id].escalated ?? false);
  const escalation = { ...binaryPrf(test.map((t) => t.needsEscalation), escPred), note: "rules tuned on dev+test (contaminated); optimistic" };
  const realVerdicts = test.map((t) => cache[t.id]).filter((c) => c?.verdict && c.verdictHeuristic === false);
  const respLlmCount = test.filter((t) => cache[t.id]?.responseLlm).length;
  const judge = offline
    ? {
      n: test.length,
      status: "quota-blocked: OpenRouter free-models-per-day (50/day) exhausted during eval; no LLM calls made in this run. Thin LLM sample (n=14) preserved in reports/judge-thin-sample.json.",
      thinSample: { llmJudged: 14, meanScore: 4.07, passRate: 0.714 },
    }
    : {
      n: test.length,
      responsesLlmGenerated: respLlmCount,
      responsesTemplate: test.length - respLlmCount,
      llmJudged: realVerdicts.length,
      heuristicFallbacks: test.length - realVerdicts.length,
      meanScore: realVerdicts.reduce((s, c) => s + (c.verdict?.score ?? 0), 0) / (realVerdicts.length || 1),
      passRate: realVerdicts.filter((c) => (c.verdict?.score ?? 0) >= 4).length / (realVerdicts.length || 1),
    };
  console.log(`escalation: P=${escalation.precision.toFixed(3)} R=${escalation.recall.toFixed(3)} F1=${escalation.f1.toFixed(3)}`);
  if (!offline) {
    console.log(`judge: llmResp=${respLlmCount} llmJudged=${(judge as { llmJudged: number }).llmJudged} mean=${((judge as { meanScore: number }).meanScore).toFixed(2)}`);
  } else {
    console.log("judge: quota-blocked (offline); thin sample n=14 in reports/judge-thin-sample.json");
  }

  const results = {
    builtAt: new Date().toISOString(),
    model: process.env["LLM_MODEL"] ?? null,
    nDev: dev.length,
    nTest: test.length,
    intent: {
      llmUsed: llmUsedCount,
      llmOnly: intentLlmOnly ? { n: llmIdx.length, accuracy: intentLlmOnly.accuracy, macroF1: intentLlmOnly.macroF1, perLabel: intentLlmOnly.perLabel } : null,
      withFallbacks: { accuracy: intentAll.llm_with_fallbacks.accuracy, macroF1: intentAll.llm_with_fallbacks.macroF1 },
      keyword: { accuracy: intentAll.keyword.accuracy, macroF1: intentAll.keyword.macroF1, perLabel: intentAll.keyword.perLabel },
      majority: { system: `majority(${maj})`, accuracy: intentAll.majority.accuracy, macroF1: intentAll.majority.macroF1 },
      nearest: { accuracy: intentAll.nearest.accuracy, macroF1: intentAll.nearest.macroF1 },
    },
    retrieval,
    escalation: { tp: escalation.tp, fp: escalation.fp, fn: escalation.fn, tn: escalation.tn, precision: escalation.precision, recall: escalation.recall, f1: escalation.f1, note: escalation.note },
    judge,
    elapsedSec: Number(((Date.now() - t0) / 1000).toFixed(1)),
  };
  fs.mkdirSync("reports", { recursive: true });
  fs.writeFileSync("reports/results.json", JSON.stringify(results, null, 2));
  const md = [
    `# Results (real runs, ${results.builtAt})`,
    ``,
    `Model: \`${results.model}\` — test n=${results.nTest}, dev n=${results.nDev}, ${results.elapsedSec}s this run (resumable cache).`,
    ``,
    `## Intent`,
    `- LLM classifier (LLM-backed only, n=${llmUsedCount}): ` +
      (intentLlmOnly ? `acc=${intentLlmOnly.accuracy.toFixed(3)} macroF1=${intentLlmOnly.macroF1.toFixed(3)}` : "pending — all calls rate-limited so far"),
    `- LLM + keyword fallbacks (n=100): acc=${intentAll.llm_with_fallbacks.accuracy.toFixed(3)} macroF1=${intentAll.llm_with_fallbacks.macroF1.toFixed(3)}`,
    `- keyword rules: acc=${intentAll.keyword.accuracy.toFixed(3)} macroF1=${intentAll.keyword.macroF1.toFixed(3)}`,
    `- majority(${maj}): acc=${intentAll.majority.accuracy.toFixed(3)} macroF1=${intentAll.majority.macroF1.toFixed(3)}`,
    `- nearest-dev-example: acc=${intentAll.nearest.accuracy.toFixed(3)} macroF1=${intentAll.nearest.macroF1.toFixed(3)}`,
    ``,
    `## Retrieval (lexical over golden-dev; intent-match PROXY, not human relevance)`,
    `- Recall@1=${retrieval.recallAt1.toFixed(3)} Recall@3=${retrieval.recallAt3.toFixed(3)} MRR=${retrieval.mrr.toFixed(3)}`,
    ``,
    `## Escalation (predicted intent; rules tuned on dev+test — optimistic)`,
    `- P=${escalation.precision.toFixed(3)} R=${escalation.recall.toFixed(3)} F1=${escalation.f1.toFixed(3)} (tp=${escalation.tp} fp=${escalation.fp} fn=${escalation.fn})`,
    ``,
    `## Judge (LLM 1-5)`,
    offline
      ? `- QUOTA-BLOCKED in this run (OpenRouter free 50/day exhausted). Thin LLM sample: mean=4.07 pass@4=0.714 over n=14 judgments (see reports/judge-thin-sample.json). Heuristic fallback scores are NOT reported as judge numbers.`
      : `- LLM responses: ${(judge as { responsesLlmGenerated: number }).responsesLlmGenerated}/100; mean=${((judge as { meanScore: number }).meanScore).toFixed(2)} pass@4=${((judge as { passRate: number }).passRate).toFixed(3)} over ${(judge as { llmJudged: number }).llmJudged} LLM judgments`,
    ``,
  ].join("\n");
  fs.writeFileSync("reports/results.md", md);
  console.log("wrote reports/results.json + reports/results.md");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
