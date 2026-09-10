/** Evaluation harness stub — full metrics land in evaluation phase. Real runs only, no fabricated numbers. */
async function main(): Promise<void> {
  console.log("Evaluation harness lands in the evaluation phase (intent macro-F1, Recall@K/MRR, LLM-judge, escalation P/R/F1 + 2 baselines).");
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
