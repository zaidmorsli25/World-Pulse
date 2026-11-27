import { z } from "zod";
import { answerPrediction } from "@/lib/game/engine";
import { handler, json } from "@/lib/server/http";
import { withPlayer } from "@/lib/server/players";
import { findPublicTrend } from "@/lib/server/trendPlayer";

const Body = z.object({ trendId: z.string().max(80), predictionId: z.string().max(80), choice: z.number().int() });

export const POST = handler({ auth: true, body: Body, limit: 30 }, async ({ userId, body }) => {
  const { t } = await findPublicTrend(body.trendId);
  const { state, events } = await withPlayer(userId!, (p, now) => answerPrediction(p, t, body.predictionId, body.choice, now));
  return json({ player: state, events });
});
