import { z } from "zod";
import { exploreCountry } from "@/lib/game/engine";
import { handler, json } from "@/lib/server/http";
import { withPlayer } from "@/lib/server/players";

const Body = z.object({ countryId: z.string().max(10) });

export const POST = handler({ auth: true, body: Body, limit: 120 }, async ({ userId, body }) => {
  const { state, events } = await withPlayer(userId!, (p, now) => exploreCountry(p, body.countryId, now));
  return json({ player: state, events });
});
