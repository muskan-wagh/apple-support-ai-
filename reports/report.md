# Apple Support AI — Final Report (all results real; caveats attached)

## 1. What was built
Pipeline `runSupportAgent`: keyword-first intent classification (LLM primary with keyword
fallback) → lexical RAG over Apple-only conversations (vector path implemented, index
building) → 7-signal escalation policy → grounded response generation (LLM primary, template
fallback, URL-stripping sanitizer). Data: 2,811,774 TWCS tweets → 219,497 Apple-linked rows →
98,576 verified Apple conversations (`AppleSupport` = sole Apple author, 106,860 outbound).
Golden: 200 single-annotator labels (100 dev / 100 test, all messages read standalone).

## 2. Results (golden-test, n=100 unless noted)
- **Intent**: keyword acc **0.69**, macro-F1 **0.67**; majority 0.22/0.03; nearest-dev-example
  0.24/0.18. Best intents: battery 0.96, account_login 0.94; worst: howto 0.29, hardware 0.31.
- **Retrieval** (lexical over 100 dev; intent-match proxy): R@1 **0.24**, R@3 **0.51**, MRR **0.36**.
- **Escalation**: P=R=F1=**1.00** — CONTAMINATED (rules iterated on dev+test; agreement by
  construction, not generalization; fresh-sample validation required).
- **LLM judge**: mean **4.07**, pass@4 **0.71** — THIN (n=14; OpenRouter free 50/day quota
  exhausted mid-eval; heuristic fallbacks excluded, template-vs-LLM split unmeasured).
- Weak-rule↔gold agreement 65.5%; 24.2% of traffic multi-intent (single-label hides it).

## 3. Method notes (reproducibility)
`install → data:inspect → data:filter → data:conversations → intents:count →
golden:sample → golden:finalize → evaluate:offline`. Tests: 47 key-free (mocked fetch).
`.env` (key) and `data/raw` never committed; large intermediates git-ignored with stats kept.
Full LLM eval (`npm run evaluate`) resumes via `tmp/eval-cache.json` after quota reset.

## 4. Limitations (load-bearing)
Single annotator (no kappa); escalation test contamination; proxy (not human) retrieval
relevance; n=100 with thin buckets; LLM generation quality mostly unjudged; CPU embeddings
(~22 msg/s) left the vector path unmeasured; English-only rules (~1% traffic missed).

## 5. What next
Fresh blind escalation validation; second annotator + kappa; vector-vs-lexical measurement;
multi-label eval; near-dedup; thread-context classifier; confidence calibration (see
`reports/one-more-week.md`, ranked). Full critique: `headline-critique.md`; failures:
`failures.md`; decisions: `decision-log.md`.
