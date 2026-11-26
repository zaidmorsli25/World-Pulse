import { z } from "zod";
import { purchase } from "@/lib/game/engine";
import { handler, json } from "@/lib/server/http";
import { withPlayer } from "@/lib/server/players";

const Body = z.object({ itemId: z.string().max(100) });

export const POST = handler({ auth: true, body: Body, limit: 60 }, async ({ userId, body }) => {
  const { state, events } = await withPlayer(userId!, (p, now) => purchase(p, body.itemId, now));
  return json({ player: state, events });
});
