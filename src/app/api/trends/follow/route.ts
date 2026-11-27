import { z } from "zod";
import { followTrend } from "@/lib/game/engine";
import { handler, json } from "@/lib/server/http";
import { withPlayer } from "@/lib/server/players";
import { findPublicTrend } from "@/lib/server/trendPlayer";

const Body = z.object({ trendId: z.string().max(80), follow: z.boolean() });

export const POST = handler({ auth: true, body: Body, limit: 60 }, async ({ userId, body }) => {
  const { t } = await findPublicTrend(body.trendId);
  const { state, events } = await withPlayer(userId!, (p, now) => followTrend(p, t, body.follow, now));
  return json({ player: state, events });
});
