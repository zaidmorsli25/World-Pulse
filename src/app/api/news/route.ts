import { REWARDS } from "@/lib/config";
import { getContent } from "@/lib/server/content";
import { handler, json } from "@/lib/server/http";

export const GET = handler({ limit: 120 }, async () => {
  const c = await getContent();
  const maxCoins: Record<string, number> = {};
  for (const e of c.events) {
    const n = c.quizzes.get(e.quizId)?.questions.length ?? 0;
    if (n) maxCoins[e.id] = n * REWARDS.coinsPerCorrect + REWARDS.perfectBonusCoins;
  }
  return json({ mode: c.mode, updatedAt: c.updatedAt, events: c.events, maxCoins });
});
