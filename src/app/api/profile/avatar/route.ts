import { z } from "zod";
import { updateAvatar } from "@/lib/game/engine";
import { handler, json } from "@/lib/server/http";
import { withPlayer } from "@/lib/server/players";

const Body = z.object({ avatar: z.object({ skin: z.number().int(), hair: z.number().int(), hairColor: z.number().int(), backdrop: z.number().int() }) });

export const POST = handler({ auth: true, body: Body, limit: 60 }, async ({ userId, body }) => {
  const { state, events } = await withPlayer(userId!, (p, now) => updateAvatar(p, body.avatar, now));
  return json({ player: state, events });
});
