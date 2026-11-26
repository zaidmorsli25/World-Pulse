import { handler, json } from "@/lib/server/http";
import { withPlayer } from "@/lib/server/players";
import { getStore } from "@/lib/server/store";

export const GET = handler({ auth: true }, async ({ userId }) => {
  const user = await getStore().getUser(userId!);
  if (!user) return json({ error: "Account not found.", code: "unauthenticated" }, 401);
  const { state, events } = await withPlayer(userId!);
  return json({ user: { username: user.username, email: user.email, createdAt: user.createdAt }, player: state, events, backend: getStore().kind });
});
