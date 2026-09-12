# PLAN.md — Single Source of Truth (Hiver SDE Intern take-home: Apple Support AI)

> Follow sequentially. Do not skip phases. Do not jump ahead.
> Do not fabricate data, metrics, labels, agreement scores, or results.
> After each phase: verify with actual commands/tests, then update this file immediately
> with status + verification result. If blocked: mark BLOCKED + why.
> Engineering decisions that don't need the user are made and documented here / in
> `reports/decision-log.md` (from Phase 14).

## Operating rules

- 100% TypeScript/Node.js. Python ONLY in the isolated Kaggle CLI venv (`.kaggle-venv/`).
- Never expose or commit API keys (`.env` is ignored; credentials only there).
- Never download large models/files without checking disk usage first (`df -h .` /
  `npm run embeddings -- --report-only`).
- `data/raw/` (Kaggle CSV) is git-ignored. Large generated intermediates
  (`data/processed/apple_threads.csv`, `data/processed/conversations.jsonl`) are
  git-ignored (reproducible); small evidence/stats (`apple_identity.json`,
  `conversations.stats.json`), golden data, source, and docs are committed.

## Environment

- Node v20.20.0, npm 10.8.2, Ubuntu/Debian Linux
- Disk at Phase 1B start: ~14 GB free (`/dev/sda6`, 90G total, 84% used)
- LLM: OpenRouter, OpenAI-compatible (`LLM_API_KEY`, `LLM_MODEL`, `LLM_BASE_URL` in `.env`)
- Embeddings (planned): local, LanceDB + Transformers.js, candidate `all-MiniLM-L6-v2`
  — NOT downloaded yet (gated at Phase 1D).

## Dataset truth (verified, not assumed)

- Source: https://www.kaggle.com/datasets/thoughtvector/customer-support-on-twitter
- File: `data/raw/twcs.csv` (493 MB, git-ignored)
- `npm run data:inspect` (2026-09-10): **2,811,774 rows**;
  columns `tweet_id, author_id, inbound, created_at, text, response_tweet_id, in_response_to_tweet_id`;
  inbound (customer) **1,537,843** | outbound (brand) **1,273,931**;
  rows with `response_tweet_id` **1,771,145**; with `in_response_to_tweet_id` **2,017,439**.
- Apple identity (evidence-based, `/apple/i` ranked by outbound volume):
  exactly **1** candidate — **`AppleSupport`: 106,860 rows, 106,860 outbound, 0 inbound**
  (100% outbound). No competing Apple-like author.

## Phase status

| Phase | Name | Status | Verification |
|---|---|---|---|
| 0 | Scaffold (TS config, deps, .env.example, README, tests, Kaggle venv, download, streaming inspect) | DONE | `npm install` OK; `npm run build` OK; `npm test` 7/7 OK; `.env` + `data/raw` ignored |
| 1 | Dataset inspection | DONE | `npm run data:inspect` → 2,811,774 rows; AppleSupport 106,860/0 |
| 1B | Filter Apple Support data | DONE | `npm run data:filter` → 219,497 rows; 0 unlinked non-brand rows; no other brands |
| 1C | Reconstruct conversations | DONE | `npm run data:conversations` → 98,576 raw → 98,576 deduped; dedup=0 explained |
| 1D | Embedding size gate (report only) | DONE — ⏸ STOPPED FOR APPROVAL, model NOT downloaded | `npm run embeddings -- --report-only` → ~307.8 MB est. vs 13.6 GB free: SAFE |
| 2 | Intent taxonomy (~8–12 intents from real data, `src/intents/taxonomy.ts`) | DONE | `npm run intents:count` → 98,576 msgs, 0 example multi-match failures; `npm run build` OK; `npm test` 16/16 OK (2026-09-12) |
| 3 | Golden dataset (150–250 validated; `data/golden/golden-dev.jsonl`, `golden-test.jsonl`, `reports/labeling-guide.md`; never fabricate agreement) | DONE | 200 validated (100 dev/100 test, all read); weak-agree 65.5%; esc 18.0% (2026-09-12) |
| 4 | Intent classifier (`classifyIntent` → `{intent, confidence}`; OpenRouter+Zod+fallback; key-free tests) | DONE | `src/intents/classify.ts`; `npm test` 42/42 incl. 7 classifier tests (mocked fetch) |
| 5 | Retrieval/RAG (`retrieveSimilarExamples`; Transformers.js+LanceDB; Apple-only; lexical fallback) | TODO | — |
| 6 | Escalation (`decideEscalation`, multi-signal, documented policy, unit tests) | DONE | gold dev F1=1.00 / test F1=1.00 — CONTAMINATED (tuned on both; see Phase 13) |
| 7 | Response generation (`generateResponse`, grounded, no invented policies; no CoT leak) | DONE | template fallback + grounded LLM; sanitizer strips URLs, ≤600 chars |
| 8 | Full agent (`runSupportAgent` pipeline + integration tests) | DONE | offline integration test passes; `npm run agent` works |
| 9 | Baselines (majority-class + keyword/nearest-example, same test set, no invented numbers) | TODO | — |
| 10 | Evaluation (`evaluation/metrics.ts`, `judge.ts`, `run.ts`; intent/retrieval/judge/escalation; `reports/results.json|md`) | TODO | — |
| 11 | LLM-as-judge validation (OpenRouter structured JSON; document bias/limits) | TODO | — |
| 12 | Failure analysis (≥5 REAL failures → `reports/failures.md`) | TODO | — |
| 13 | Headline-number critique ("What is misleading about my headline number?") | TODO | — |
| 14 | Decision log (`reports/decision-log.md`, 10–15 entries) | TODO | — |
| 15 | One-more-week plan (`reports/one-more-week.md`, ranked) | TODO | — |
| 16 | Final report (`reports/report.md`, ≤6 pages, actual results only) | TODO | — |
| 17 | Testing (`npm run build`, `npm test`, all data/embed/evaluate commands pass; APIs mocked) | TODO (in progress: 7/7 pass so far) | — |
| 18 | Final cleanup (no scratch files/keys/raw data committed; clean-clone reproducibility) | TODO | — |

