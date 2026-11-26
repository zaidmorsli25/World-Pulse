import { z } from "zod";
import { signIn } from "@/lib/server/auth";
import { handler, json } from "@/lib/server/http";
import { createSession } from "@/lib/server/session";

const Body = z.object({ identifier: z.string().min(1).max(200), password: z.string().min(1).max(200) });

export const POST = handler({ body: Body, limit: 10 }, async ({ body }) => {
  const userId = await signIn(body.identifier, body.password);
  await createSession(userId);
  return json({ ok: true });
});
