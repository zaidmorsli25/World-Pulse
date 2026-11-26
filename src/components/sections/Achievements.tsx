"use client";
import { RANKS } from "@/lib/config";
import { ACHIEVEMENTS } from "@/lib/game/achievements";
import { CATALOG } from "@/lib/game/catalog";
import { levelFromXp } from "@/lib/game/progression";
import { useGame } from "../game/GameProvider";
import { fmtDay, SectionPanel } from "../ui/bits";
import { Coin } from "../ui/icons";

export function AchievementsSection() {
  const { player } = useGame();
  const info = levelFromXp(player.xp);
  const unlocked = ACHIEVEMENTS.filter((a) => player.achievements[a.id]).length;

  return (
    <SectionPanel title="Achievements" subtitle={`${unlocked} of ${ACHIEVEMENTS.length} unlocked. Ranks unlock new shop items and free rewards.`}>
      <h2 className="mb-3 font-display text-lg font-bold text-navy-900">Rank ladder</h2>
      <ol className="scroll-thin mb-7 flex gap-2 overflow-x-auto pb-2">
        {RANKS.map((r, i) => {
          const reached = info.rankIndex >= i;
          const current = info.rankIndex === i;
          const rewards = CATALOG.filter((c) => c.rankReward && c.minRank === i);
          return (
            <li key={r.name} className={`flex w-36 shrink-0 flex-col items-center rounded-2xl border-2 p-3 text-center ${current ? "border-gold-400 bg-gold-300/20 shadow-pop" : reached ? "border-land-400 bg-white" : "border-parchment-200 bg-parchment-100 opacity-70"}`} aria-current={current ? "step" : undefined}>
              <span className={`text-3xl ${reached ? "" : "grayscale"}`}>{r.icon}</span>
              <span className="mt-1 font-display text-sm font-bold leading-tight text-navy-900">{r.name}</span>
              <span className="text-xs text-navy-700/70">Level {r.level}</span>
              {rewards.length > 0 && <span className="mt-1 text-[11px] leading-tight text-navy-700/90">🎁 {rewards.map((x) => x.name).join(", ")}</span>}
            </li>
          );
        })}
      </ol>

      <h2 className="mb-3 font-display text-lg font-bold text-navy-900">Badges</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ACHIEVEMENTS.map((a) => {
          const at = player.achievements[a.id];
          const prog = Math.min(a.target, a.progress(player));
          return (
            <article key={a.id} className={`flex gap-3 rounded-2xl border-2 p-3 ${at ? "border-gold-400 bg-white" : "border-parchment-200 bg-parchment-100"}`}>
              <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-3xl ${at ? "bg-gradient-to-br from-gold-300 to-gold-500 shadow-pop" : "bg-parchment-200 grayscale"}`}>{a.icon}</span>
              <div className="min-w-0 flex-1">
                <h3 className="font-display font-bold leading-tight text-navy-900">{a.name}</h3>
                <p className="text-xs text-navy-700/80">{a.description}</p>
                {at ? (
                  <p className="mt-1 text-xs font-semibold text-land-600">Unlocked {fmtDay(at)}</p>
                ) : (
                  <div className="mt-1.5">
                    <div className="h-2 overflow-hidden rounded-full bg-parchment-200" role="progressbar" aria-valuenow={prog} aria-valuemin={0} aria-valuemax={a.target} aria-label={`${a.name} progress`}>
                      <div className="h-full rounded-full bg-ocean-500" style={{ width: `${(prog / a.target) * 100}%` }} />
                    </div>
                    <p className="mt-0.5 flex justify-between text-[11px] text-navy-700/80">
                      <span>
                        {prog} / {a.target}
                      </span>
                      <span className="flex items-center gap-1">
                        <Coin size={12} /> {a.coins} · {a.xp} XP
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </SectionPanel>
  );
}
