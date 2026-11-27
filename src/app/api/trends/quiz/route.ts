import { z } from "zod";
import { submitConnectQuiz } from "@/lib/game/engine";
import { handler, json } from "@/lib/server/http";
import { withPlayer } from "@/lib/server/players";
import { findPublicTrend } from "@/lib/server/trendPlayer";

const Body = z.object({ trendId: z.string().max(80), answers: z.record(z.string().max(80), z.string().max(400)) });

export const POST = handler({ auth: true, body: Body, limit: 30 }, async ({ userId, body }) => {
  const { t, all } = await findPublicTrend(body.trendId);
  const { state, events, result } = await withPlayer(userId!, (p, now) => submitConnectQuiz(p, t, all, body.answers, now));
  return json({ player: state, events, correct: result!.correct, total: result!.total, coins: result!.coins, xp: result!.xp, results: result!.results });
});