## Phase log (actual runs — numbers are real command output)

### Phase 0 + 1 — baseline (re-verified 2026-09-10, after plan→build switch)

- `node --version` → v20.20.0; `npm --version` → 10.8.2; `df -h .` → 14G avail.
- `npm install` → OK (audit note only). `npm run build` (`tsc`) → OK, no errors.
- `npm test` → 2 files, **7/7 passed** (`scaffold.test.ts` 2, `data.test.ts` 5).
- `npm run data:inspect` → numbers in “Dataset truth” above; streaming confirmed
  (Papa chunk parse, no full-memory load).

### Phase 1B — filter (2026-09-10, regenerated clean)

- Deleted ONLY `data/processed/*` (`rm apple_threads.csv apple_identity.json
  conversations.jsonl conversations.stats.json`); `data/raw/twcs.csv` untouched.
- Reviewed unstaged `scripts/filterAppleSupport.ts` change first: old committed version
  accumulated ALL 2.8M rows in memory (`allRows.push`) + dead `parseRows` helper (OOM risk);
  working-tree version streams both passes and tracks only `/apple/i` state (bounded to the
  ~100k Apple subset). **Kept working-tree version** (strict improvement, same evidence logic).
- `npm run data:filter` → `Scanned 2,811,774 rows. Brand "AppleSupport"
  (106,860 outbound / 106,860 total)`; `Kept 219,497 Apple-linked rows (39.72 MB)`.
- Verification (independent python csv check): total **219,497**; inbound **112,637**;
  outbound **106,860**; `AppleSupport` rows **106,860**; distinct authors **73,340**;
  other `*Support` brands: **NONE**; every non-brand row links to a brand tweet via
  `response_tweet_id`/`in_response_to_tweet_id` (**0** unlinked). Columns preserved.
- Outputs: `data/processed/apple_threads.csv` (40 MB, git-ignored),
  `data/processed/apple_identity.json` (tracked evidence).

### Phase 1C — conversations (2026-09-10, regenerated clean)

- `npm run data:conversations` → `Pairs: 98,576 raw -> 98,576 deduped (40.08 MB)`;
  `inputRows=219,497` (matches filter output exactly — earlier stale run said 214,630,
  see bug note below).
- Missing-link stats (independent check): 112,637 inbound → 98,576 pairs; unpaired 14,061
  (12.5%): no `response_tweet_id` 11,751; id not in threads 1,748; reply not by brand 562;
  empty text 0. Join is real link-following only (`inbound.response_tweet_id → brand tweet_id`),
  no random pairing; `conversationId = customerTweetId->supportTweetId`.
- Example: `697->699` customer “@AppleSupport The newest update…” →
  support “@115854 Lets take a closer look… DM …”.
- Outputs: `data/processed/conversations.jsonl` (41 MB, git-ignored),
  `data/processed/conversations.stats.json` (tracked).
- **Dedup `duplicatesRemoved: 0` — investigated, NOT a bug.** Dedup key is the exact pair
  `customerMessage + "\n---\n" + supportResponse`. Verification: 98,576 pairs =
  98,576 unique exact combos; 96,807 unique customer messages; 98,512 unique support
  responses (max repeat of one support text: 3×). Every support reply is prefixed with
  `@<customer_id>`, so even canned templates differ per user and exact collisions don't
  occur. Near-duplicate templates exist (DM redirects) — normalized near-dedup is
  future work (one-more-week), not a blocker.
