"use client";
import { useEffect, useState } from "react";
import type { LedgerRow } from "@/lib/client/backend";
import { COUNTRY_BY_ID } from "@/lib/client/world";
import { continentsExplored } from "@/lib/game/achievements";
import { levelFromXp } from "@/lib/game/progression";
import { useGame } from "../game/GameProvider";
import { AvatarStudio } from "../profile/AvatarStudio";
import { AvatarFigure } from "../ui/Avatar";
import { fmtDate, fmtDay, SectionPanel, XPBar } from "../ui/bits";
import { Coin, XpIcon } from "../ui/icons";

export function ProfileSection() {
  const { player, me, backend, flyToCountry, openCountry, go } = useGame();
  const info = levelFromXp(player.xp);
  const [studio, setStudio] = useState(false);
  const [ledger, setLedger] = useState<LedgerRow[] | null>(null);

  useEffect(() => {
    backend
      .ledger()
      .then(setLedger)
      .catch(() => setLedger([]));
  }, [backend, player.version]);

  const stats: [string, string | number][] = [
    ["Quizzes completed", player.stats.quizzesCompleted],
    ["Perfect scores", player.stats.perfectQuizzes],
    ["Accuracy", player.stats.questionsAnswered ? `${Math.round((player.stats.correctAnswers / player.stats.questionsAnswered) * 100)}%` : "—"],
    ["Countries explored", player.countriesExplored.length],
    ["Continents", `${continentsExplored(player).length} / 5`],
    ["Leaders studied", player.figuresViewed.length],
    ["Current streak", `${player.streak.count} days`],
    ["Best streak", `${player.streak.best} days`],
    ["Items owned", player.inventory.length],
  ];

  return (
    <SectionPanel title="Profile" subtitle={`Member since ${fmtDay(me.user.createdAt)}`}>
      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-parchment-200">
          <div className="flex flex-col items-center text-center">
            <AvatarFigure avatar={player.avatar} equipped={player.equipped} size={150} />
            <h2 className="mt-2 font-display text-2xl font-bold text-navy-900">{player.username}</h2>
            <p className="font-semibold text-ocean-700">
              {info.rank.icon} {info.rank.name} · Level {info.level}
            </p>
            <div className="mt-2 w-full">
              <XPBar xp={player.xp} />
            </div>
            {info.nextRank && <p className="mt-1 text-xs text-navy-700/70">Next rank: {info.nextRank.name} at level {info.nextRank.level}</p>}
          </div>
          <hr className="my-4 border-parchment-200" />
          <button className="btn btn-primary w-full" onClick={() => setStudio(true)}>
            Customize avatar
          </button>
          <button className="mt-3 w-full text-sm font-semibold text-ocean-700 hover:underline" onClick={() => go("hq")}>
            Visit your Headquarters
          </button>
          <AvatarStudio open={studio} onClose={() => setStudio(false)} />
        </div>

        <div className="space-y-6">
          <section>
            <h2 className="mb-2 font-display text-lg font-bold text-navy-900">Statistics</h2>
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {stats.map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-white p-3 ring-1 ring-parchment-200">
                  <dt className="text-xs font-semibold text-navy-700/70">{k}</dt>
                  <dd className="font-display text-xl font-bold text-navy-900">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <h2 className="mb-2 font-display text-lg font-bold text-navy-900">Countries explored ({player.countriesExplored.length})</h2>
            {player.countriesExplored.length === 0 ? (
              <p className="text-sm text-navy-700/80">Click a country on the world map to explore it.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {player.countriesExplored.map((id) => {
                  const c = COUNTRY_BY_ID.get(id);
                  if (!c) return null;
                  return (
                    <button
                      key={id}
                      className="chip bg-white py-1 text-sm text-navy-900 ring-1 ring-parchment-200 hover:ring-ocean-400"
                      onClick={() => {
                        go("map");
                        flyToCountry(id);
                        openCountry(id);
                      }}
                    >
                      {c.flag} {c.name}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-2 font-display text-lg font-bold text-navy-900">Reward history</h2>
            {ledger === null ? (
              <p className="text-sm text-navy-700/70">Loading…</p>
            ) : ledger.length === 0 ? (
              <p className="text-sm text-navy-700/70">No activity yet.</p>
            ) : (
              <ul className="divide-y divide-parchment-200 rounded-2xl bg-white ring-1 ring-parchment-200">
                {ledger.slice(0, 30).map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-navy-900">{r.note}</span>
                      <span className="text-xs text-navy-700/70">{fmtDate(r.at)}</span>
                    </span>
                    <span className="shrink-0 text-right text-xs font-semibold">
                      {r.coins !== 0 && (
                        <span className={`flex items-center justify-end gap-1 ${r.coins > 0 ? "text-land-600" : "text-[#c2373c]"}`}>
                          <Coin size={12} /> {r.coins > 0 ? "+" : ""}
                          {r.coins}
                        </span>
                      )}
                      {r.xp > 0 && (
                        <span className="flex items-center justify-end gap-1 text-ocean-700">
                          <XpIcon size={12} /> +{r.xp} XP
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </SectionPanel>
  );
}
