/**
 * Response generation — Phase 7. Grounded, concise, no invented policies/links.
 * Primary: OpenRouter chat model grounded on retrieved Apple Support examples.
 * Fallback (no key / error): deterministic template in the AppleSupport voice
 * (acknowledge + safest next step per intent + DM handoff). Never leaks chain-of-thought.
 */
import "dotenv/config";
import type { IntentName } from "../intents/taxonomy.js";
import type { RetrievedExample } from "../retrieval/retrieve.js";

export interface GenerateInput {
  message: string;
  intent: IntentName;
  examples: RetrievedExample[];
  escalated: boolean;
}

export interface GenerateOptions {
  fetchFn?: typeof fetch;
  useLlm?: boolean;
  timeoutMs?: number;
}

const NEXT_STEP: Record<IntentName, string> = {
  account_login: "try signing in again, and if it still fails let us know exactly where it stops",
  purchase_billing: "share the order date and last 4 digits of what you see (never the full number) so we can check it",
  backup_sync: "confirm the backup finished on stable Wi-Fi with the device plugged in, then retry",
  battery_power: "check Settings > Battery for the top drain, restart once, and tell us what changed",
  connectivity: "toggle the connection off and back on, restart the device, and retry",
  device_hardware: "note when it started and whether there is visible damage, and share a photo via DM if you can",
  software_update: "confirm the exact version in Settings > General > About and whether the issue started right after updating",
  software_quality: "note the exact steps that trigger it and whether a restart changes anything",
  apps_services: "confirm the app and version, force-close and reopen it, and tell us if it persists",
  howto_settings: "tell us the exact screen you are on and what you tapped last",
  other: "share a few more details about what is happening and what you expected",
};

export function fallbackResponse(input: GenerateInput): string {
  const step = NEXT_STEP[input.intent];
  if (input.escalated) {
    return (
      `Thanks for reaching out — we understand this is urgent and we're escalating this to a specialist. ` +
      `To help them move fast, please ${step}. We'll follow up with you here by DM.`
    );
  }
  return (
    `Thanks for reaching out — let's take a closer look. ` +
    `Please ${step}, then send us a DM and we'll take it from there.`
  );
}

/** Strip model chatter: first line, no invented URLs/policies, cap length. */
export function sanitizeResponse(text: string): string {
  let out = text.replace(/\s+/g, " ").trim();
  // Drop invented links (we never invent support URLs; real ones come from retrieved examples).
  out = out.replace(/https?:\/\/\S+/g, "[link removed]");
  if (out.length > 600) out = out.slice(0, 597).trim() + "…";
  return out;
}

export async function generateResponse(input: GenerateInput, opts: GenerateOptions = {}): Promise<string> {
  const useLlm = opts.useLlm !== false;
  const apiKey = process.env["LLM_API_KEY"]?.trim();
  if (!useLlm || !apiKey) return fallbackResponse(input);
  try {
    return await llmGenerate(input, apiKey, opts);
  } catch (err) {
    console.warn(`LLM generation unavailable, using fallback template: ${(err as Error).message}`);
    return fallbackResponse(input);
  }
}

async function llmGenerate(input: GenerateInput, apiKey: string, opts: GenerateOptions): Promise<string> {
  const base = (process.env["LLM_BASE_URL"] ?? "https://openrouter.ai/api/v1").replace(/\/$/, "");
  const model = process.env["LLM_MODEL"]?.trim() || "nex-agi/nex-n2.5-mini:free";
  const fetchFn = opts.fetchFn ?? fetch;
  const examples = input.examples.slice(0, 3)
    .map((e, i) => `Example ${i + 1} (past Apple Support reply): ${e.supportResponse}`)
    .join("\n");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 25000);
  try {
    const res = await fetchFn(`${base}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: 220,
        messages: [
          {
            role: "system",
            content:
              "You are Apple Support on Twitter. Write ONE short reply (<=80 words) to the customer. " +
              "Rules: match the tone of the past replies; give at most one concrete next step; " +
              (input.escalated
                ? "acknowledge urgency and say you are escalating to a specialist; "
                : "offer to continue by DM; ") +
              "never invent policies, warranty outcomes, prices, phone numbers, or URLs; " +
              "never reveal reasoning. Output only the reply.",
          },
          {
            role: "user",
            content:
              `Customer intent: ${input.intent}\nCustomer message: ${input.message}\n` +
              (examples ? `${examples}\n` : "") +
              "Write the reply:",
          },
        ],
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
    const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = body.choices?.[0]?.message?.content?.trim() ?? "";
    if (!content) throw new Error("empty LLM output");
    return sanitizeResponse(content);
  } finally {
    clearTimeout(timer);
  }
}
