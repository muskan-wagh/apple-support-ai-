/**
 * Pure web-layer helpers: request validation + agent-result shaping.
 * No Next.js imports here so vitest can cover this file directly.
 * Never invents data: retrieval items pass through verbatim from the agent.
 */
import type { AgentResult } from "@/src/agent/runSupportAgent";
import { MAX_MESSAGE_LENGTH, type SupportSuccess } from "./types";

export function validateMessage(raw: unknown):
  | { ok: true; message: string }
  | { ok: false; error: string } {
  const message = typeof raw === "string" ? raw.trim() : "";
  if (!message) return { ok: false, error: "Please describe your issue first." };
  if (message.length > MAX_MESSAGE_LENGTH) {
    return {
      ok: false,
      error: `Message is too long (${message.length}/${MAX_MESSAGE_LENGTH} characters). Please shorten it.`,
    };
  }
  return { ok: true, message };
}

/** Map the existing agent output to the public API shape (no AI logic duplicated). */
export function toSupportResponse(message: string, result: AgentResult): SupportSuccess {
  return {
    message,
    intent: { label: result.intent, confidence: result.confidence },
    retrieval: result.examples.map((e) => ({
      exampleId: e.exampleId,
      customerMessage: e.customerMessage,
      supportResponse: e.supportResponse,
      score: e.score,
    })),
    escalate: result.escalated,
    escalationReasons: result.escalationReasons,
    response: result.response,
  };
}

/** Human-readable labels for escalation reason codes (presentation only). */
const REASON_LABELS: Record<string, string> = {
  safety: "Safety concern",
  lockout: "Account or device lockout",
  data_loss: "Possible data loss",
  money: "Billing or payment issue",
  unusable: "Device unusable",
  repeated_failure: "Repeated support failure",
  low_confidence_high_stakes: "Low confidence on a sensitive issue",
};

export function reasonLabel(reason: string): string {
  return REASON_LABELS[reason] ?? reason.replace(/_/g, " ");
}
