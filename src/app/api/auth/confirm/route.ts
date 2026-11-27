import { z } from "zod";
import { confirmEmail } from "@/lib/server/auth";
import { handler, json } from "@/lib/server/http";
import { clearPendingSignup, createSession } from "@/lib/server/session";

const Body = z.object({ accessToken: z.string().min(1).max(4000) });

/** The player clicked the link in their confirmation email: log them in. */
export const POST = handler({ body: Body, limit: 10 }, async ({ body }) => {
  const userId = await confirmEmail(body.accessToken);
  await createSession(userId);
  await clearPendingSignup();
  return json({ ok: true });
});