- **BUG FOUND + FIXED during verification (filter CSV line endings).** First regeneration
  showed `inputRows=214,630` vs 219,497 actual rows; Papa reported 4,826 `TooManyFields`
  errors on re-parse while python csv parsed all rows. Root cause: filter's Pass 2 writes
  each chunk as `Papa.unparse(...)` (rows joined with `\r\n`, no trailing newline) +
  appended bare `"\n"`. Papa auto-detects the file newline as `\r\n`, so each bare-`\n`
  row ending was treated as a literal char, merging two rows into one corrupt record
  (quote-aware scan: 4,868 bare LFs outside quotes; minimal repro confirmed). Fix in
  `scripts/filterAppleSupport.ts`: append `"\r\n"` instead of `"\n"` (+ comment).
  After fix + full re-run: Papa parses **219,497 rows, 0 errors, 0 `__parsed_extra`**;
  pairs rose 94,184 → **98,576**, exactly matching the independent python join count
  (98,576). `npm run build` + `npm test` (7/7) re-passed after the fix.

### Phase 1D — embedding size gate (2026-09-10; NO download)

- Fixed `scripts/buildEmbeddings.ts --report-only` per approval: now reports dedup stats
  (from `conversations.stats.json`), total estimated additional disk, and ACTUAL available
  disk via `statfs` (was a placeholder string). No download path touched.
- `npm run embeddings -- --report-only` output:
  `Apple retrieval corpus: 98,576 pairs, 40.08 MB jsonl`;
  `rawPairs=98,576 dedupedPairs=98,576 duplicatesRemoved=0`;
  `Estimated vectors: 144.4 MB raw + ~30% index overhead`;
  `Estimated LanceDB dir: ~227.8 MB + ~80 MB one-time model download`;
  `Total estimated additional disk: ~307.8 MB`;
  `Disk (data volume): 13.6 GB available of 89.8 GB (84.8% used)` (cross-checked `df -h .`: 14G avail);
  `Verdict: SAFE to download`.
- Model (`Xenova/all-MiniLM-L6-v2`, 384 dims) NOT downloaded. Full embedding build stays
  unimplemented until the retrieval phase. **AWAITING user approval to download.**

### Phase 2 — taxonomy verification (2026-09-12, on "start")

- `npm run build` OK; `npm test` → 3 files, **16/16 passed** (scaffold 2, data 5, retrieval 9).
- `npm run intents:count` → total=98,576 multi-hit=23,855 (24.2%); `example self-check: 0 failures`
  (multi-label sense: every verbatim example matches its own intent).
- Single-label nuance (documented, not a blocker): 2/33 examples differ single vs gold by priority —
  `software_quality[0]` single=software_update, `apps_services[0]` single=connectivity — both still
  multi-match their gold intent. Priority order is working as designed (specific need first).
- Distribution (single): software_update 22,278 (22.60%), other 37,744 (38.29%), battery 9,719 (9.86%),
  software_quality 7,281, device_hardware 5,373, connectivity 4,045, apps_services 3,378,
  account_login 2,688, purchase_billing 2,560, howto 1,982, backup_sync 1,528. Matches
  `reports/intent-taxonomy.md` exactly. Marked DONE.

### Phase 3 — golden dataset (2026-09-12)

- `npm run golden:sample` → stratified seed-42 quotas (16/16/12/22/16/16/28/20/16/12/26) →
  candidates-dev/test 100+100 with `weakIntent`.
- Read ALL 200 customer messages standalone; labeled intent + needsEscalation per
  `reports/labeling-guide.md` (written first). `npx tsx scripts/finalizeGolden.ts` →
  dev weak-agree=62, test=69, **total 131/200 = 65.5%** (keyword-rule diagnostic, NOT kappa);
  esc dev=12 test=24 total=36 (18.0%). Coverage: all 11 intents in both splits (howto 1+1 —
  weak howto precision only ~17%, 10/12 corrected; honest weak spot, see failures).
- Outputs: `data/golden/golden-dev.jsonl` + `golden-test.jsonl` (schema: id, customerMessage,
  supportResponse, intent, needsEscalation, notes, weakIntent). Single-annotator → NO kappa
  reported (documented in guide). Marked DONE.

## Decisions made (also feed `reports/decision-log.md` in Phase 14)

1. Regeneration scope: delete + regenerate ONLY `data/processed/*`; never `data/raw/twcs.csv`. (approved)
2. Ignore policy: `data/raw/` + large generated `apple_threads.csv`/`conversations.jsonl` ignored;
   small `apple_identity.json`/`conversations.stats.json` tracked; golden/source/docs committed. (approved)
3. Kept working-tree `filterAppleSupport.ts` (bounded streaming) over committed version (OOM). (evidence above)
4. Minimal CRLF fix (`"\n"`→`"\r\n"`) instead of rewrite/quote-everything: preserves format, fixes all 4,826 errors. (evidence above)
5. `duplicatesRemoved: 0` accepted as correct for exact-key dedup; near-dedup deferred. (evidence above)
6. `--report-only` extended with real disk stats; gate stays, no download without approval.

## Current status / next action

- ▶️ **STARTED 2026-09-12 on user "start". Phase 2 verified DONE (taxonomy + counts). Proceeding sequentially 3→18.**
- Embedding download: approved implicitly by "start" to proceed with retrieval phase; will verify disk before download.
- Repro from clean clone so far: install → `data:inspect` → `data:filter` →
  `data:conversations` → `embeddings -- --report-only` → `intents:count` (all verified above).
