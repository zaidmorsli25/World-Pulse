"use client";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import type { AnswerPayload, CompletePayload } from "@/lib/client/backend";
import { sound } from "@/lib/client/sound";
import { levelFromXp } from "@/lib/game/progression";
import type { NewsEvent, PublicQuiz } from "@/lib/types";
import { FigureBadge } from "../figures/FigureBadge";
import { useGame } from "../game/GameProvider";
import { AnimatedNumber, Confetti, XPBar } from "../ui/bits";
import { Coin } from "../ui/icons";
import { CountrySilhouette, LETTERS, QuizRegionMap } from "./MiniMap";

const TYPE_LABEL: Record<string, string> = {
  multiple_choice: "Multiple choice",
  true_false: "True or false",
  country_id: "Identify the country",
  figure_id: "Identify the leader",
  cause_effect: "Cause and effect",
  map: "Map challenge",
};

export function QuizView({ event, onExit, onDone }: { event: NewsEvent; onExit: () => void; onDone: () => void }) {
  const { backend, apply, toast, player } = useGame();
  const [quiz, setQuiz] = useState<PublicQuiz | null>(null);
  const [replay, setReplay] = useState(false);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<(number | null)[]>([]);
  const [feedback, setFeedback] = useState<(AnswerPayload | null)[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CompletePayload | null>(null);
  const [xpBefore] = useState(player.xp);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await backend.startQuiz(event.quizId);
        if (!alive) return;
        setQuiz(r.quiz);
        setReplay(r.replay);
        const n = r.quiz.questions.length;
        const pk: (number | null)[] = Array(n).fill(null);
        const fb: (AnswerPayload | null)[] = Array(n).fill(null);
        if (r.resumed) {
          for (let i = 0; i < n; i++) {
            const a = r.resumed[i];
            if (a !== null && a !== undefined) {
              pk[i] = a;
              fb[i] = await backend.answer(event.quizId, i, a);
            }
          }
        }
        if (!alive) return;
        setPicked(pk);
        setFeedback(fb);
        const firstOpen = pk.findIndex((x) => x === null);
        setIdx(firstOpen === -1 ? n - 1 : firstOpen);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
    return () => {
      alive = false;
    };
  }, [backend, event.quizId]);

  const choose = useCallback(
    async (choice: number) => {
      if (!quiz || busy || feedback[idx]) return;
      setBusy(true);
      setPicked((p) => p.map((x, i) => (i === idx ? choice : x)));
      try {
        const r = await backend.answer(quiz.id, idx, choice);
        setFeedback((f) => f.map((x, i) => (i === idx ? r : x)));
        sound.play(r.correct ? "correct" : "wrong");
      } catch (e) {
        toast({ kind: "error", title: (e as Error).message });
        setPicked((p) => p.map((x, i) => (i === idx ? null : x)));
      } finally {
        setBusy(false);
      }
    },
    [quiz, busy, feedback, idx, backend, toast],
  );

  const finish = useCallback(async () => {
    if (!quiz) return;
    setBusy(true);
    try {
      const r = await backend.completeQuiz(quiz.id);
      setResult(r);
      if (r.coins > 0) sound.play("coin");
      setTimeout(() => apply(r), 900);
    } catch (e) {
      toast({ kind: "error", title: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }, [quiz, backend, apply, toast]);

  // keyboard: 1-5 to answer, Enter for next
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!quiz || result) return;
      const q = quiz.questions[idx];
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= q.choices.length && !feedback[idx]) {
        e.preventDefault();
        void choose(n - 1);
      }
      if (e.key === "Enter" && feedback[idx]) {
        e.preventDefault();
        if (idx < quiz.questions.length - 1) setIdx(idx + 1);
        else void finish();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [quiz, idx, feedback, result, choose, finish]);

  if (error)
    return (
      <div className="p-8 text-center">
        <p className="text-navy-800">{error}</p>
        <button className="btn btn-ghost mt-4" onClick={onExit}>
          Back to briefing
        </button>
      </div>
    );
  if (!quiz) return <div className="grid flex-1 place-items-center p-10 font-display text-navy-700">Preparing your quiz…</div>;
  if (result) return <QuizResults result={result} xpBefore={xpBefore} replay={replay} onDone={onDone} onReview={onExit} />;

  const q = quiz.questions[idx];
  const fb = feedback[idx];
  const sel = picked[idx];
  const last = idx === quiz.questions.length - 1;

  return (
    <div className="scroll-thin flex-1 overflow-y-auto px-6 py-6 sm:px-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button className="text-sm font-semibold text-ocean-700 hover:underline" onClick={onExit}>
          ← Re-read briefing
        </button>
        <div className="flex gap-1.5" aria-label={`Question ${idx + 1} of ${quiz.questions.length}`}>
          {quiz.questions.map((_, i) => (
            <span key={i} className={`h-2.5 w-8 rounded-full ${feedback[i] ? (feedback[i]!.correct ? "bg-land-500" : "bg-[#e5484d]") : i === idx ? "bg-gold-400" : "bg-parchment-200"}`} />
          ))}
        </div>
      </div>
      {replay && <p className="mb-3 rounded-xl bg-ocean-400/10 px-3 py-2 text-sm text-ocean-700">Practice replay: rewards for this quiz were already collected.</p>}

      <motion.div key={q.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}>
        <p className="text-xs font-bold uppercase tracking-wider text-ocean-700">
          Question {idx + 1} of {quiz.questions.length} · {TYPE_LABEL[q.type]}
        </p>
        <h3 className="mt-1 font-display text-xl font-bold text-navy-900 sm:text-2xl">{q.prompt}</h3>

        {q.type === "map" && q.countryIds && (
          <div className="mt-4">
            <QuizRegionMap countryIds={q.countryIds} selected={sel} correct={fb ? fb.answerIndex : null} onPick={choose} disabled={!!fb || busy} />
          </div>
        )}

        {q.type === "country_id" && q.countryIds ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {q.countryIds.map((cid, i) => {
              const state = fb ? (i === fb.answerIndex ? "right" : i === sel ? "wrong" : "idle") : sel === i ? "sel" : "idle";
              return (
                <button
                  key={cid}
                  disabled={!!fb || busy}
                  onClick={() => choose(i)}
                  className={`rounded-2xl border-4 p-2 transition ${state === "right" ? "border-land-500" : state === "wrong" ? "border-[#e5484d]" : state === "sel" ? "border-gold-400" : "border-transparent hover:border-ocean-400"}`}
                  aria-label={`Silhouette ${LETTERS[i]}${fb ? `: ${q.choices[i]}` : ""}`}
                >
                  <div className="scale-[0.62] origin-top sm:scale-75" style={{ height: 120 }}>
                    <CountrySilhouette id={cid} />
                  </div>
                  <div className="font-display font-bold text-navy-900">
                    {LETTERS[i]}
                    {fb && <span className="font-medium"> · {q.choices[i]}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className={`mt-4 grid gap-2.5 ${q.type === "true_false" ? "grid-cols-2" : "grid-cols-1"}`}>
            {q.choices.map((c, i) => {
              const state = fb ? (i === fb.answerIndex ? "right" : i === sel ? "wrong" : "idle") : "idle";
              return (
                <motion.button
                  key={i}
                  whileHover={fb ? undefined : { scale: 1.015 }}
                  whileTap={fb ? undefined : { scale: 0.98 }}
                  disabled={!!fb || busy}
                  onClick={() => choose(i)}
                  className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left font-semibold transition ${
                    state === "right"
                      ? "border-land-500 bg-land-500/15 text-land-600"
                      : state === "wrong"
                        ? "border-[#e5484d] bg-[#e5484d]/10 text-[#a8262b]"
                        : sel === i
                          ? "border-gold-400 bg-gold-300/20"
                          : "border-parchment-200 bg-white text-navy-900 hover:border-ocean-400"
                  }`}
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-navy-900/5 font-display text-sm">{q.type === "map" ? LETTERS[i] : i + 1}</span>
                  {q.type === "figure_id" && q.figureIds?.[i] && <FigureBadge id={q.figureIds[i]} size={36} />}
                  <span className="flex-1">{c}</span>
                  {state === "right" && <span aria-label="correct">✓</span>}
                  {state === "wrong" && <span aria-label="incorrect">✗</span>}
                </motion.button>
              );
            })}
          </div>
        )}

        {fb && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-4 rounded-2xl p-4 ${fb.correct ? "bg-land-500/15" : "bg-[#fff4e5]"}`} role="status">
            <p className="font-display text-lg font-bold text-navy-900">{fb.correct ? "Correct! 🎉" : "Not quite, but now you know."}</p>
            <p className="mt-1 text-navy-800">{fb.explanation}</p>
            {fb.context && <p className="mt-2 text-sm text-navy-700/80">💡 {fb.context}</p>}
          </motion.div>
        )}
      </motion.div>

      <div className="mt-6 flex justify-end">
        {fb && (
          <button className="btn btn-primary" onClick={() => (last ? finish() : setIdx(idx + 1))} disabled={busy}>
            {last ? "See results" : "Next question"} →
          </button>
        )}
      </div>
    </div>
  );
}

function QuizResults({ result, xpBefore, replay, onDone, onReview }: { result: CompletePayload; xpBefore: number; replay: boolean; onDone: () => void; onReview: () => void }) {
  const info = levelFromXp(xpBefore + result.xp);
  const stars = result.perfect ? 3 : result.correct / result.total >= 0.6 ? 2 : result.correct > 0 ? 1 : 0;
  return (
    <div className="relative flex-1 overflow-y-auto px-6 py-8 text-center sm:px-8">
      {result.perfect && <Confetti count={40} />}
      <div className="flex justify-center gap-2">
        {[0, 1, 2].map((i) => (
          <motion.span key={i} initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.2 + i * 0.18, type: "spring", stiffness: 300, damping: 12 }} className={`text-5xl ${i < stars ? "" : "opacity-20 grayscale"}`}>
            ⭐
          </motion.span>
        ))}
      </div>
      <h3 className="mt-3 font-display text-3xl font-bold text-navy-900">{result.perfect ? "Perfect briefing!" : result.correct >= result.total / 2 ? "Well done, analyst!" : "Good effort. Keep learning!"}</h3>
      <p className="mt-1 text-lg text-navy-700">
        You scored <b>{result.correct}</b> out of <b>{result.total}</b>
      </p>

      <div className="mx-auto mt-6 grid max-w-sm grid-cols-2 gap-3">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="rounded-2xl bg-gold-300/30 p-4">
          <div className="flex items-center justify-center gap-1.5 font-display text-3xl font-bold text-navy-900">
            <Coin size={28} />+<AnimatedNumber value={result.coins} />
          </div>
          <div className="text-sm text-navy-700">coins earned</div>
        </motion.div>
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.65 }} className="rounded-2xl bg-ocean-400/15 p-4">
          <div className="font-display text-3xl font-bold text-navy-900">
            +<AnimatedNumber value={result.xp} /> XP
          </div>
          <div className="text-sm text-navy-700">experience</div>
        </motion.div>
      </div>
      {replay && <p className="mt-3 text-sm text-navy-700/80">Practice replays don&apos;t pay out again, but every replay sharpens your knowledge.</p>}

      <div className="mx-auto mt-6 max-w-sm text-left">
        <XPBar xp={result.player.xp} />
        <p className="mt-1 text-xs text-navy-700/80">
          {info.nextRank ? `Next rank: ${info.nextRank.name} at level ${info.nextRank.level}` : "Top rank reached!"}
        </p>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button className="btn btn-ghost" onClick={onReview}>
          Review briefing
        </button>
        <button className="btn btn-primary" onClick={onDone} autoFocus>
          Back to the map
        </button>
      </div>
    </div>
  );
}
