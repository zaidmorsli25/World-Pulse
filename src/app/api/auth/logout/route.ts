import { handler, json } from "@/lib/server/http";
import { destroySession } from "@/lib/server/session";

export const POST = handler({}, async () => {
  await destroySession();
  return json({ ok: true });
});
