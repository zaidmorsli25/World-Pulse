import { z } from "zod";
import { FIGURE_IDS } from "@/data/figures";
import { viewFigure } from "@/lib/game/engine";
import { handler, json } from "@/lib/server/http";
import { withPlayer } from "@/lib/server/players";

const Body = z.object({ figureId: z.string().max(100) });

export const POST = handler({ auth: true, body: Body, limit: 120 }, async ({ userId, body }) => {
  const { state, events } = await withPlayer(userId!, (p, now) => viewFigure(p, body.figureId, FIGURE_IDS, now));
  return json({ player: state, events });
});
