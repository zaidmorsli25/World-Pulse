import { z } from "zod";
import { startQuiz } from "@/lib/game/engine";
import { getContent, toPublicQuiz } from "@/lib/server/content";
import { handler, HttpError, json } from "@/lib/server/http";
import { withPlayer } from "@/lib/server/players";

const Body = z.object({ quizId: z.string().max(200) });

export const POST = handler({ auth: true, body: Body }, async ({ userId, body }) => {
  const quiz = (await getContent()).quizzes.get(body.quizId);
  if (!quiz) throw new HttpError(404, "Quiz not found.", "not_found");
  const { state, result } = await withPlayer(userId!, (p, now) => startQuiz(p, quiz, now));
  return json({ quiz: toPublicQuiz(quiz), resumed: result?.resumed ?? null, player: state, replay: !!state.quizRecords[quiz.id] });
});
