"use client";
import { useEffect, useState } from "react";
import type { LedgerRow } from "@/lib/client/backend";
import { COUNTRY_BY_ID } from "@/lib/client/world";
import { continentsExplored } from "@/lib/game/achievements";
import { levelFromXp } from "@/lib/game/progression";
import type { AvatarConfig } from "@/lib/types";
import { useGame } from "../game/GameProvider";
import { AvatarFigure, BACKDROPS, HAIR_COLORS, HAIR_STYLES, SKIN } from "../ui/Avatar";
import { fmtDate, fmtDay, SectionPanel, XPBar } from "../ui/bits";
import { Coin } from "../ui/icons";

function Swatches({ label, colors, value, onPick }: { label: string; colors: string[]; value: number; onPick: (i: number) => void }) {
  return (
    <fieldset className="mb-3">
      <legend className="mb-1 text-xs font-bold uppercase tracking-wider text-navy-700/70">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {colors.map((c, i) => (
          <button key={c} onClick={() => onPick(i)} aria-label={`${label} option ${i + 1}`} aria-pressed={value === i} className={`h-9 w-9 rounded-full ring-offset-2 transition ${value === i ? "ring-4 ring-gold-400" : "ring-2 ring-white hover:scale-110"}`} style={{ background: c }} />
        ))}
      </div>
    </fieldset>
  );
}

export function ProfileSection() {
  const { player, me, backend, run, flyToCountry, openCountry, go } = useGame();
  const info = levelFromXp(player.xp);
  const [draft, setDraft] = useState<AvatarConfig>(player.avatar);
  const [ledger, setLedger] = useState<LedgerRow[] | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(player.avatar);

  useEffect(() => {
    backend
      .ledger()
      .then(setLedger)
      .catch(() => setLedger([]));
  }, [backend, player.version]);

  const save = async () => {
    setSaving(true);
    await run(backend.updateAvatar(draft));
    setSaving(false);
  };

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
            <AvatarFigure avatar={draft} equipped={player.equipped} size={150} />
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
          <h3 className="mb-2 font-display font-bold text-navy-900">Customize avatar</h3>
          <Swatches label="Skin tone" colors={SKIN} value={draft.skin} onPick={(skin) => setDraft({ ...draft, skin })} />
          <fieldset className="mb-3">
            <legend className="mb-1 text-xs font-bold uppercase tracking-wider text-navy-700/70">Hair style</legend>
            <div className="flex flex-wrap gap-1.5">
              {HAIR_STYLES.map((h, i) => (
                <button key={h} onClick={() => setDraft({ ...draft, hair: i })} aria-pressed={draft.hair === i} className={`rounded-xl px-2.5 py-1 text-sm font-semibold ${draft.hair === i ? "bg-navy-800 text-white" : "bg-parchment-100 text-navy-700"}`}>
                  {h}
                </button>
              ))}
            </div>
          </fieldset>
          <Swatches label="Hair colour" colors={HAIR_COLORS} value={draft.hairColor} onPick={(hairColor) => setDraft({ ...draft, hairColor })} />
          <Swatches label="Badge colour" colors={BACKDROPS} value={draft.backdrop} onPick={(backdrop) => setDraft({ ...draft, backdrop })} />
          <div className="flex gap-2">
            <button className="btn btn-primary flex-1" disabled={!dirty || saving} onClick={save}>
              {saving ? "Saving…" : "Save avatar"}
            </button>
            {dirty && (
              <button className="btn btn-ghost" onClick={() => setDraft(player.avatar)}>
                Undo
              </button>
            )}
          </div>
          <button className="mt-3 w-full text-sm font-semibold text-ocean-700 hover:underline" onClick={() => go("hq")}>
            Change outfit and headwear in Headquarters
          </button>
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
                      {r.xp > 0 && <span className="block text-ocean-700">+{r.xp} XP</span>}
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
