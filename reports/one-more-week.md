# One More Week (ranked by expected effect on headline reliability)

1. **Fresh escalation validation (50 new, blind).** Sample 50 unseen conversations, label
   escalation WITHOUT running rules first, then score frozen rules. Decontaminates the 1.00 F1.
   Effort: ~2h labeling. Effect: turns the weakest headline into an honest one.
2. **Second annotator + kappa on 100 golden items.** Current kappa gap is the biggest eval
   caveat after contamination. An independent pass over 50 dev + 50 test with adjudication
   would also fix the 2 thin buckets (howto 2/200, device_hardware dev 2/100).
3. **Vector retrieval measurement.** The 98,576-row LanceDB index is built (or building);
   measure intent-match R@1/R@3/MRR on the vector path vs lexical on the same golden queries,
   plus latency. Decides whether vectors ship or stay a fallback.
4. **Multi-label intent eval.** 24.2% of traffic is multi-intent; score per-intent P/R against
   `matchIntents` sets (gold multi-labels need ~1h extra annotation on the 200).
5. **Near-dedup of the corpus.** Exact dedup removed 0; template near-dups (DM redirects) inflate
   the index. Normalized-hash (strip @mentions/links/case) dedup with before/after counts.
6. **Thread-context classifier.** Fragments ("Yes", "11.0.3", link-only) are 38% of traffic;
   add parent-tweet text as input and re-measure intent on an `other`-heavy slice.
7. **Calibration + abstention.** LLM confidences are uncalibrated; fit a threshold on dev
   (defer-to-human under it) and report coverage-vs-accuracy instead of a bare accuracy.
