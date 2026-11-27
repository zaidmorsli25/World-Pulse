import { z } from "zod";
import { signUp } from "@/lib/server/auth";
import { handler, json } from "@/lib/server/http";
import { createSession, setPendingSignup } from "@/lib/server/session";

const Body = z.object({ email: z.string().email("Enter a valid email address.").max(200), username: z.string().min(3).max(20), password: z.string().min(1).max(200) });

export const POST = handler({ body: Body, limit: 10 }, async ({ req, body }) => {
  const r = await signUp(body.email, body.username, body.password, req.nextUrl.origin);
  if (r.userId) await createSession(r.userId);
  else if (r.pendingUserId) await setPendingSignup(r.pendingUserId);
  return json({ ok: true, needsConfirmation: r.needsConfirmation });
});
