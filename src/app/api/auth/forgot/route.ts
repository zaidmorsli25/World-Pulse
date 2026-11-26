import { z } from "zod";
import { requestPasswordReset } from "@/lib/server/auth";
import { handler, json } from "@/lib/server/http";

const Body = z.object({ email: z.string().email("Enter a valid email address.").max(200) });

export const POST = handler({ body: Body, limit: 5 }, async ({ body, req }) => {
  const r = await requestPasswordReset(body.email, req.nextUrl.origin);
  return json({ ok: true, message: "If an account exists for that email, a reset link is on its way.", devLink: r.devLink });
});
