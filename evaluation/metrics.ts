/** Classification + escalation + retrieval metrics. All pure, tested implicitly via results. */
export interface PerLabel {
  label: string;
  precision: number;
  recall: number;
  f1: number;
  support: number;
}

export function confusionCounts(gold: string[], pred: string[], labels: string[]) {
  const idx = new Map(labels.map((l, i) => [l, i]));
  const matrix = labels.map(() => labels.map(() => 0));
  for (let k = 0; k < gold.length; k++) {
    const i = idx.get(gold[k]) ?? -1;
    const j = idx.get(pred[k]) ?? -1;
    if (i >= 0 && j >= 0) matrix[i][j]++;
  }
  return matrix;
}

export function prf(gold: string[], pred: string[], labels: string[]): { perLabel: PerLabel[]; accuracy: number; macroF1: number } {
  const matrix = confusionCounts(gold, pred, labels);
  const perLabel = labels.map((label, i) => {
    const tp = matrix[i][i];
    const fp = matrix.reduce((s, row) => s + row[i], 0) - tp;
    const fn = matrix[i].reduce((s, v) => s + v, 0) - tp;
    const precision = tp / (tp + fp || 1);
    const recall = tp / (tp + fn || 1);
    return {
      label,
      precision,
      recall,
      f1: 2 * precision * recall / (precision + recall || 1),
      support: matrix[i].reduce((s, v) => s + v, 0),
    };
  });
  const correct = gold.filter((g, k) => g === pred[k]).length;
  return {
    perLabel,
    accuracy: correct / (gold.length || 1),
    macroF1: perLabel.reduce((s, l) => s + l.f1, 0) / (perLabel.length || 1),
  };
}

export function binaryPrf(gold: boolean[], pred: boolean[]) {
  let tp = 0, fp = 0, fn = 0, tn = 0;
  for (let k = 0; k < gold.length; k++) {
    if (pred[k] && gold[k]) tp++;
    else if (pred[k]) fp++;
    else if (gold[k]) fn++;
    else tn++;
  }
  const precision = tp / (tp + fp || 1);
  const recall = tp / (tp + fn || 1);
  return { tp, fp, fn, tn, precision, recall, f1: 2 * precision * recall / (precision + recall || 1) };
}

/** Intent-match Recall@K / MRR: fraction of queries with a same-intent neighbor in top-K. */
export function recallAtK(hitRanks: Array<number | null>, k: number): number {
  if (hitRanks.length === 0) return 0;
  return hitRanks.filter((r) => r !== null && r < k).length / hitRanks.length;
}

export function mrr(hitRanks: Array<number | null>): number {
  if (hitRanks.length === 0) return 0;
  return hitRanks.reduce((s, r) => s + (r === null ? 0 : 1 / (r + 1)), 0) / hitRanks.length;
}
