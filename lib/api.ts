/** Client-side fetch wrapper for POST /api/support. */
import type { SupportError, SupportSuccess } from "./types";

export async function postSupport(message: string): Promise<SupportSuccess> {
  let res: Response;
  try {
    res = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
  } catch {
    throw new Error("Could not reach the support service. Check your connection and try again.");
  }
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // fall through to generic error below
  }
  if (!res.ok) {
    const msg = (body as SupportError | null)?.error;
    throw new Error(
      typeof msg === "string" && msg.length > 0
        ? msg
        : "Something went wrong while processing your request.",
    );
  }
  return body as SupportSuccess;
}
