import { z } from "zod";
import { answerQuestion } from "@/lib/game/engine";
import { getContent } from "@/lib/server/content";
import { handler, HttpError, json } from "@/lib/server/http";
import { withPlayer } from "@/lib/server/players";

const Body = z.object({ quizId: z.string().max(200), index: z.number().int().min(0).max(20), choice: z.number().int().min(0).max(10) });

export const POST = handler({ auth: true, body: Body, limit: 240 }, async ({ userId, body }) => {
  const quiz = (await getContent()).quizzes.get(body.quizId);
  if (!quiz) throw new HttpError(404, "Quiz not found.", "not_found");
  const { result } = await withPlayer(userId!, (p, now) => answerQuestion(p, quiz, body.index, body.choice, now));
  const r = result!;
  return json({ correct: r.correct, answerIndex: r.answerIndex, explanation: r.explanation, context: r.context, locked: r.locked });
});
