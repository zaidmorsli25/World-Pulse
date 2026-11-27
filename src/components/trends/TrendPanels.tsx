"use client";
import { AnimatePresence, motion } from "framer-motion";
import { COUNTRY_BY_ID } from "@/lib/client/world";
import type { PublicTrend } from "@/lib/trends";
import { useGame } from "../game/GameProvider";

import { NavIcon } from "../ui/icons";
import { Modal } from "../ui/Modal";
import { FollowButton } from "./TrendBook";

/** "Nov 24, 2026" for a full ISO time or a plain YYYY-MM-DD day (read as a local date, not UTC). */
export function fmtDay(s: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(s);
  return d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

export const KIND_LABEL = { direct: "Direct", ripple: "Ripple" } as const;
export const KIND_TIP = {
  direct: "The cause acts on this story itself (solid line on the map).",
  ripple: "A knock-on effect of the cause (dotted line on the map).",
} as const;

/** Which of a trend's stories the player has finished (quiz done). */
export function useTrendProgress(t: PublicTrend | null | undefined) {
  const { eventsById, player } = useGame();
  if (!t) return { read: new Set<string>(), total: 0 };
  const read = new Set(t.links.filter((l) => {
    const e = eventsById.get(l.eventId);
    return e && player.quizRecords[e.quizId];
  }).map((l) => l.eventId));
  return { read, total: t.links.length };
}

export function KindBadge({ kind, color }: { kind: "direct" | "ripple"; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-parchment-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-navy-800 ring-1 ring-parchment-200" title={KIND_TIP[kind]}>
      <svg width="22" height="6" aria-hidden>
        <line x1="3" y1="3" x2="19" y2="3" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray={kind === "ripple" ? "0.5 5" : undefined} />
      </svg>
      {KIND_LABEL[kind]}
    </span>
  );
}

/** The side card that opens with the trend lens. */
export function TrendCard() {
  const { trends, lensTrendId, setLensTrend, openBigPicture, openEvent, eventsById } = useGame();
  const t = trends.find((x) => x.id === lensTrendId && x.status === "active");
  const { read, total } = useTrendProgress(t);
  return (
    <AnimatePresence>
      {t && (
        <motion.aside
          key={t.id}
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 30, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="panel pointer-events-auto absolute inset-x-2 bottom-[78px] z-20 max-h-[40dvh] overflow-hidden sm:inset-x-auto sm:bottom-5 sm:left-24 sm:max-h-[min(34rem,calc(100dvh-12rem))] sm:w-[22rem]"
          aria-label={`Trend: ${t.name}`}
        >
          <div className="flex h-full max-h-[inherit] flex-col">
            <header className="relative shrink-0 px-4 pb-3 pt-3.5 text-white" style={{ background: `linear-gradient(135deg, ${t.color}, ${shade(t.color)})` }}>
              <button className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/20 hover:bg-white/30" onClick={() => setLensTrend(null)} aria-label="Close trend">
                <NavIcon.close size={16} />
              </button>
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/85">
                <NavIcon.trends size={14} /> Trend
              </p>
              <h2 className="pr-8 font-display text-xl font-bold leading-tight">{t.name}</h2>
              <p className="mt-1 hidden text-sm leading-snug text-white/90 sm:block">{t.cause}</p>
            </header>
            <div className="scroll-thin flex-1 overflow-y-auto px-4 py-3">
              <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-navy-700/70">
                <span>Stories</span>
                <span>
                  {read.size} of {total} read
                </span>
              </div>
              <div className="mb-3 h-2 rounded-full bg-parchment-200">
                <div className="h-2 rounded-full transition-all" style={{ width: `${total ? (read.size / total) * 100 : 0}%`, background: t.color }} />
              </div>
              <ul className="space-y-1.5">
                {t.links.map((l) => {
                  const done = read.has(l.eventId);
                  const live = l.live && eventsById.has(l.eventId);
                  return (
                    <li key={l.eventId}>
                      <button disabled={!live} onClick={() => openEvent(l.eventId)} className="flex w-full items-start gap-2.5 rounded-xl px-2 py-1.5 text-left transition enabled:hover:bg-parchment-100 disabled:opacity-60">
                        <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${done ? "bg-land-500 text-white" : "ring-2 ring-parchment-200"}`}>{done ? "✓" : ""}</span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold leading-snug text-navy-900">
                            <span className="mr-1">{COUNTRY_BY_ID.get(l.country)?.flag}</span>
                            {l.eventTitle}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-navy-700/80">
                            <KindBadge kind={l.kind} color={t.color} /> {l.label}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
            <footer className="flex shrink-0 gap-2 border-t border-parchment-200 p-3">
              <button className="btn btn-primary flex-1" onClick={() => openBigPicture(t.id)}>
                See the big picture
              </button>
              <FollowButton t={t} className="!px-3" />
            </footer>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

/** A darker version of a hex color, for gradients. */
export function shade(hex: string, f = 0.62) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.round(v * f).toString(16).padStart(2, "0");
  return `#${c((n >> 16) & 255)}${c((n >> 8) & 255)}${c(n & 255)}`;
}

export function BigPictureModal() {
  const { trends, bigPictureId, openBigPicture } = useGame();
  const t = trends.find((x) => x.id === bigPictureId);
  return (
    <Modal open={!!t} onClose={() => openBigPicture(null)} label={t ? `The big picture: ${t.name}` : "The big picture"} wide>
      {t && <BigPicture key={t.id} t={t} />}
    </Modal>
  );
}

function BigPicture({ t }: { t: PublicTrend }) {
  const { openBigPicture, openEvent, setLensTrend, eventsById, go, section, player, openBook } = useGame();
  const { read, total } = useTrendProgress(t);
  return (
    <>
      <header className="relative shrink-0 px-6 pb-5 pt-6 text-white sm:px-8" style={{ background: `linear-gradient(135deg, ${t.color}, ${shade(t.color)})` }}>
        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, #fff 0, transparent 40%)" }} />
        <div className="relative pr-10">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
            <NavIcon.trends size={16} /> {t.status === "retired" ? "Past trend" : "Trend"} · the big picture
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold leading-tight sm:text-3xl">{t.name}</h2>
          <p className="mt-2 max-w-2xl text-white/90">
            <b>The cause:</b> {t.cause}
          </p>
          <p className="mt-2 text-sm text-white/80">
            {read.size} of {total} stories read
          </p>
        </div>
        {t.isDemo && <div className="relative mt-4 rounded-xl bg-navy-950/40 px-3 py-2 text-sm font-semibold text-gold-300 ring-1 ring-gold-300/50">⚠️ Demo trend: it links fictional demo scenarios. It is not real news.</div>}
      </header>
      <div className="scroll-thin flex-1 overflow-y-auto px-6 py-6 sm:px-8">
        <section className="mb-6">
          <h3 className="mb-2.5 font-display text-lg font-bold text-navy-900">🌐 What is going on?</h3>
          <div className="space-y-3 leading-relaxed text-navy-900">
            {t.summary.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </section>

        <section className="mb-6">
          <h3 className="mb-1 font-display text-lg font-bold text-navy-900">🧵 How the stories connect</h3>
          <p className="mb-3 text-sm text-navy-700/80">
            <b>Direct</b> stories are caused by the trend itself. <b>Ripple</b> stories are knock-on effects. Each link is stated by the reporting it cites.
          </p>
          <ul className="space-y-2.5">
            {t.links.map((l) => {
              const live = l.live && eventsById.has(l.eventId);
              const done = read.has(l.eventId);
              return (
                <li key={l.eventId} className="rounded-2xl border-2 border-parchment-200 bg-white p-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <KindBadge kind={l.kind} color={t.color} />
                    <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ background: t.color }}>
                      {l.label}
                    </span>
                    {done && <span className="rounded-full bg-land-500/15 px-2 py-0.5 text-xs font-bold text-land-600">✓ Read</span>}
                    <span className="ml-auto text-xs text-navy-700/70">{fmtDay(l.eventDate)}</span>
                  </div>
                  <p className="mt-1.5 font-semibold text-navy-900">
                    <span className="mr-1">{COUNTRY_BY_ID.get(l.country)?.flag}</span>
                    {l.eventTitle}
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-navy-800">{l.note}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                    {l.source.url ? (
                      <a href={l.source.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-ocean-700 underline decoration-ocean-400/40 underline-offset-2 hover:decoration-ocean-600">
                        Source: {l.source.publication} ↗
                      </a>
                    ) : (
                      <span className="text-navy-700/70">Source: demo scenario</span>
                    )}
                    {live ? (
                      <button
                        className="font-semibold text-navy-900 hover:underline"
                        onClick={() => {
                          openBigPicture(null);
                          openEvent(l.eventId);
                        }}
                      >
                        Open briefing →
                      </button>
                    ) : (
                      <span className="text-navy-700/60">No longer on the map</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {t.timeline.length > 0 && (
          <section className="mb-6">
            <h3 className="mb-3 font-display text-lg font-bold text-navy-900">🗓️ Timeline</h3>
            <ol className="relative ml-2 border-l-2 pl-5" style={{ borderColor: t.color }}>
              {t.timeline.map((x, i) => (
                <li key={i} className="relative mb-3 last:mb-0">
                  <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-2 ring-white" style={{ background: t.color }} />
                  <p className="text-xs font-bold uppercase tracking-wider text-navy-700/70">{fmtDay(x.date)}</p>
                  <p className="text-navy-900">{x.text}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

        <div className="mb-6 rounded-2xl bg-parchment-100 p-4 ring-1 ring-parchment-200">
          <p className="mb-2 text-sm text-navy-800">
            <b>Follow this trend</b> to put its book on your Headquarters library shelf. Each briefing you read adds a page, and the book has a connect-the-dots quiz and predictions that earn coins and XP.
          </p>
          <div className="flex flex-wrap gap-2">
            <FollowButton t={t} />
            {player.trendBooks?.[t.id]?.following && (
              <button
                className="btn btn-ghost"
                onClick={() => {
                  openBigPicture(null);
                  openBook(t.id);
                }}
              >
                Open the book
              </button>
            )}
          </div>
        </div>

        {t.status === "active" && (
          <button
            className="btn btn-blue"
            onClick={() => {
              openBigPicture(null);
              setLensTrend(t.id);
              if (section !== "map") go("map");
            }}
          >
            <NavIcon.map size={18} /> Show this trend on the map
          </button>
        )}
      </div>
    </>
  );
}

/** "Part of a bigger story" box inside an event's briefing. */
export function EventTrends({ eventId }: { eventId: string }) {
  const { trends, openBigPicture, openEvent } = useGame();
  const mine = trends.filter((t) => t.status === "active" && t.links.some((l) => l.eventId === eventId));
  if (!mine.length) return null;
  return (
    <section className="mb-6 rounded-2xl border-2 border-parchment-200 bg-parchment-50 p-4" aria-label="Part of a bigger story">
      <h3 className="mb-2 flex items-center gap-2 font-display text-lg font-bold text-navy-900">
        <NavIcon.trends size={20} /> Part of a bigger story
      </h3>
      <ul className="space-y-2">
        {mine.map((t) => {
          const l = t.links.find((x) => x.eventId === eventId)!;
          return (
            <li key={t.id} className="flex flex-wrap items-start gap-3 rounded-xl bg-white p-3 ring-1 ring-parchment-200">
              <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: t.color }} />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-navy-900">{t.name}</span>
                <span className="mt-0.5 block text-sm text-navy-800">{l.note}</span>
                <span className="mt-1 block">
                  <KindBadge kind={l.kind} color={t.color} />
                </span>
              </span>
              <button
                className="btn btn-ghost !py-1.5 text-sm"
                onClick={() => {
                  openEvent(null);
                  openBigPicture(t.id);
                }}
              >
                See the big picture
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
