import { z } from "zod";
import { equip } from "@/lib/game/engine";
import { handler, json } from "@/lib/server/http";
import { withPlayer } from "@/lib/server/players";

const Body = z.object({ slot: z.string().max(30), itemId: z.string().max(100).nullable() });

export const POST = handler({ auth: true, body: Body, limit: 120 }, async ({ userId, body }) => {
  const { state, events } = await withPlayer(userId!, (p, now) => equip(p, body.itemId, body.slot, now));
  return json({ player: state, events });
});
