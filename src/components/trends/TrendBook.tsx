"use client";
import { useMemo, useState } from "react";
import type { TrendQuizPayload } from "@/lib/client/backend";
import { sound } from "@/lib/client/sound";
import { COUNTRY_BY_ID } from "@/lib/client/world";
import { connectQuizOpen, followBonus, TREND_REWARDS, trendPages } from "@/lib/game/engine";
import { connectQuiz, type PublicTrend } from "@/lib/trends";
import { useGame } from "../game/GameProvider";
import { CoinAmount, XpAmount } from "../ui/bits";
import { NavIcon } from "../ui/icons";
import { Modal } from "../ui/Modal";
import { fmtDay, KindBadge, shade } from "./TrendPanels";

const TABS = ["Pages", "Timeline", "Connect the dots", "What happens next"] as const;
type Tab = (typeof TABS)[number];

/** Follow / unfollow a trend. Following puts its book on the HQ library shelf. */
export function FollowButton({ t, className = "" }: { t: PublicTrend; className?: string }) {
  const { player, backend, run, toast } = useGame();
  const [busy, setBusy] = useState(false);
  const following = !!player.trendBooks?.[t.id]?.following;
  if (t.status !== "active" && !following) return null;
  return (
    <button
      className={`btn ${following ? "btn-ghost" : "btn-blue"} ${className}`}
      disabled={busy}
      aria-pressed={following}
      onClick={async () => {
        setBusy(true);
        const first = !player.trendBooks?.[t.id]?.followRewarded;
        const r = await run(backend.followTrend(t.id, !following));
        setBusy(false);
        if (r && !following) {
          sound.play("coin");
          toast({ kind: "info", title: `Following "${t.name}"`, body: `Its book is on your Headquarters library shelf.${first ? ` +${TREND_REWARDS.followXp} XP` : ""}`, icon: "📘" });
        }
      }}
    >
      <NavIcon.book size={18} />
      {following ? "Following" : "Follow this trend"}
    </button>
  );
}

export function TrendBookModal() {
  const { trends, bookId, openBook } = useGame();
  const t = trends.find((x) => x.id === bookId);
  return (
    <Modal open={!!t} onClose={() => openBook(null)} label={t ? `Trend book: ${t.name}` : "Trend book"} wide>
      {t && <Book key={t.id} t={t} />}
    </Modal>
  );
}

function Book({ t }: { t: PublicTrend }) {
  const { player } = useGame();
  const [tab, setTab] = useState<Tab>("Pages");
  const pages = trendPages(player, t);
  const book = player.trendBooks?.[t.id];
  const openPreds = (t.predictions ?? []).filter((p) => p.answer === undefined && !book?.predictions?.[p.id]).length;
  const claimable = (t.predictions ?? []).filter((p) => p.answer !== undefined && book?.predictions?.[p.id] && !book.predictions[p.id].claimedAt).length;
  return (
    <>
      <header className="relative shrink-0 overflow-hidden px-6 pb-4 pt-6 text-white sm:px-8" style={{ background: `linear-gradient(135deg, ${t.color}, ${shade(t.color, 0.45)})` }}>
        {/* book spine stitching */}
        <div className="absolute inset-y-0 left-0 w-4" style={{ background: shade(t.color, 0.35) }} />
        <div className="absolute inset-y-0 left-4 w-px border-l-2 border-dashed border-white/30" />
        <div className="relative pl-3 pr-10">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/85">
            <NavIcon.book size={16} /> Trend book{t.status === "retired" ? " · past trend" : ""}
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold leading-tight sm:text-3xl">{t.name}</h2>
          <p className="mt-1 max-w-2xl text-sm text-white/90">{t.cause}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="rounded-full bg-white/20 px-2.5 py-1">
              {pages.length} of {t.links.length} pages
            </span>
            {book?.quiz && (
              <span className="rounded-full bg-white/20 px-2.5 py-1">
                Connect the dots: {book.quiz.correct}/{book.quiz.total}
              </span>
            )}
            {followBonus(player) > 1 && <span className="rounded-full bg-gold-400 px-2.5 py-1 text-navy-900">+{Math.round((followBonus(player) - 1) * 100)}% rewards for following {Object.values(player.trendBooks ?? {}).filter((b) => b.following).length} trends</span>}
          </div>
        </div>
      </header>
      <div role="tablist" className="scroll-thin flex shrink-0 gap-1 overflow-x-auto border-b border-parchment-200 px-4 pt-2 sm:px-7">
        {TABS.map((x) => (
          <button key={x} role="tab" aria-selected={tab === x} onClick={() => setTab(x)} className={`relative shrink-0 rounded-t-xl px-3 py-2 text-sm font-bold transition ${tab === x ? "bg-white text-navy-900 shadow-[0_-2px_0_inset] shadow-gold-400" : "text-navy-700/70 hover:text-navy-900"}`}>
            {x}
            {x === "What happens next" && openPreds + claimable > 0 && <span className="ml-1.5 rounded-full bg-[#e5484d] px-1.5 text-[10px] text-white">{openPreds + claimable}</span>}
            {x === "Connect the dots" && connectQuizOpen(player, t) && !book?.quiz && <span className="ml-1.5 rounded-full bg-[#e5484d] px-1.5 text-[10px] text-white">new</span>}
          </button>
        ))}
      </div>
      <div className="scroll-thin flex-1 overflow-y-auto bg-[#fbf7ee] px-6 py-5 sm:px-8">
        {tab === "Pages" && <Pages t={t} read={new Set(pages)} />}
        {tab === "Timeline" && <Timeline t={t} />}
        {tab === "Connect the dots" && <ConnectTheDots t={t} />}
        {tab === "What happens next" && <Predictions t={t} />}
      </div>
    </>
  );
}

