import { z } from "zod";
import { completeQuiz } from "@/lib/game/engine";
import { getContent } from "@/lib/server/content";
import { handler, HttpError, json } from "@/lib/server/http";
import { withPlayer } from "@/lib/server/players";

const Body = z.object({ quizId: z.string().max(200) });

export const POST = handler({ auth: true, body: Body, limit: 60 }, async ({ userId, body }) => {
  const content = await getContent();
  const quiz = content.quizzes.get(body.quizId);
  if (!quiz) throw new HttpError(404, "Quiz not found.", "not_found");
  const { state, events, result } = await withPlayer(userId!, (p, now) => completeQuiz(p, quiz, quiz.category, now));
  const r = result!;
  return json({ player: state, events, correct: r.correct, total: r.total, perfect: r.perfect, firstCompletion: r.firstCompletion, coins: r.attempt.coins, xp: r.attempt.xp, results: r.results });
});
