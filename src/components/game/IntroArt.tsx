"use client";
// Illustrations for the welcome walkthrough. Drawn as SVG so they stay crisp at any size.
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { useMemo } from "react";
import { useWorld } from "@/lib/client/world";
import { CATEGORIES } from "@/lib/types";
import { CATEGORY_META, CategoryIcon } from "../ui/icons";

const W = 360;
const H = 170;

function Frame({ children, id }: { children: React.ReactNode; id: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#132440" />
          <stop offset="1" stopColor="#08111f" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${id}-sky)`} />
      {children}
    </svg>
  );
}

const STARS = [
  [24, 20, 1.2], [70, 46, 0.8], [120, 18, 1], [300, 26, 1.3], [334, 64, 0.9], [262, 140, 1], [40, 130, 0.9], [96, 150, 1.1], [210, 14, 0.8], [180, 156, 0.9],
];

/** Step 1: the agency. A glowing globe with a heartbeat line and the recruit's ID card. */
export function WelcomeArt() {
  return (
    <Frame id="wa">
      <defs>
        <radialGradient id="wa-ocean" cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#4da3e0" />
          <stop offset="0.7" stopColor="#2170b3" />
          <stop offset="1" stopColor="#123d66" />
        </radialGradient>
        <radialGradient id="wa-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0.6" stopColor="#4da3e0" stopOpacity="0.35" />
          <stop offset="1" stopColor="#4da3e0" stopOpacity="0" />
        </radialGradient>
        <clipPath id="wa-globe">
          <circle cx="150" cy="86" r="58" />
        </clipPath>
        <linearGradient id="wa-card" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fdfcf8" />
          <stop offset="1" stopColor="#efe9d8" />
        </linearGradient>
      </defs>
      {STARS.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity={0.7} />
      ))}
      <circle cx="150" cy="86" r="82" fill="url(#wa-glow)" />
      <ellipse cx="150" cy="86" rx="92" ry="22" fill="none" stroke="#fbd97e" strokeOpacity=".35" strokeWidth="1.2" transform="rotate(-14 150 86)" />
      <circle cx="150" cy="86" r="58" fill="url(#wa-ocean)" />
      <g clipPath="url(#wa-globe)">
        <g fill="#73b25f">
          <path d="M104 52c10-8 26-10 34-4 6 5 2 12-6 14-6 2-6 8-2 12 5 6-2 12-10 10-9-3-11-12-18-14-7-2-6-12 2-18z" />
          <path d="M146 40c12-4 30 0 38 8 6 6-2 10-10 9-6 0-9 5-6 10 3 6-4 9-10 6-6-4-8-10-14-12-8-4-6-18 2-21z" />
          <path d="M150 92c8-2 18 2 20 10 2 9-4 20-12 26-6 4-12 0-12-8 0-6-6-10-4-18 1-5 4-9 8-10z" />
          <path d="M184 80c8 0 16 6 16 14s-8 12-14 8c-5-3-10-8-8-14 1-5 3-8 6-8z" />
        </g>
        <g fill="none" stroke="#fff" strokeOpacity=".16" strokeWidth="1">
          <ellipse cx="150" cy="86" rx="58" ry="20" />
          <ellipse cx="150" cy="86" rx="58" ry="42" />
          <ellipse cx="150" cy="86" rx="22" ry="58" />
          <ellipse cx="150" cy="86" rx="44" ry="58" />
        </g>
        <ellipse cx="128" cy="58" rx="26" ry="14" fill="#fff" opacity=".12" />
      </g>
      <circle cx="150" cy="86" r="58" fill="none" stroke="#fbd97e" strokeWidth="2" />
      {/* pulse line */}
      <path d="M18 104h70l10-20 14 40 12-30 8 10h170" fill="none" stroke="#f7c552" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="124" cy="94" r="4" fill="#fbd97e" />
      {/* satellite */}
      <g transform="translate(232 52) rotate(-14)">
        <rect x="-5" y="-4" width="10" height="8" rx="1.5" fill="#efe9d8" />
        <rect x="-19" y="-3" width="12" height="6" fill="#4da3e0" stroke="#efe9d8" strokeWidth="1" />
        <rect x="7" y="-3" width="12" height="6" fill="#4da3e0" stroke="#efe9d8" strokeWidth="1" />
      </g>
      {/* ID card */}
      <g transform="translate(246 82) rotate(6)">
        <rect x="0" y="0" width="92" height="62" rx="8" fill="#08111f" opacity=".35" transform="translate(3 4)" />
        <rect x="0" y="0" width="92" height="62" rx="8" fill="url(#wa-card)" />
        <rect x="0" y="0" width="92" height="16" rx="8" fill="#1a5c96" />
        <rect x="0" y="8" width="92" height="8" fill="#1a5c96" />
        <text x="46" y="11.5" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#fbd97e" fontFamily="Fredoka, system-ui, sans-serif" letterSpacing="1">WORLDPULSE</text>
        <rect x="8" y="22" width="26" height="32" rx="4" fill="#24406f" />
        <circle cx="21" cy="34" r="7" fill="#d79d72" />
        <path d="M14 32c0-5 3-8 7-8s7 3 7 8c-2-3-4-4-7-4s-5 1-7 4z" fill="#1d1714" />
        <path d="M10 54c1-7 5-10 11-10s10 3 11 10z" fill="#2d86cc" />
        <text x="40" y="30" fontSize="6.5" fontWeight="700" fill="#132440" fontFamily="Fredoka, system-ui, sans-serif">RANK</text>
        <text x="40" y="40" fontSize="9" fontWeight="700" fill="#1a5c96" fontFamily="Fredoka, system-ui, sans-serif">Recruit</text>
        <rect x="40" y="45" width="42" height="3" rx="1.5" fill="#24406f" opacity=".2" />
        <rect x="40" y="45" width="12" height="3" rx="1.5" fill="#f2b134" />
      </g>
    </Frame>
  );
}

/** Step 2: markers on a map. The five sizes, from minor to global. */
export function MarkersArt({ tiers }: { tiers: { label: string; size: number }[] }) {
  const { world } = useWorld();
  // Europe, the Middle East and North Africa, where most of the demo stories sit.
  const map = useMemo(() => {
    if (!world) return null;
    const proj = geoNaturalEarth1().center([22, 40]).scale(330).translate([W / 2, H / 2]);
    const path = geoPath(proj);
    const lines: [number, number][][] = [];
    for (let lon = -40; lon <= 80; lon += 15) lines.push(Array.from({ length: 13 }, (_, i) => [lon, -10 + i * 7] as [number, number]));
    for (let lat = 0; lat <= 75; lat += 15) lines.push(Array.from({ length: 25 }, (_, i) => [-40 + i * 5, lat] as [number, number]));
    return { land: path(world.land) ?? "", borders: path(world.borders) ?? "", graticule: path({ type: "MultiLineString", coordinates: lines }) ?? "" };
  }, [world]);
  return (
    <div className="relative h-full w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <rect width={W} height={H} fill="#2d86cc" />
        {map && (
          <>
            <path d={map.land} fill="#8cc574" />
            <path d={map.borders} fill="none" stroke="#5d9c4e" strokeWidth="0.8" />
            <path d={map.graticule} fill="none" stroke="#fff" strokeOpacity=".12" />
          </>
        )}
      </svg>
      <div className="relative flex h-full items-end justify-center gap-3 pb-5">
        {tiers.map((t, i) => (
          <div key={t.label} className="flex flex-col items-center gap-1">
            <span className="relative grid place-items-center rounded-xl text-white shadow-game ring-2 ring-white" style={{ width: t.size, height: t.size, background: CATEGORY_META[CATEGORIES[i]].color }}>
              {i === tiers.length - 1 && <span className="absolute inset-0 animate-pulseRing rounded-xl ring-4 ring-white/70" />}
              <CategoryIcon category={CATEGORIES[i]} size={t.size * 0.55} />
            </span>
            <span className="rounded-full bg-navy-900/75 px-1.5 text-[10px] font-semibold text-white">{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Step 3: a briefing file with a quiz card, a coin and an XP badge. */
export function BriefingArt() {
  return (
    <Frame id="ba">
      <defs>
        <linearGradient id="ba-folder" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7c552" />
          <stop offset="1" stopColor="#d99a22" />
        </linearGradient>
      </defs>
      {STARS.slice(0, 6).map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity={0.5} />
      ))}
      {/* folder */}
      <g transform="translate(46 26)">
        <path d="M0 14a6 6 0 016-6h44l8 8h96a6 6 0 016 6v104a6 6 0 01-6 6H6a6 6 0 01-6-6z" fill="#08111f" opacity=".35" transform="translate(4 5)" />
        <path d="M0 14a6 6 0 016-6h44l8 8h96a6 6 0 016 6v104a6 6 0 01-6 6H6a6 6 0 01-6-6z" fill="url(#ba-folder)" />
        {/* paper */}
        <rect x="12" y="2" width="132" height="122" rx="4" fill="#fdfcf8" transform="rotate(-3 78 63)" />
        <g transform="rotate(-3 78 63)">
          <rect x="22" y="14" width="40" height="8" rx="4" fill="#e5484d" />
          <text x="42" y="20.2" textAnchor="middle" fontSize="6" fontWeight="700" fill="#fff" fontFamily="Fredoka, system-ui, sans-serif">BRIEFING</text>
          <rect x="22" y="30" width="96" height="7" rx="3" fill="#132440" />
          <rect x="22" y="41" width="70" height="7" rx="3" fill="#132440" />
          <rect x="22" y="56" width="52" height="40" rx="4" fill="#2d86cc" />
          <path d="M26 72c8-6 16-6 20-2s10 4 14-2 10-4 12 0v24H26z" fill="#8cc574" />
          <circle cx="54" cy="74" r="3.5" fill="#e5484d" stroke="#fff" strokeWidth="1.5" />
          {[58, 66, 74, 82, 90].map((y) => (
            <rect key={y} x="80" y={y} width={y === 90 ? 24 : 38} height="3.5" rx="1.75" fill="#24406f" opacity=".25" />
          ))}
          <rect x="22" y="104" width="44" height="9" rx="4.5" fill="#12a594" opacity=".18" />
          <text x="44" y="110.5" textAnchor="middle" fontSize="5.5" fontWeight="600" fill="#0a6e62" fontFamily="Inter, system-ui, sans-serif">3 sources</text>
        </g>
      </g>
      {/* quiz card */}
      <g transform="translate(206 36) rotate(4)">
        <rect width="118" height="104" rx="10" fill="#08111f" opacity=".35" transform="translate(4 5)" />
        <rect width="118" height="104" rx="10" fill="#fdfcf8" />
        <text x="12" y="20" fontSize="8" fontWeight="700" fill="#1a5c96" fontFamily="Fredoka, system-ui, sans-serif">QUESTION 2 OF 5</text>
        <rect x="12" y="27" width="94" height="5" rx="2.5" fill="#132440" />
        <rect x="12" y="36" width="64" height="5" rx="2.5" fill="#132440" />
        {[0, 1, 2].map((i) => {
          const ok = i === 1;
          return (
            <g key={i} transform={`translate(12 ${50 + i * 17})`}>
              <rect width="94" height="13" rx="6.5" fill={ok ? "#73b25f" : "#efe9d8"} />
              <circle cx="7" cy="6.5" r="4.5" fill={ok ? "#fff" : "#fdfcf8"} />
              <text x="7" y="9" textAnchor="middle" fontSize="6.5" fontWeight="700" fill={ok ? "#5d9c4e" : "#24406f"} fontFamily="Fredoka, system-ui, sans-serif">
                {"ABC"[i]}
              </text>
              <rect x="16" y="5" width={ok ? 50 : 40 + i * 8} height="3" rx="1.5" fill={ok ? "#fff" : "#24406f"} opacity={ok ? 1 : 0.3} />
              {ok && <path d="M80 6.5l3 3 5-6" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
            </g>
          );
        })}
      </g>
      {/* coin */}
      <g transform="translate(190 120)">
        <circle cx="16" cy="18" r="15" fill="#b9801a" />
        <circle cx="16" cy="16" r="15" fill="#f7c552" />
        <circle cx="16" cy="16" r="11" fill="none" stroke="#d99a22" strokeWidth="2" />
        <path d="M11.5 16.5l3.4 3.4 6.4-7.4" fill="none" stroke="#b9801a" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* xp star */}
      <g transform="translate(316 112) scale(1.2)">
        <path d="M16 3.2l3.6 5.2 6.1 1.2-1.5 6.1 2.6 5.7-5.9 2-2.9 5.6L16 26.4 13 29l-2.9-5.6-5.9-2 2.6-5.7-1.5-6.1 6.1-1.2z" fill="#4da3e0" stroke="#f7c552" strokeWidth="1.6" strokeLinejoin="round" />
        <text x="16" y="20.2" textAnchor="middle" fontFamily="Fredoka, system-ui, sans-serif" fontWeight="700" fontSize="9.5" fill="#fff">XP</text>
      </g>
    </Frame>
  );
}

/** Step 4: a corner of the headquarters, drawn in isometric view. */
export function HQArt() {
  // isometric helpers: x to the right-down, y to the left-down
  return (
    <Frame id="ha">
      <defs>
        <linearGradient id="ha-wallL" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#24406f" />
          <stop offset="1" stopColor="#2a4a7f" />
        </linearGradient>
        <linearGradient id="ha-wallR" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1b3157" />
          <stop offset="1" stopColor="#152a4b" />
        </linearGradient>
      </defs>
      <g transform="translate(180 30)">
        {/* floor */}
        <path d="M0 40 L110 95 L0 150 L-110 95 Z" fill="#7c5a3a" />
        <path d="M0 40 L110 95 L0 150 L-110 95 Z" fill="none" stroke="#5c4128" strokeWidth="1" />
        {[1, 2, 3, 4].map((i) => (
          <path key={i} d={`M${-110 + i * 22} ${95 - i * 11} L${i * 22} ${150 - i * 11}`} stroke="#6a4c31" strokeWidth="1" />
        ))}
        {/* rug */}
        <path d="M0 78 L56 106 L0 134 L-56 106 Z" fill="#e5484d" opacity=".85" />
        <path d="M0 86 L40 106 L0 126 L-40 106 Z" fill="none" stroke="#fbd97e" strokeWidth="1.5" />
        {/* walls */}
        <path d="M-110 95 L-110 5 L0 -50 L0 40 Z" fill="url(#ha-wallL)" />
        <path d="M0 40 L0 -50 L110 5 L110 95 Z" fill="url(#ha-wallR)" />
        {/* window on left wall */}
        <path d="M-86 50 L-86 6 L-40 -17 L-40 27 Z" fill="#4da3e0" />
        <path d="M-86 50 L-86 6 L-40 -17 L-40 27 Z" fill="none" stroke="#fdfcf8" strokeWidth="2.5" />
        <path d="M-63 38 L-63 -5" stroke="#fdfcf8" strokeWidth="2" />
        <circle cx="-54" cy="2" r="5" fill="#fbd97e" />
        {/* world map screen on right wall */}
        <path d="M22 12 L22 -22 L86 10 L86 44 Z" fill="#08111f" />
        <path d="M26 12 L26 -16 L82 12 L82 40 Z" fill="#2170b3" />
        <path d="M32 6 l10 2 4 8 -8 0z M52 10 l14 6 2 10 -10 -4z M70 26 l6 2 0 6 -6 -2z" fill="#8cc574" />
        <circle cx="58" cy="17" r="2" fill="#e5484d" />
        {/* bookshelf on right wall */}
        <path d="M70 70 L70 30 L98 44 L98 84 Z" fill="#5c4128" />
        {[0, 1, 2].map((r) => (
          <g key={r}>
            {[0, 1, 2, 3, 4].map((b) => (
              <path key={b} d={`M${73 + b * 5} ${42 + r * 13 + b * 2.5} l0 -9 l4 2 l0 9 z`} fill={["#e5484d", "#f2b134", "#12a594", "#8e4ec6", "#2d86cc"][(b + r) % 5]} />
            ))}
          </g>
        ))}
        {/* desk */}
        <path d="M-40 92 L10 117 L40 102 L-10 77 Z" fill="#a8774b" />
        <path d="M-40 92 L-40 100 L10 125 L10 117 Z" fill="#7c5a3a" />
        <path d="M10 117 L10 125 L40 110 L40 102 Z" fill="#5c4128" />
        {/* monitor */}
        <path d="M-12 86 L-12 64 L14 77 L14 99 Z" fill="#08111f" />
        <path d="M-10 85 L-10 67 L12 78 L12 96 Z" fill="#4da3e0" />
        <path d="M-6 80 l6 2 2 5 -6 -2z" fill="#8cc574" />
        {/* globe */}
        <circle cx="-26" cy="80" r="7" fill="#2d86cc" stroke="#fbd97e" strokeWidth="1.5" />
        <path d="M-30 78 q4 -3 7 0 q-2 3 -6 2z" fill="#8cc574" />
        {/* plant */}
        <path d="M-82 118 L-74 122 L-66 118 L-68 132 L-80 132 Z" fill="#e8a31c" />
        <path d="M-74 118 C-90 100 -84 92 -76 104 C-80 90 -70 86 -72 104 C-64 92 -56 98 -70 116" fill="#5d9c4e" />
        {/* chair */}
        <path d="M18 128 L30 122 L30 108 L18 114 Z" fill="#e5484d" />
        <path d="M6 122 L18 128 L30 122 L18 116 Z" fill="#c8423a" />
      </g>
    </Frame>
  );
}
