"use client";
import { FIGURES_BY_ID, ROLE_LABEL } from "@/data/figures";
import { COUNTRY_BY_ID } from "@/lib/client/world";
import { useGame } from "../game/GameProvider";
import { fmtDay } from "../ui/bits";
import { CATEGORY_META, CategoryIcon } from "../ui/icons";
import { Modal } from "../ui/Modal";
import { usePortrait } from "@/lib/client/portraits";
import { FigureBadge } from "./FigureBadge";

function yearsSince(iso: string) {
  const ms = Date.now() - Date.parse(iso);
  const y = Math.floor(ms / (365.25 * 86400000));
  const m = Math.floor((ms % (365.25 * 86400000)) / (30.44 * 86400000));
  return y > 0 ? `${y} yr${y > 1 ? "s" : ""}${m ? ` ${m} mo` : ""}` : `${m} months`;
}

export function FigureModal() {
  const { figureId, openFigure, news, openEvent, flyToCountry, openCountry, go } = useGame();
  const f = figureId ? FIGURES_BY_ID.get(figureId) : undefined;
  const photo = usePortrait(f?.id);
  const country = f?.country ? COUNTRY_BY_ID.get(f.country) : undefined;
  const related = f ? (news?.events ?? []).filter((e) => e.figures.includes(f.id) || e.briefing.involved.some((i) => i.ref === f.id)) : [];
  return (
    <Modal open={!!f} onClose={() => openFigure(null)} label={f ? `Profile: ${f.name}` : "Profile"}>
      {f && (
        <div className="scroll-thin overflow-y-auto">
          <header className="flex items-center gap-4 bg-gradient-to-br from-navy-800 to-navy-600 px-6 pb-5 pt-7 text-white">
            <FigureBadge figure={f} size={76} />
            <div className="pr-8">
              <h2 className="font-display text-2xl font-bold leading-tight">{f.name}</h2>
              <p className="text-sm text-white/85">{f.position}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <span className="chip bg-gold-400 text-navy-900">{ROLE_LABEL[f.role]}</span>
                {country && (
                  <span className="chip bg-white/15 text-white">
                    {country.flag} {country.name}
                  </span>
                )}
                {f.organization && <span className="chip bg-white/15 text-white">🌐 {f.organization}</span>}
              </div>
            </div>
          </header>
          <div className="space-y-5 px-6 py-5">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-parchment-100 p-3">
                <dt className="text-xs font-bold uppercase tracking-wider text-navy-700/70">Affiliation</dt>
                <dd className="mt-0.5 font-semibold text-navy-900">{f.affiliation ?? "Non-partisan / not applicable"}</dd>
              </div>
              <div className="rounded-2xl bg-parchment-100 p-3">
                <dt className="text-xs font-bold uppercase tracking-wider text-navy-700/70">Time in role</dt>
                <dd className="mt-0.5 font-semibold text-navy-900">
                  {f.approxSince ? (
                    <>since {f.inOfficeSince.slice(0, 4)}</>
                  ) : (
                    <>
                      {yearsSince(f.inOfficeSince)} <span className="font-normal text-navy-700/80">(since {fmtDay(f.inOfficeSince)})</span>
                    </>
                  )}
                </dd>
              </div>
            </dl>
            {f.watch && <p className="rounded-xl bg-gold-300/30 px-3 py-2 text-sm text-navy-900">⏳ {f.watch}</p>}
            <section>
              <h3 className="mb-1 font-display text-lg font-bold text-navy-900">Biography</h3>
              <p className="leading-relaxed text-navy-900">{f.bio}</p>
            </section>
            <section>
              <h3 className="mb-1 font-display text-lg font-bold text-navy-900">Major policy positions</h3>
              <ul className="list-disc space-y-1 pl-5 text-navy-900">
                {f.policies.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </section>
            <section>
              <h3 className="mb-1 font-display text-lg font-bold text-navy-900">Why they matter now</h3>
              <p className="leading-relaxed text-navy-900">{f.relevance}</p>
            </section>
            {related.length > 0 && (
              <section>
                <h3 className="mb-2 font-display text-lg font-bold text-navy-900">Related news events</h3>
                <div className="space-y-2">
                  {related.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => {
                        openFigure(null);
                        go("map");
                        openEvent(e.id);
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left text-white"
                      style={{ background: `linear-gradient(135deg, ${CATEGORY_META[e.category].color}, ${CATEGORY_META[e.category].dark})` }}
                    >
                      <CategoryIcon category={e.category} size={24} />
                      <span className="text-sm font-semibold">
                        {e.title}
                        {e.isDemo && <span className="font-normal text-white/80"> · demo scenario</span>}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-parchment-200 pt-4">
              <p className="text-xs text-navy-700/70">
                Office details verified as of {fmtDay(f.verifiedAsOf)}.
                {photo && (
                  <>
                    {" "}
                    Photo:{" "}
                    <a href={photo.source} target="_blank" rel="noreferrer" className="underline">
                      {photo.credit}
                    </a>
                    , {photo.license}, via Wikimedia Commons.
                  </>
                )}
              </p>
              {country && (
                <button
                  className="btn btn-blue !py-2 text-sm"
                  onClick={() => {
                    openFigure(null);
                    flyToCountry(country.id);
                    openCountry(country.id);
                  }}
                >
                  Show {country.name} on map
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
