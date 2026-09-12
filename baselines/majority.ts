/** Majority-class baseline: always predict the most frequent golden-dev intent. */
export function majorityIntent(devIntents: string[]): string {
  const counts = new Map<string, number>();
  for (const i of devIntents) counts.set(i, (counts.get(i) ?? 0) + 1);
  let best = "";
  let bestN = -1;
  for (const [label, n] of counts) {
    if (n > bestN) { best = label; bestN = n; }
  }
  return best;
}
