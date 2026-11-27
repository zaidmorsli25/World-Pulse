"use client";
import { useState } from "react";
import { FIGURES_BY_ID } from "@/data/figures";
import { IMPORTANCE_WEIGHTS, REWARDS } from "@/lib/config";
import { COUNTRY_BY_ID } from "@/lib/client/world";
import type { Claim, ClaimKind, NewsEvent } from "@/lib/types";
import { useGame } from "../game/GameProvider";
import { TIER_LABEL } from "../map/Markers";
import { fmtDate, timeAgo } from "../ui/bits";
import { CATEGORY_META, CategoryIcon, Coin, NavIcon, XpIcon } from "../ui/icons";
import { Modal } from "../ui/Modal";
import { EventTrends } from "../trends/TrendPanels";
import { QuizView } from "./Quiz";

export const CLAIM_KIND: Record<ClaimKind, { label: string; cls: string; tip: string }> = {
  fact: { label: "Confirmed", cls: "bg-land-500/15 text-land-600", tip: "Confirmed by the reporting" },
  allegation: { label: "Allegation", cls: "bg-[#f97316]/15 text-[#b45309]", tip: "Claimed by one side; not independently confirmed" },
  disputed: { label: "Disputed", cls: "bg-[#e5484d]/15 text-[#b4262b]", tip: "The parties disagree about this" },
  opinion: { label: "Opinion", cls: "bg-[#8e4ec6]/15 text-[#6b2fa3]", tip: "Someone's view or analysis" },
  prediction: { label: "Outlook", cls: "bg-ocean-400/15 text-ocean-700", tip: "What may happen; uncertain" },
};

function Claims({ claims }: { claims: Claim[] }) {
  return (
    <ul className="space-y-2.5">
      {claims.map((c, i) => (
        <li key={i} className="flex gap-3 leading-relaxed text-navy-900">
          <span className={`chip mt-0.5 h-fit shrink-0 ${CLAIM_KIND[c.kind].cls}`} title={CLAIM_KIND[c.kind].tip}>
            {CLAIM_KIND[c.kind].label}
          </span>
          <span>{c.text}</span>
        </li>
      ))}
    </ul>
  );
}

