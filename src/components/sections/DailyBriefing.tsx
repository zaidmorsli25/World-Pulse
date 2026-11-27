"use client";
import { motion } from "framer-motion";
import { MISSIONS_BY_ID } from "@/lib/game/missions";
import { useGame } from "../game/GameProvider";
import { TIER_LABEL } from "../map/Markers";
import { fmtDate, SectionPanel, timeAgo } from "../ui/bits";
import { CATEGORY_META, CategoryIcon, Coin, NavIcon, XpIcon } from "../ui/icons";

export function MissionsCard() {
  const { player, backend, run } = useGame();
  return (
    <div className="rounded-3xl bg-gradient-to-br from-navy-800 to-navy-700 p-5 text-white shadow-game">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Daily missions</h2>
        <span className="text-xs text-white/70">Optional · reset at midnight UTC</span>
      </div>
      <ul className="space-y-2.5">
        {player.missions.ids.map((id) => {
          const m = MISSIONS_BY_ID.get(id);
          if (!m) return null;
          const prog = Math.min(m.target, m.progress(player.daily));
          const done = prog >= m.target;
          const claimed = player.missions.claimed.includes(id);
          return (
            <li key={id} className="flex items-center gap-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
              <span className="text-2xl">{m.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{m.title}</p>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/15">
                  <motion.div className="h-full rounded-full bg-gold-400" initial={false} animate={{ width: `${(prog / m.target) * 100}%` }} />
                </div>
                <p className="mt-1 text-xs text-white/70">
                  {prog}/{m.target} · reward <Coin size={12} /> {m.coins} + <XpIcon size={12} /> {m.xp} XP
                </p>
              </div>
              {claimed ? (
                <span className="chip bg-land-500 text-white">Claimed</span>
              ) : (
                <button className="btn btn-primary !px-3 !py-1.5 text-sm" disabled={!done} onClick={() => run(backend.claimMission(id))}>
                  Claim
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function DailyBriefingSection() {
  const { news, player, openEvent, reloadNews } = useGame();
  const events = [...(news?.events ?? [])].sort((a, b) => b.importance.score - a.importance.score);
  const done = (id: string) => !!player.quizRecords[id];
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return (
    <SectionPanel
      title="Daily Briefing"
      subtitle={`${greet}, ${player.username}. ${events.filter((e) => !done(e.quizId)).length} briefings waiting.`}
      actions={
        <button className="btn btn-ghost !py-1.5 text-sm" onClick={reloadNews}>
          Refresh
        </button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-navy-700">
            <span className={`chip ${news?.mode === "live" ? "bg-land-500/15 text-land-600" : "bg-gold-300/40 text-navy-900"}`}>{news?.mode === "live" ? "● Live news" : "Demo scenarios"}</span>
            <span>Most recent news update: {news?.updatedAt ? `${fmtDate(news.updatedAt)} (${timeAgo(news.updatedAt)})` : "not yet"}</span>
          </div>
          {news?.mode === "demo" && (
            <p className="mb-4 rounded-2xl bg-gold-300/25 px-4 py-3 text-sm text-navy-900">
              Live news is not configured on this server yet, so WorldPulse is showing <b>fictional, illustrative scenarios</b> to demonstrate the game. They are not real news.
            </p>
          )}
          {news?.mode === "live" && events.length === 0 && <p className="rounded-2xl bg-parchment-100 p-4 text-navy-800">No verified briefings are available right now. The next news refresh will add more.</p>}
          <ol className="space-y-3">
            {events.map((e, i) => {
              const meta = CATEGORY_META[e.category];
              const isDone = done(e.quizId);
              return (
                <motion.li key={e.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.4) }}>
                  <button onClick={() => openEvent(e.id)} className="group flex w-full items-stretch overflow-hidden rounded-2xl border-2 border-parchment-200 bg-white text-left transition hover:-translate-y-0.5 hover:border-ocean-400 hover:shadow-md">
                    <span className="grid w-16 shrink-0 place-items-center text-white" style={{ background: `linear-gradient(160deg, ${meta.color}, ${meta.dark})` }}>
                      <CategoryIcon category={e.category} size={30} />
                    </span>
                    <span className="flex-1 p-3">
                      <span className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider">
                        <span style={{ color: meta.dark }}>{meta.label}</span>
                        <span className="text-navy-700/50">·</span>
                        <span className="text-navy-700/80">{TIER_LABEL[e.importance.tier]}</span>
                        <span className="text-navy-700/50">·</span>
                        <span className="text-navy-700/80">{e.region}</span>
                        {e.isDemo && <span className="chip bg-navy-900 text-gold-300">Demo</span>}
                      </span>
                      <span className="mt-0.5 block font-display text-lg font-semibold leading-snug text-navy-900">{e.title}</span>
                      <span className="mt-0.5 block text-xs text-navy-700/70">
                        {timeAgo(e.eventDate)} · {e.briefing.readingMinutes} min read · {e.sources.length} source{e.sources.length > 1 ? "s" : ""}
                      </span>
                    </span>
                    <span className="flex w-24 shrink-0 flex-col items-center justify-center gap-1 border-l border-parchment-200 px-2 text-center text-xs">
                      {isDone ? (
                        <>
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-land-500 text-white">
                            <NavIcon.check size={18} />
                          </span>
                          <span className="font-semibold text-land-600">Completed</span>
                        </>
                      ) : (
                        <>
                          <span className="font-display text-base font-bold text-navy-900">
                            <Coin size={14} /> {news?.maxCoins?.[e.id] ?? "?"}
                          </span>
                          <span className="text-navy-700/70">max reward</span>
                        </>
                      )}
                    </span>
                  </button>
                </motion.li>
              );
            })}
          </ol>
        </div>
        <div className="space-y-4">
          <MissionsCard />
          <div className="rounded-3xl border-2 border-parchment-200 bg-white p-5">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold text-navy-900">
              <span className="text-[#ff8a3d]">
                <NavIcon.flame size={22} />
              </span>
              {player.streak.count}-day streak
            </h2>
            <p className="mt-1 text-sm text-navy-700">Best: {player.streak.best} days. Each day you return adds a small coin bonus.</p>
            <p className="mt-2 text-sm text-navy-700">
              🛡️ Streak shields: <b>{player.streak.shields}</b>. A shield covers 1 missed day automatically, and you earn 1 every 7 days. Missing days never costs you coins or progress.
            </p>
          </div>
        </div>
      </div>
    </SectionPanel>
  );
}
