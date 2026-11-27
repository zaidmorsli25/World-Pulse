"use client";
import { geoMercator, geoNaturalEarth1, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { useMemo } from "react";
import { placeBadges } from "@/lib/client/quizBadges";
import { useWorld } from "@/lib/client/world";

const LETTERS = ["A", "B", "C", "D", "E"];
const HIGHLIGHT = ["#f2b134", "#4da3e0", "#e5484d", "#8e4ec6", "#12a594"];

/** Regional map used by map-based quiz questions: candidate countries are highlighted and clickable. */
export function QuizRegionMap({ countryIds, selected, correct, onPick, disabled }: { countryIds: string[]; selected: number | null; correct: number | null; onPick: (i: number) => void; disabled: boolean }) {
  const { world } = useWorld();
  const W = 520;
  const H = 300;
  const data = useMemo(() => {
    if (!world) return null;
    const feats = countryIds.map((id) => world.byId.get(id)).filter(Boolean) as Feature<Geometry, { name: string }>[];
    const fc: FeatureCollection = { type: "FeatureCollection", features: feats };
    const proj = geoNaturalEarth1().fitExtent(
      [
        [30, 24],
        [W - 30, H - 24],
      ],
      fc,
    );
    const path = geoPath(proj);
    return {
      all: world.features.map((f) => ({ id: String(f.id), d: path(f) ?? "" })),
      cand: placeBadges(
        countryIds.map((id) => {
          const f = world.byId.get(id);
          return f ? { id, d: path(f) ?? "", c: path.centroid(f), b: path.bounds(f) } : null;
        }),
        W,
        H,
      ),
    };
  }, [world, countryIds]);

  if (!data) return <div className="h-[220px] animate-pulse rounded-2xl bg-ocean-400/20" />;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-2xl" style={{ background: "linear-gradient(#2d86cc,#1f67a8)" }} role="group" aria-label="Map of the candidate countries">
      {data.all.map((c) => (
        <path key={c.id} d={c.d} fill="#7dba67" stroke="#3f7334" strokeWidth={0.5} />
      ))}
      {data.cand.map((c, i) => {
        if (!c) return null;
        const isCorrect = correct === i;
        const isSel = selected === i;
        const fill = correct !== null ? (isCorrect ? "#3fbf6f" : isSel ? "#e5484d" : "#c9d6c2") : isSel ? "#fff3c4" : HIGHLIGHT[i % HIGHLIGHT.length];
        return (
          <g key={c.id}>
            <path
              d={c.d}
              fill={fill}
              stroke="#fff"
              strokeWidth={isSel ? 2.4 : 1.2}
              className={disabled ? "" : "cursor-pointer transition hover:brightness-110"}
              onClick={() => !disabled && onPick(i)}
            />
            {Number.isFinite(c.c[0]) && (
              <g className={disabled ? "" : "cursor-pointer"} onClick={() => !disabled && onPick(i)}>
                {c.small && (
                  <>
                    {/* small countries: an easy-to-hit target, and the letter sits to the side with a line pointing in */}
                    <circle cx={c.c[0]} cy={c.c[1]} r={10} fill="transparent" />
                    <line x1={c.c[0]} y1={c.c[1]} x2={c.badge[0]} y2={c.badge[1]} stroke="#0d1a2e" strokeWidth={1.6} opacity={0.85} />
                    <circle cx={c.c[0]} cy={c.c[1]} r={2.2} fill="#0d1a2e" stroke="#fff" strokeWidth={1} />
                  </>
                )}
                <circle cx={c.badge[0]} cy={c.badge[1]} r={11} fill={c.small ? fill : "#0d1a2e"} stroke={c.small ? "#0d1a2e" : "none"} strokeWidth={2} opacity={c.small ? 1 : 0.85} />
                <text x={c.badge[0]} y={c.badge[1] + 4.5} textAnchor="middle" fontSize={13} fontWeight={700} fill={c.small ? "#0d1a2e" : "#fff"} fontFamily="'Fredoka Variable', system-ui" pointerEvents="none">
                  {LETTERS[i]}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Silhouette of a single country for "identify this country" questions. */
export function CountrySilhouette({ id }: { id: string }) {
  const { world } = useWorld();
  const d = useMemo(() => {
    const f = world?.byId.get(id);
    if (!f) return null;
    const proj = geoMercator().fitExtent(
      [
        [16, 16],
        [244, 164],
      ],
      f,
    );
    return geoPath(proj)(f);
  }, [world, id]);
  return (
    <div className="mx-auto grid h-[180px] w-[260px] place-items-center rounded-2xl bg-gradient-to-b from-ocean-500 to-ocean-700 shadow-inner">
      {d ? (
        <svg viewBox="0 0 260 180" className="h-full w-full" aria-label="Silhouette of the country to identify">
          <path d={d} fill="#8cc574" stroke="#fff" strokeWidth={2} />
        </svg>
      ) : (
        <span className="text-white/70">Loading…</span>
      )}
    </div>
  );
}

export { LETTERS };
