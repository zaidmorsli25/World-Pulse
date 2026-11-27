import { z } from "zod";
import { claimPrediction } from "@/lib/game/engine";
import { handler, json } from "@/lib/server/http";
import { withPlayer } from "@/lib/server/players";
import { findPublicTrend } from "@/lib/server/trendPlayer";

const Body = z.object({ trendId: z.string().max(80), predictionId: z.string().max(80) });

export const POST = handler({ auth: true, body: Body, limit: 30 }, async ({ userId, body }) => {
  const { t } = await findPublicTrend(body.trendId);
  const { state, events } = await withPlayer(userId!, (p, now) => claimPrediction(p, t, body.predictionId, now));
  return json({ player: state, events });
});
