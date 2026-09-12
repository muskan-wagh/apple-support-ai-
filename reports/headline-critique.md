# What Is Misleading About My Headline Number? (Phase 13)

Headline: **intent accuracy 0.69 (keyword rules, golden-test n=100)**.

1. **n=100 is small and thin in places.** howto_settings has n=1, device_hardware n=5,
   backup_sync n=7. Per-intent F1s from 0.29–0.96 swing on 1–2 items; the ±10pt confidence
   band is wider than the gap to any baseline worth beating.
2. **Gold labels are single-annotator, standalone-message.** Fragments ("Yes", link-only) are
   labeled `other` without thread context a production agent would have — the task is
   artificially harder (and different) there, and artificially easier where the message
   quotes rule keywords verbatim.
3. **0.69 == the weak-label agreement rate (65.5%) by construction.** The golden sample was
   stratified BY weak label and I corrected 69/200; accuracy on weak-stratified data flatters
   rules on their own vocabulary and punishes them exactly where I intervened. A random
   100-sample would likely score lower (more `other`/fragments).
4. **Macro-F1 (0.67) hides the failure modes.** software_update recall 1.00 / precision 0.50
   (absorbs post-update symptoms), software_quality recall 0.41 (paraphrase misses),
   howto precision 0.17 (fragment overfire). A single number says "decent"; the table says
   "three intents need work".
5. **The 1.00 escalation F1 next to it is contaminated** (rules tuned on dev+test) and must
   never share a slide without the warning — adjacent perfection inflates trust in all numbers.
6. **LLM numbers are thin, not zero.** Judge mean 4.07 / pass@4 0.71 is n=14 (quota wall),
   and LLM-intent accuracy is unmeasured (quota exhausted before a clean run). Reporting only
   the keyword 0.69 without the missing-LLM caveat implies the LLM was evaluated. It was not.

Honest headline: "Keyword intent accuracy 0.69 (n=100, single-annotator, weak-stratified);
per-intent recall 0.41–1.00; escalation 1.00 is tuning-contaminated; LLM eval thin (n=14)
due to a 50/day free-tier quota."