function Pages({ t, read }: { t: PublicTrend; read: Set<string> }) {
  const { openEvent, openBook, eventsById } = useGame();
  return (
    <>
      <p className="mb-4 text-sm text-navy-700/80">Every briefing you finish from this trend adds a page to the book.</p>
      <ol className="grid gap-3 sm:grid-cols-2">
        {t.links.map((l, i) => {
          const done = read.has(l.eventId);
          const live = l.live && eventsById.has(l.eventId);
          return (
            <li key={l.eventId} className={`relative rounded-2xl border-2 p-4 shadow-sm ${done ? "border-parchment-200 bg-white" : "border-dashed border-parchment-200 bg-parchment-50"}`}>
              <span className="absolute right-3 top-3 font-display text-xs font-bold text-navy-700/40">p. {i + 1}</span>
              {done ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <KindBadge kind={l.kind} color={t.color} />
                    <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ background: t.color }}>
                      {l.label}
                    </span>
                  </div>
                  <p className="mt-2 font-semibold leading-snug text-navy-900">
                    <span className="mr-1">{COUNTRY_BY_ID.get(l.country)?.flag}</span>
                    {l.eventTitle}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-navy-800">{l.note}</p>
                  <p className="mt-2 text-xs text-navy-700/70">
                    {fmtDay(l.eventDate)} ·{" "}
                    {l.source.url ? (
                      <a className="font-semibold text-ocean-700 hover:underline" href={l.source.url} target="_blank" rel="noopener noreferrer">
                        {l.source.publication} ↗
                      </a>
                    ) : (
                      "demo scenario"
                    )}
                  </p>
                </>
              ) : (
                <div className="flex min-h-[7rem] flex-col items-start justify-center gap-2">
                  <p className="flex items-center gap-2 font-semibold text-navy-700">
                    <NavIcon.lock size={18} /> Blank page
                  </p>
                  <p className="text-sm text-navy-700/80">{l.eventTitle}</p>
                  {live ? (
                    <button
                      className="btn btn-ghost !py-1.5 text-sm"
                      onClick={() => {
                        openBook(null);
                        openEvent(l.eventId);
                      }}
                    >
                      Read the briefing
                    </button>
                  ) : (
                    <span className="text-xs text-navy-700/60">This story has left the map.</span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}

function Timeline({ t }: { t: PublicTrend }) {
  const items = [...t.timeline.map((x) => ({ date: x.date, text: x.text, story: false })), ...t.links.map((l) => ({ date: l.eventDate.slice(0, 10), text: l.eventTitle, story: true }))].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <>
      <p className="mb-4 text-sm text-navy-700/80">How the trend has unfolded. Stories on the map are marked with a coloured dot.</p>
      <ol className="relative ml-2 border-l-2 pl-6" style={{ borderColor: t.color }}>
        {items.map((x, i) => (
          <li key={i} className="relative mb-4 last:mb-0">
            <span className={`absolute -left-[31px] top-1 rounded-full ring-2 ring-white ${x.story ? "h-4 w-4" : "h-3 w-3 bg-navy-700/40"}`} style={x.story ? { background: t.color } : undefined} />
            <p className="text-xs font-bold uppercase tracking-wider text-navy-700/70">{fmtDay(x.date)}</p>
            <p className={x.story ? "font-semibold text-navy-900" : "text-navy-900"}>{x.text}</p>
          </li>
        ))}
      </ol>
    </>
  );
}

function ConnectTheDots({ t }: { t: PublicTrend }) {
  const { player, trends, backend, apply, toast } = useGame();
  const qs = useMemo(() => connectQuiz(t, trends), [t, trends]);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<TrendQuizPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const book = player.trendBooks?.[t.id];
  const open = connectQuizOpen(player, t);
  const bonus = followBonus(player);

  if (!book?.following)
    return (
      <div className="rounded-2xl bg-white p-5 text-center ring-1 ring-parchment-200">
        <p className="mb-3 text-navy-800">Follow this trend to unlock its quiz.</p>
        <FollowButton t={t} />
      </div>
    );
  if (!open)
    return (
      <div className="rounded-2xl bg-white p-5 text-center ring-1 ring-parchment-200">
        <p className="font-display text-lg font-bold text-navy-900">🔒 Read every story first</p>
        <p className="mt-1 text-sm text-navy-700/80">The connect-the-dots quiz opens once you&apos;ve read all of this trend&apos;s stories on the map. Each one adds a page to the book.</p>
      </div>
    );
  if (!qs.length) return <p className="text-navy-700/80">This trend needs more stories before it has a quiz.</p>;

  if (result)
    return (
      <div>
        <div className="mb-4 rounded-2xl bg-white p-5 text-center ring-1 ring-parchment-200">
          <p className="font-display text-2xl font-bold text-navy-900">
            {result.correct} of {result.total} connections
          </p>
          {result.coins || result.xp ? (
            <p className="mt-1 flex items-center justify-center gap-3 font-semibold">
              <CoinAmount value={result.coins} /> <XpAmount value={result.xp} />
            </p>
          ) : (
            <p className="mt-1 text-sm text-navy-700/80">Practice round: rewards are paid on your first try only.</p>
          )}
        </div>
        <ul className="space-y-2">
          {qs.map((q) => {
            const r = result.results.find((x) => x.id === q.id);
            return (
              <li key={q.id} className={`rounded-xl p-3 text-sm ring-1 ${r?.correct ? "bg-land-500/10 ring-land-500/30" : "bg-[#e5484d]/10 ring-[#e5484d]/30"}`}>
                <p className="font-semibold text-navy-900">
                  {r?.correct ? "✓" : "✗"} {q.prompt}
                </p>
                <p className="mt-1 text-navy-800">
                  <b>Answer:</b> {r?.answer}
                </p>
              </li>
            );
          })}
        </ul>
        <button
          className="btn btn-ghost mt-4"
          onClick={() => {
            setResult(null);
            setAnswers({});
            setI(0);
          }}
        >
          Try again
        </button>
      </div>
    );

  const q = qs[i];
  const picked = answers[q.id];
  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-navy-700/70">
        <span>
          Question {i + 1} of {qs.length}
        </span>
        {!book.quiz && (
          <span>
            Up to {Math.round((qs.length * TREND_REWARDS.quizCoinsPerCorrect + TREND_REWARDS.quizPerfectCoins) * bonus)} coins
          </span>
        )}
      </div>
      <div className="mb-3 h-2 rounded-full bg-parchment-200">
        <div className="h-2 rounded-full transition-all" style={{ width: `${(i / qs.length) * 100}%`, background: t.color }} />
      </div>
      <p className="mb-3 font-display text-lg font-bold leading-snug text-navy-900">{q.prompt}</p>
      <div className="grid gap-2">
        {q.choices.map((c) => (
          <button key={c} onClick={() => setAnswers({ ...answers, [q.id]: c })} aria-pressed={picked === c} className={`rounded-2xl border-2 bg-white px-4 py-3 text-left text-sm leading-snug transition ${picked === c ? "border-ocean-500 shadow-pop" : "border-parchment-200 hover:border-ocean-400/60"}`}>
            {c}
          </button>
        ))}
      </div>
      <div className="mt-4 flex justify-between">
        <button className="btn btn-ghost" disabled={i === 0} onClick={() => setI(i - 1)}>
          Back
        </button>
        {i < qs.length - 1 ? (
          <button className="btn btn-primary" disabled={!picked} onClick={() => setI(i + 1)}>
            Next
          </button>
        ) : (
          <button
            className="btn btn-primary"
            disabled={!picked || busy}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await backend.trendQuiz(t.id, answers);
                apply(r);
                setResult(r);
                sound.play(r.correct === r.total ? "achievement" : "correct");
              } catch (e) {
                toast({ kind: "error", title: (e as Error).message });
              }
              setBusy(false);
            }}
          >
            {busy ? "Checking…" : "Check my answers"}
          </button>
        )}
      </div>
    </div>
  );
}

function Predictions({ t }: { t: PublicTrend }) {
  const { player, backend, run, toast } = useGame();
  const [busy, setBusy] = useState<string | null>(null);
  const book = player.trendBooks?.[t.id];
  const preds = [...(t.predictions ?? [])].sort((a, b) => (a.answer === undefined ? 0 : 1) - (b.answer === undefined ? 0 : 1));
  const bonus = followBonus(player);
  if (!preds.length) return <p className="text-navy-700/80">No predictions for this trend yet. New ones are added as the story develops.</p>;
  return (
    <>
      <p className="mb-4 text-sm text-navy-700/80">
        Make a call on what happens next. When the news settles it, a right answer earns {Math.round(TREND_REWARDS.predictionCoins * bonus)} coins and {Math.round(TREND_REWARDS.predictionXp * bonus)} XP.
      </p>
      {!book?.following && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-parchment-200">
          <span className="text-sm text-navy-800">Follow this trend to make predictions.</span>
          <FollowButton t={t} />
        </div>
      )}
      <ul className="space-y-3">
        {preds.map((pr) => {
          const mine = book?.predictions?.[pr.id];
          const resolved = pr.answer !== undefined;
          const closed = resolved || new Date().toISOString().slice(0, 10) > pr.closesAt;
          return (
            <li key={pr.id} className="rounded-2xl bg-white p-4 ring-1 ring-parchment-200">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider">
                <span className={resolved ? "text-land-600" : closed ? "text-navy-700/60" : "text-ocean-700"}>{resolved ? "Settled" : closed ? "Closed, waiting for the news" : `Open until ${fmtDay(pr.closesAt)}`}</span>
              </div>
              <p className="font-semibold text-navy-900">{pr.question}</p>
              <div className="mt-2 grid gap-1.5">
                {pr.options.map((o, oi) => {
                  const isMine = mine?.choice === oi;
                  const isAnswer = resolved && pr.answer === oi;
                  return (
                    <button
                      key={oi}
                      disabled={!!mine || closed || !book?.following || busy === pr.id}
                      onClick={async () => {
                        setBusy(pr.id);
                        const r = await run(backend.predict(t.id, pr.id, oi));
                        setBusy(null);
                        if (r) {
                          sound.play("click");
                          toast({ kind: "info", title: "Prediction saved", body: "We'll check it against the news.", icon: "🔮" });
                        }
                      }}
                      className={`flex items-center justify-between rounded-xl border-2 px-3 py-2 text-left text-sm transition enabled:hover:border-ocean-400 ${isAnswer ? "border-land-500 bg-land-500/10" : isMine ? "border-ocean-500 bg-ocean-400/10" : "border-parchment-200"}`}
                    >
                      <span>{o}</span>
                      <span className="text-xs font-bold">{isAnswer ? "What happened" : isMine ? "Your call" : ""}</span>
                    </button>
                  );
                })}
              </div>
              {resolved && pr.explanation && <p className="mt-2 text-sm text-navy-800">{pr.explanation}</p>}
              {resolved && pr.source && (
                <p className="mt-1 text-xs text-navy-700/70">
                  Source:{" "}
                  {pr.source.url ? (
                    <a className="font-semibold text-ocean-700 hover:underline" href={pr.source.url} target="_blank" rel="noopener noreferrer">
                      {pr.source.publication} ↗
                    </a>
                  ) : (
                    "demo scenario"
                  )}
                </p>
              )}
              {resolved && mine && !mine.claimedAt && (
                <button
                  className="btn btn-primary mt-3"
                  disabled={busy === pr.id}
                  onClick={async () => {
                    setBusy(pr.id);
                    const r = await run(backend.claimPrediction(t.id, pr.id));
                    setBusy(null);
                    if (r) {
                      const right = mine.choice === pr.answer;
                      sound.play(right ? "achievement" : "click");
                      toast({ kind: "coins", title: right ? "You called it!" : "Not this time", body: right ? `+${r.events.coins} coins · +${r.events.xp} XP` : `+${r.events.xp} XP for taking part`, icon: right ? "🔮" : "📘" });
                    }
                  }}
                >
                  {mine.choice === pr.answer ? "Collect your reward" : "See how you did"}
                </button>
              )}
              {mine?.claimedAt && <p className="mt-2 text-sm font-semibold text-navy-700">{mine.correct ? "✓ You called it." : "✗ You missed this one."}</p>}
            </li>
          );
        })}
      </ul>
    </>
  );
}
