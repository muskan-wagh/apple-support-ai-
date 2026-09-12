# Apple Support AI — Customer Support Agent (TWCS)

AI customer-support agent for **Apple Support** built on the Customer Support on Twitter (TWCS) dataset.
Hiver SDE Intern take-home. JS/TS + Node.js only.

> Status: Phase 0 scaffold. Phases land incrementally with verification (see reports/decision-log.md later).

## What it does
- Classifies Apple Support intents (`classifyIntent`)
- Retrieves similar historical Apple Support responses (local LanceDB + Transformers.js)
- Decides human escalation with a documented policy
- Generates grounded, concise replies via OpenRouter (`nex-agi/nex-n2.5-mini`), key-free fallbacks for tests
- Evaluates: intent accuracy/macro-F1, retrieval Recall@K/MRR, LLM-as-judge, escalation P/R/F1 + 2 baselines

## Requirements
- Node.js 20+, npm 9+
- Kaggle account (dataset download only)
- Optional: OpenRouter API key (generation + judge). Tests run without it.

## Dataset source
https://www.kaggle.com/datasets/thoughtvector/customer-support-on-twitter
License: CC BY-NC-SA 4.0 — check Kaggle page before redistribution. Raw CSV is NOT committed.

## Dataset download
```bash
mkdir -p data/raw
pip install kaggle            # download helper only (project code is TS, no Python)
# Put kaggle.json in ~/.kaggle/ (Kaggle → Account → Create New Token), chmod 600
kaggle datasets download thoughtvector/customer-support-on-twitter -p data/raw --unzip
ls -lh data/raw/              # expect twcs.csv (~3M rows)
```

## Installation
```bash
npm install
cp .env.example .env          # then paste LLM_API_KEY
```

## Environment variables (.env)
```
LLM_API_KEY=sk-or-...
LLM_MODEL=nex-agi/nex-n2.5-mini
LLM_BASE_URL=https://openrouter.ai/api/v1
```
Get a key at https://openrouter.ai/keys. Never commit `.env`.

## Data preprocessing
```bash
npm run data:inspect        # streaming stats + identifies Apple Support account from data (no hardcoded assumption)
npm run data:filter         # Apple-only threads -> data/processed/
npm run data:conversations  # reconstruct via in_response_to_tweet_id/response_tweet_id -> conversations.jsonl
```
Apple account identification is evidence-based (see `reports/apple-identification.md` after Phase 1).

## Embeddings (gated by size check — per plan)
```bash
npm run embeddings -- --report-only   # prints Apple corpus size + est. disk BEFORE downloading models
npm run embeddings                    # only after you approve the size report
```
Only the filtered + deduped Apple corpus is embedded, never the full 3M rows.

## Running the agent
```bash
npm run agent -- "My iPhone won't connect to WiFi"
npm run dev
```

## Web Demo

A Next.js web layer over the existing Apple Support AI agent (the UI is not the
AI system — all analysis comes from `src/agent/runSupportAgent.ts` via
`POST /api/support`).

```bash
npm run web     # dev server, then open http://localhost:3000
npm run web:build && npm run web:start   # production build + serve
```

Type a customer issue, get intent + confidence, escalation advice, the top 3
real historical cases, and a generated reply. No key needed to try it (keyword
+ template fallbacks); with `LLM_API_KEY` in `.env` it uses the LLM path.
The key stays server-side — it is never sent to the browser.

## Evaluation / tests
```bash
npm test        # vitest, mocked LLM — no key needed
npm run evaluate
npm run build
```

## Results
TBD after real runs. No fabricated metrics. See `reports/`.

## Known limitations
- Single-annotator golden labels until independent labels provided → kappa reported as limitation, not fabricated.
- LLM judge is not ground truth; small local embedding model.

## Repository structure
```
data/raw/ data/processed/ data/golden/
src/data/ src/intents/ src/retrieval/ src/generation/ src/escalation/ src/agent/
baselines/ evaluation/ scripts/ tests/ reports/
```

## Key implementation decisions
See `reports/decision-log.md` (10–15 entries, added as phases land).
