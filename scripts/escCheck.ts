import fs from "node:fs";
import { decideEscalation } from "../src/escalation/decide.js";

for (const split of ["dev", "test"]) {
  const rows = fs.readFileSync(`data/golden/golden-${split}.jsonl`, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  let tp = 0, fp = 0, fn = 0, tn = 0;
  const fns: string[] = []; const fps: string[] = [];
  for (const r of rows) {
    const d = decideEscalation({ message: r.customerMessage, intent: r.intent, confidence: 0.7 });
    const g = r.needsEscalation as boolean;
    if (d.escalate && g) tp++;
    else if (d.escalate && !g) { fp++; fps.push(r.id); }
    else if (!d.escalate && g) { fn++; fns.push(r.id); }
    else tn++;
  }
  const p = tp / (tp + fp || 1); const rec = tp / (tp + fn || 1);
  console.log(`${split} tp=${tp} fp=${fp} fn=${fn} tn=${tn} P=${p.toFixed(3)} R=${rec.toFixed(3)} F1=${(2 * p * rec / (p + rec || 1)).toFixed(3)}`);
  console.log(`  FN: ${fns.join(" ")}`);
  console.log(`  FP: ${fps.join(" ")}`);
}
