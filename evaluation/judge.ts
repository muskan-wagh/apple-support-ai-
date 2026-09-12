/**
 * LLM-as-judge — Phase 11. Scores a generated reply 1-5 against a fixed rubric with
 * structured JSON output. Falls back to a documented heuristic when the LLM is
 * unavailable (flagged heuristic:true, excluded from headline judge numbers).
 */
import "dotenv/config";
import { z } from "zod";

export const JudgeSchema = z.object({
  score: z.number().int().min(1).max(5),
  grounded: z.boolean(),
  actionable: z.boolean(),
  no_invented_policy: z.boolean(),
  notes: z.string().max(300),
});
export type JudgeVerdict = z.infer<typeof JudgeSchema> & { heuristic: boolean };

export interface JudgeInput {
  customerMessage: string;
  intent: string;
  response: string;
  escalated: boolean;
}

export function heuristicJudge(input: JudgeInput): JudgeVerdict {
  const t = input.response;
  const hasNextStep = /please|try|confirm|share|check|send us a dm|dm\b/i.test(t);
  const noUrl = !/https?:\/\//.test(t);
  const shortEnough = t.length <= 600 && t.length >= 20;
  const escOk = !input.escalated || /escalat/i.test(t);
  const score = [hasNextStep, noUrl, shortEnough, escOk].filter(Boolean).length + 1;
  return {
    score: Math.min(5, score),
    grounded: hasNextStep,
    actionable: hasNextStep,
    no_invented_policy: noUrl,
    notes: "heuristic fallback (no LLM): checks next-step, no-URL, length, escalation wording",
    heuristic: true,
  };
}

const RUBRIC = `Score the Apple Support reply 1-5 (5=best) on: (1) grounded in the customer issue, ` +
  `(2) exactly one concrete next step, (3) no invented policies/prices/warranty outcomes/URLs/phone numbers, ` +
  `(4) correct escalation wording (must say escalating iff escalated=true), (5) short courteous support tone. ` +
  `Reply ONLY JSON {"score":1-5,"grounded":bool,"actionable":bool,"no_invented_policy":bool,"notes":"<=25 words"}.`;

export async function judgeResponse(input: JudgeInput, opts: { fetchFn?: typeof fetch; timeoutMs?: number } = {}): Promise<JudgeVerdict> {
  const apiKey = process.env["LLM_API_KEY"]?.trim();
  if (!apiKey) return heuristicJudge(input);
  try {
    const base = (process.env["LLM_BASE_URL"] ?? "https://openrouter.ai/api/v1").replace(/\/$/, "");
    const model = process.env["LLM_MODEL"]?.trim() || "nex-agi/nex-n2.5-mini:free";
    const fetchFn = opts.fetchFn ?? fetch;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 25000);
    try {
      const res = await fetchFn(`${base}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          temperature: 0,
          max_tokens: 200,
          messages: [
            { role: "system", content: RUBRIC },
            {
              role: "user",
              content: `Intent: ${input.intent}\nEscalated: ${input.escalated}\nCustomer: ${input.customerMessage}\nReply: ${input.response}`,
            },
          ],
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
      const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = body.choices?.[0]?.message?.content ?? "";
      const start = content.indexOf("{");
      const end = content.lastIndexOf("}");
      if (start < 0 || end <= start) throw new Error("no JSON in judge output");
      return { ...JudgeSchema.parse(JSON.parse(content.slice(start, end + 1))), heuristic: false };
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    console.warn(`LLM judge unavailable, heuristic fallback: ${(err as Error).message}`);
    return heuristicJudge(input);
  }
}
