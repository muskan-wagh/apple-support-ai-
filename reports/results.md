# Results (real runs, 2026-09-12T12:21:28.624Z)

Model: `nex-agi/nex-n2.5-mini:free` — test n=100, dev n=100, 0.5s this run (resumable cache).

## Intent
- LLM classifier (LLM-backed only, n=0): pending — all calls rate-limited so far
- LLM + keyword fallbacks (n=100): acc=0.690 macroF1=0.671
- keyword rules: acc=0.690 macroF1=0.671
- majority(software_quality): acc=0.220 macroF1=0.033
- nearest-dev-example: acc=0.240 macroF1=0.183

## Retrieval (lexical over golden-dev; intent-match PROXY, not human relevance)
- Recall@1=0.240 Recall@3=0.510 MRR=0.358

## Escalation (predicted intent; rules tuned on dev+test — optimistic)
- P=1.000 R=1.000 F1=1.000 (tp=24 fp=0 fn=0)

## Judge (LLM 1-5)
- QUOTA-BLOCKED in this run (OpenRouter free 50/day exhausted). Thin LLM sample: mean=4.07 pass@4=0.714 over n=14 judgments (see reports/judge-thin-sample.json). Heuristic fallback scores are NOT reported as judge numbers.
