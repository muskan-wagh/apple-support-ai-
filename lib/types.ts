/** Shared API contract between the Next.js UI and the /api/support route. */
export interface SupportExample {
  exampleId: string;
  customerMessage: string;
  supportResponse: string;
  score: number;
}

export interface SupportSuccess {
  message: string;
  intent: { label: string; confidence: number };
  retrieval: SupportExample[];
  escalate: boolean;
  escalationReasons: string[];
  response: string;
}

export interface SupportError {
  error: string;
}

/** Max customer-message length accepted by the API. */
export const MAX_MESSAGE_LENGTH = 2000;
