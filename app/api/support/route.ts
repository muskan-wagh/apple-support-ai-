import { NextResponse } from "next/server";
import { runSupportAgent } from "@/src/agent/runSupportAgent";
import { toSupportResponse, validateMessage } from "@/lib/support";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/support — thin adapter over the existing CLI agent.
 * All AI logic lives in runSupportAgent(); this route only validates,
 * delegates, and reshapes. API keys stay server-side (never imported here).
 */
export async function POST(request: Request): Promise<NextResponse> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request. Send JSON with a message field." }, { status: 400 });
  }
  const message = (payload as { message?: unknown } | null)?.message;
  const checked = validateMessage(message);
  if (!checked.ok) {
    return NextResponse.json({ error: checked.error }, { status: 400 });
  }
  try {
    // Existing agent: classify -> retrieve -> escalate -> generate (with fallbacks).
    const result = await runSupportAgent(checked.message, { topK: 3 });
    return NextResponse.json(toSupportResponse(checked.message, result));
  } catch (err) {
    console.error("support agent failed:", err);
    return NextResponse.json(
      { error: "Something went wrong while processing your request. Please try again." },
      { status: 500 },
    );
  }
}
