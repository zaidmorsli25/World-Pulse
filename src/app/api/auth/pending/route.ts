import { isEmailConfirmed } from "@/lib/server/auth";
import { handler, json } from "@/lib/server/http";
import { clearPendingSignup, createSession, getPendingSignup } from "@/lib/server/session";

/**
 * Polled by the tab that created the account while it waits for the player to confirm their
 * email. Once confirmed, that tab is logged in too, so the player never has to log in by hand.
 */
export const POST = handler({ limit: 30 }, async () => {
  const userId = await getPendingSignup();
  if (!userId) return json({ status: "none" });
  if (!(await isEmailConfirmed(userId))) return json({ status: "waiting" });
  await createSession(userId);
  await clearPendingSignup();
  return json({ status: "confirmed" });
});
