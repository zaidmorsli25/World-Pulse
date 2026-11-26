"use client";
import { AnimatePresence, motion } from "framer-motion";
import { COUNTRY_PROFILES, PROFILE_DATA_NOTE } from "@/data/countryProfiles";
import { FIGURES, FIGURES_BY_ID, ROLE_LABEL } from "@/data/figures";
import { COUNTRY_BY_ID } from "@/lib/client/world";
import { FigureBadge } from "../figures/FigureBadge";
import { useGame } from "../game/GameProvider";
import { CATEGORY_META, CategoryIcon, NavIcon } from "../ui/icons";
import { TIER_LABEL } from "./Markers";

const fmtPop = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(2)} billion` : n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)} million` : n.toLocaleString());
const fmtGdp = (bn: number) => (bn >= 1000 ? `$${(bn / 1000).toFixed(1)} trillion` : `$${Math.round(bn)} billion`);

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-parchment-200 py-2 text-sm last:border-0">
      <dt className="shrink-0 font-semibold text-navy-700/80">{label}</dt>
      <dd className="text-right text-navy-900">{children}</dd>
    </div>
  );
}

export function CountryPanel() {
  const { countryId, openCountry, news, openEvent, openFigure, flyToCountry, player } = useGame();
  const c = countryId ? COUNTRY_BY_ID.get(countryId) : undefined;
  const profile = c ? COUNTRY_PROFILES[c.id] : undefined;
  const events = c ? (news?.events ?? []).filter((e) => e.countries.includes(c.id)).sort((a, b) => b.importance.score - a.importance.score) : [];
  const leaders = profile ? [...new Set([profile.headOfState, profile.headOfGovernment, ...(profile.otherFigures ?? [])].filter(Boolean) as string[])] : c ? FIGURES.filter((f) => f.country === c.id).map((f) => f.id) : [];

  return (
    <AnimatePresence>
      {c && (
        <motion.aside
          key={c.id}
          initial={{ x: 420, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 420, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 32 }}
          className="panel absolute bottom-[72px] right-2 top-[132px] z-30 flex w-[min(24rem,calc(100vw-1rem))] flex-col overflow-hidden sm:bottom-4 sm:right-4 sm:top-20"
          aria-label={`${c.name} country information`}
        >
          <header className="relative bg-gradient-to-br from-land-500 to-land-600 px-5 pb-4 pt-5 text-white">
            <button onClick={() => openCountry(null)} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-navy-900/40 hover:bg-navy-900/70" aria-label="Close country panel">
              <NavIcon.close size={16} />
            </button>
            <div className="flex items-center gap-3 pr-8">
              <span className="text-5xl drop-shadow">{c.flag}</span>
              <div>
                <h2 className="font-display text-2xl font-bold leading-tight">{c.name}</h2>
                <p className="text-sm text-white/85">{c.official}</p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold">
              {c.subregion && <span className="rounded-full bg-white/20 px-2 py-0.5">{c.subregion}</span>}
              {c.unMember && <span className="rounded-full bg-white/20 px-2 py-0.5">UN member</span>}
              {player.countriesExplored.includes(c.id) && <span className="rounded-full bg-gold-400 px-2 py-0.5 text-navy-900">✓ Explored</span>}
            </div>
          </header>
          <div className="scroll-thin flex-1 overflow-y-auto px-5 py-4">
            {c.note && (
              <p className={`mb-3 rounded-xl px-3 py-2 text-sm ${c.disputed ? "bg-gold-300/30 text-navy-900" : "bg-parchment-100 text-navy-800"}`}>
                {c.disputed && <b>Status disputed. </b>}
                {c.note}
              </p>
            )}
            <dl>
              <Row label="Capital">{c.capital ?? "—"}</Row>
              {profile && <Row label="Population">≈ {fmtPop(profile.population)}</Row>}
              {profile && <Row label="Government">{profile.government}</Row>}
              {profile?.gdpUsdBn ? <Row label="Economy (GDP)">≈ {fmtGdp(profile.gdpUsdBn)}</Row> : null}
              {c.areaKm2 ? <Row label="Area">{Math.round(c.areaKm2).toLocaleString()} km²</Row> : null}
              {c.languages.length > 0 && <Row label="Languages">{c.languages.slice(0, 4).join(", ")}</Row>}
              {c.currencies.length > 0 && <Row label="Currency">{c.currencies.join(", ")}</Row>}
            </dl>

            {leaders.length > 0 && (
              <section className="mt-4">
                <h3 className="mb-2 font-display font-bold text-navy-900">Political leadership</h3>
                <div className="space-y-2">
                  {leaders.map((id) => {
                    const f = FIGURES_BY_ID.get(id);
                    if (!f) return null;
                    const tag = id === profile?.headOfState && id === profile?.headOfGovernment ? "Head of state & government" : id === profile?.headOfState ? "Head of state" : id === profile?.headOfGovernment ? "Head of government" : ROLE_LABEL[f.role];
                    return (
                      <button key={id} onClick={() => openFigure(id)} className="flex w-full items-center gap-3 rounded-2xl border-2 border-parchment-200 bg-white p-2 text-left transition hover:border-ocean-400">
                        <FigureBadge figure={f} size={40} />
                        <span className="min-w-0">
                          <span className="block font-semibold text-navy-900">{f.name}</span>
                          <span className="block truncate text-xs text-navy-700/80">{f.position}</span>
                          <span className="chip mt-0.5 bg-ocean-400/15 text-ocean-700">{tag}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {profile && (
              <section className="mt-4">
                <h3 className="mb-2 font-display font-bold text-navy-900">International relationships</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-navy-900">
                  {profile.relationships.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                <div className="mt-2 flex flex-wrap gap-1">
                  {profile.memberships.map((m) => (
                    <span key={m} className="chip bg-navy-900/5 text-navy-800">
                      {m}
                    </span>
                  ))}
                </div>
              </section>
            )}

            <section className="mt-4">
              <h3 className="mb-2 font-display font-bold text-navy-900">Active news stories</h3>
              {events.length === 0 ? (
                <p className="text-sm text-navy-700/70">No major developments in the current briefings. Not every country has a news marker at any given time.</p>
              ) : (
                <div className="space-y-2">
                  {events.map((e) => (
                    <button key={e.id} onClick={() => openEvent(e.id)} className="flex w-full items-center gap-3 rounded-2xl p-2 text-left text-white transition hover:brightness-110" style={{ background: `linear-gradient(135deg, ${CATEGORY_META[e.category].color}, ${CATEGORY_META[e.category].dark})` }}>
                      <CategoryIcon category={e.category} size={26} />
                      <span>
                        <span className="block text-sm font-semibold leading-snug">{e.title}</span>
                        <span className="block text-xs text-white/80">
                          {TIER_LABEL[e.importance.tier]} {e.isDemo && "· demo scenario"}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {c.borders.length > 0 && (
              <section className="mt-4">
                <h3 className="mb-2 font-display font-bold text-navy-900">Neighbours</h3>
                <div className="flex flex-wrap gap-1.5">
                  {c.borders.map((b) => {
                    const n = COUNTRY_BY_ID.get(b);
                    if (!n) return null;
                    return (
                      <button
                        key={b}
                        onClick={() => {
                          flyToCountry(b);
                          openCountry(b);
                        }}
                        className="chip bg-white py-1 text-sm text-navy-900 ring-1 ring-parchment-200 hover:ring-ocean-400"
                      >
                        {n.flag} {n.name}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
            <p className="mt-5 text-[11px] leading-snug text-navy-700/60">
              Reference data: Natural Earth (public domain) and world-countries (ODbL). {profile ? PROFILE_DATA_NOTE : "Detailed profile not yet curated for this country."}
              {profile?.note ? ` ${profile.note}` : ""}
            </p>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
