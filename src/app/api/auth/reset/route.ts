import { z } from "zod";
import { resetPassword } from "@/lib/server/auth";
import { handler, json } from "@/lib/server/http";
import { createSession } from "@/lib/server/session";

const Body = z.object({ token: z.string().max(200).optional(), accessToken: z.string().max(4000).optional(), password: z.string().min(1).max(200) });

export const POST = handler({ body: Body, limit: 10 }, async ({ body }) => {
  const userId = await resetPassword({ token: body.token, accessToken: body.accessToken }, body.password);
  await createSession(userId);
  return json({ ok: true });
});