function Section({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="mb-2.5 flex items-center gap-2 font-display text-lg font-bold text-navy-900">
        <span aria-hidden>{emoji}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

export function BriefingModal() {
  const { openEventId, openEvent, eventsById } = useGame();
  const e = openEventId ? eventsById.get(openEventId) : undefined;
  return (
    <Modal open={!!e} onClose={() => openEvent(null)} label={e ? `Briefing: ${e.title}` : "Briefing"} wide>
      {e && <BriefingBody key={e.id} e={e} />}
    </Modal>
  );
}

function BriefingBody({ e }: { e: NewsEvent }) {
  const { player, news, openFigure, flyToCountry, openCountry, openEvent } = useGame();
  const [mode, setMode] = useState<"read" | "quiz">("read");
  const [showWhy, setShowWhy] = useState(false);
  const meta = CATEGORY_META[e.category];
  const record = player.quizRecords[e.quizId];
  const maxCoins = news?.maxCoins?.[e.id] ?? 5 * REWARDS.coinsPerCorrect + REWARDS.perfectBonusCoins;

  return (
    <>
      <header className="relative shrink-0 px-6 pb-5 pt-6 text-white sm:px-8" style={{ background: `linear-gradient(135deg, ${meta.color}, ${meta.dark})` }}>
        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, #fff 0, transparent 40%)" }} />
        <div className="relative flex items-start gap-4 pr-10">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border-2 border-white/80 bg-white/15 shadow-pop">
            <CategoryIcon category={e.category} size={32} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider">
              <span>{meta.label}</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5">{TIER_LABEL[e.importance.tier]} · {e.importance.score}/100</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5">{e.briefing.readingMinutes} min read</span>
            </div>
            <h2 className="mt-1 font-display text-2xl font-bold leading-tight sm:text-3xl">{e.title}</h2>
            <p className="mt-1.5 text-sm text-white/85">
              Event date: {fmtDate(e.eventDate)} · Updated {timeAgo(e.updatedAt)}
            </p>
          </div>
        </div>
        {e.isDemo && (
          <div className="relative mt-4 rounded-xl bg-navy-950/40 px-3 py-2 text-sm font-semibold text-gold-300 ring-1 ring-gold-300/50">
            ⚠️ Demo scenario: this is a fictional, illustrative event for trying out the game. It is not real news.
          </div>
        )}
      </header>

      {mode === "quiz" ? (
        <QuizView event={e} onExit={() => setMode("read")} onDone={() => openEvent(null)} />
      ) : (
        <div className="scroll-thin flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          <Section title="What happened?" emoji="📍">
            <Claims claims={e.briefing.whatHappened} />
          </Section>
          {e.briefing.background.length > 0 && (
            <Section title="Background" emoji="📜">
              <Claims claims={e.briefing.background} />
            </Section>
          )}
          <Section title="Who is involved?" emoji="👥">
            <div className="flex flex-wrap gap-2">
              {e.briefing.involved.map((p, i) => {
                const fig = p.kind === "figure" && p.ref ? FIGURES_BY_ID.get(p.ref) : undefined;
                const country = p.kind === "country" && p.ref ? COUNTRY_BY_ID.get(p.ref) : undefined;
                const clickable = !!fig || !!country;
                return (
                  <button
                    key={i}
                    disabled={!clickable}
                    onClick={() => {
                      if (fig) openFigure(fig.id);
                      else if (country) {
                        openEvent(null);
                        flyToCountry(country.id);
                        openCountry(country.id);
                      }
                    }}
                    className={`flex items-center gap-2 rounded-2xl border-2 bg-white px-3 py-2 text-left transition ${clickable ? "border-ocean-400/40 hover:-translate-y-0.5 hover:border-ocean-400 hover:shadow-md" : "cursor-default border-parchment-200"}`}
                  >
                    <span className="text-xl">{country?.flag ?? (p.kind === "figure" ? "🧑‍💼" : p.kind === "organization" ? "🏛️" : "👥")}</span>
                    <span>
                      <span className="block text-sm font-semibold text-navy-900">{p.name}</span>
                      <span className="block text-xs text-navy-700/80">{p.role}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Section>
          <Section title="Why does it matter?" emoji="🌐">
            <Claims claims={e.briefing.whyItMatters} />
          </Section>
          <Section title="What happens next?" emoji="🔭">
            <Claims claims={e.briefing.whatNext} />
            <p className="mt-2 text-xs text-navy-700/70">Items marked &quot;Outlook&quot; are possibilities, not certainties.</p>
          </Section>

          <EventTrends eventId={e.id} />

          <section className="mb-6 rounded-2xl bg-navy-900 p-5 text-white" aria-label="Information sources">
            <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
              <NavIcon.link size={20} /> Information sources
            </h3>
            <ul className="space-y-3">
              {e.sources.map((s) => (
                <li key={s.id} className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider text-gold-300">
                    <span>{s.publication === "Demo" ? "Demo (no real source)" : s.publication}</span>
                    <span className="font-medium normal-case tracking-normal text-white/70">Published {fmtDate(s.publishedAt)}</span>
                  </div>
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="mt-1 block font-semibold text-white underline decoration-white/30 underline-offset-2 hover:decoration-gold-300">
                      {s.headline} ↗
                    </a>
                  ) : (
                    <p className="mt-1 text-white/85">{s.headline}</p>
                  )}
                </li>
              ))}
            </ul>
            {!e.isDemo && <p className="mt-3 text-xs text-white/60">WorldPulse summaries are original educational writing based on reporting from approved publications. Read the originals for full detail.</p>}
          </section>

          <section className="mb-4 rounded-2xl border-2 border-parchment-200 p-4">
            <button className="flex w-full items-center justify-between text-left font-display font-semibold text-navy-900" onClick={() => setShowWhy((s) => !s)} aria-expanded={showWhy}>
              Why is this marker {TIER_LABEL[e.importance.tier].toLowerCase()}-sized?
              <span>{showWhy ? "▲" : "▼"}</span>
            </button>
            {showWhy && (
              <div className="mt-3 space-y-2 text-sm">
                {(
                  [
                    ["Approved outlets covering it", "coverage"],
                    ["Prominence and frequency", "prominence"],
                    ["International consequences", "consequences"],
                    ["Recency", "recency"],
                    ["Economic, humanitarian, diplomatic or political significance", "significance"],
                  ] as const
                ).map(([label, k]) => (
                  <div key={k}>
                    <div className="flex justify-between text-navy-700">
                      <span>
                        {label} <span className="text-navy-700/60">({Math.round(IMPORTANCE_WEIGHTS[k] * 100)}%)</span>
                      </span>
                      <span className="font-semibold">{Math.round(e.importance.breakdown[k] * 100)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-parchment-200">
                      <div className="h-2 rounded-full bg-ocean-500" style={{ width: `${e.importance.breakdown[k] * 100}%` }} />
                    </div>
                  </div>
                ))}
                <p className="pt-1 text-xs text-navy-700/70">Media coverage is an imperfect measure of importance. Humanitarian crises receive a minimum score so they are not buried.</p>
              </div>
            )}
          </section>
        </div>
      )}

      {mode === "read" && (
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-parchment-200 bg-parchment-100 px-6 py-4 sm:px-8">
          <div className="text-sm text-navy-700">
            {record ? (
              <span>
                ✅ Completed · best score {record.bestCorrect}/{record.total}. Replays are practice.
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                Earn up to <Coin size={16} /> <b>{maxCoins}</b> and <XpIcon size={16} /> XP
              </span>
            )}
          </div>
          <button className="btn btn-primary text-lg" onClick={() => setMode("quiz")}>
            {record ? "Practice quiz" : "Take the quiz"} →
          </button>
        </footer>
      )}
    </>
  );
}
