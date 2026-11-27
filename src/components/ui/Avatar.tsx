"use client";
// Player avatars, drawn in the "clean illustration" style zaid picked (flat colours, soft shading).
// Everything is drawn on a 200×200 canvas. Option lists are append-only: saved avatars store indexes.
import { useId } from "react";
import { CATALOG_BY_ID } from "@/lib/game/catalog";
import { AVATAR_LIMITS } from "@/lib/game/avatarOptions";
import type { AvatarConfig, PlayerState } from "@/lib/types";

export const SKIN = ["#f6d7c3", "#eec1a0", "#d9a07a", "#b9794f", "#8d5a3b", "#5e3b28", "#fde6d6", "#3f2719"];
export const HAIR_COLORS = ["#1f1a17", "#4a2f1d", "#8a5a2b", "#c99a54", "#9aa0a6", "#b5462f", "#eadbb0", "#f4f4f2", "#2b4b8c", "#c25b8e", "#2a9d8f", "#6d3fb2"];
export const HAIR_STYLES = ["Short", "Side part", "Long", "Bun", "Curly", "Buzz", "Wavy bob", "Ponytail", "Braids", "Spiky", "Bald", "Headscarf", "Locs", "Pixie"];
export const BACKDROPS = ["#2d86cc", "#12a594", "#8e4ec6", "#e8a31c", "#e5484d", "#24406f", "#2f9e6e", "#d6409f", "#ff7a1a", "#5b6b7d"];
export const FACE_SHAPES = ["Oval", "Round", "Square", "Heart"];
export const EYES = ["Round", "Smiling", "Almond", "Wide", "Calm"];
export const BROWS = ["Soft", "Straight", "Bold", "Raised", "Thin"];
export const MOUTHS = ["Smile", "Grin", "Neutral", "Smirk", "Full lips"];
export const FACIAL_HAIR = ["None", "Stubble", "Moustache", "Full beard", "Goatee"];
export const GLASSES = ["None", "Rectangle", "Round", "Bold"];
export const DETAILS = ["None", "Freckles", "Beauty mark", "Rosy cheeks"];
export const EYE_COLORS = ["#3b2a20", "#6b4423", "#3f7a4d", "#3d6fa8", "#7a8a96"];

/** The full avatar with every optional part filled in, so old saved avatars keep working. */
export function fullAvatar(a: AvatarConfig): Required<AvatarConfig> {
  const n = (v: number | undefined, max: number) => (Number.isInteger(v) && v! >= 0 && v! < max ? v! : 0);
  return {
    skin: n(a.skin, AVATAR_LIMITS.skin),
    hair: n(a.hair, AVATAR_LIMITS.hair),
    hairColor: n(a.hairColor, AVATAR_LIMITS.hairColor),
    backdrop: n(a.backdrop, AVATAR_LIMITS.backdrop),
    face: n(a.face, AVATAR_LIMITS.face),
    eyes: n(a.eyes, AVATAR_LIMITS.eyes),
    eyeColor: n(a.eyeColor, AVATAR_LIMITS.eyeColor),
    brows: n(a.brows, AVATAR_LIMITS.brows),
    mouth: n(a.mouth, AVATAR_LIMITS.mouth),
    facialHair: n(a.facialHair, AVATAR_LIMITS.facialHair),
    glasses: n(a.glasses, AVATAR_LIMITS.glasses),
    details: n(a.details, AVATAR_LIMITS.details),
  };
}

// ---------- colour helpers ----------
const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
/** amt from -1 (black) to 1 (white) */
export function shade(h: string, amt: number) {
  return (
    "#" +
    rgb(h)
      .map((v) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt))))
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

// ---------- shared geometry ----------
const HEADS = [
  "M100 44 C125 44 140 60 140 85 C140 106 133 119 121 127 C114 132 107 134 100 134 C93 134 86 132 79 127 C67 119 60 106 60 85 C60 60 75 44 100 44 Z",
  "M100 46 C126 46 141 62 141 88 C141 113 124 133 100 133 C76 133 59 113 59 88 C59 62 74 46 100 46 Z",
  "M100 44 C125 44 140 58 140 82 C140 104 137 118 127 126 C119 132 110 134 100 134 C90 134 81 132 73 126 C63 118 60 104 60 82 C60 58 75 44 100 44 Z",
  "M100 44 C126 44 141 60 140 84 C139 104 130 120 116 129 C110 133 105 136 100 136 C95 136 90 133 84 129 C70 120 61 104 60 84 C59 60 74 44 100 44 Z",
];
const NECK = "M86 116 L86 150 Q100 158 114 150 L114 116 Z";
const BODY = "M24 204 C26 170 52 152 100 152 C148 152 174 170 176 204 Z";

// ---------- hair ----------
function curls() {
  const out: [number, number, number][] = [];
  for (let i = 0; i < 15; i++) {
    const a = Math.PI * (0.92 + i * (1.16 / 14));
    out.push([100 + Math.cos(a) * 46, 76 + Math.sin(a) * 40, 15 + (i % 3) * 2]);
  }
  out.push([100, 40, 22], [80, 44, 19], [120, 44, 19], [64, 62, 16], [136, 62, 16], [58, 84, 14], [142, 84, 14]);
  return out;
}
const CURLS = curls();
const CURL_FRONT = Array.from({ length: 9 }, (_, i) => [66 + i * 8.5, 60 - Math.sin((i / 8) * Math.PI) * 10, 8.5] as const);

function HairBack({ style, c, lo, hat }: { style: number; c: string; lo: string; hat: boolean }) {
  switch (style) {
    case 2: // long
      return <path d="M55 92 C50 54 72 32 100 32 C128 32 150 54 145 92 L150 168 C137 176 124 172 119 164 L119 118 L81 118 L81 164 C76 172 63 176 50 168 Z" fill={c} />;
    case 3: // bun
      return hat ? null : (
        <>
          <circle cx="100" cy="30" r="17" fill={c} />
          <path d="M88 26 Q100 18 112 26" stroke={lo} strokeWidth="2" fill="none" opacity=".5" />
        </>
      );
    case 4: // curly
      return (
        <g fill={c}>
          {CURLS.map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} />
          ))}
        </g>
      );
    case 6: // wavy bob
      return <path d="M56 90 C52 56 74 34 100 34 C126 34 148 56 144 90 C148 108 146 122 138 130 C132 126 128 120 128 112 L72 112 C72 120 68 126 62 130 C54 122 52 108 56 90 Z" fill={c} />;
    case 7: // ponytail
      return <path d="M126 58 C152 62 160 96 150 132 C146 144 134 144 134 132 C140 106 138 86 122 72 Z" fill={c} />;
    case 8: // braids
      return (
        <g fill={c}>
          {[0, 1].map((side) =>
            Array.from({ length: 6 }, (_, i) => <ellipse key={`${side}-${i}`} cx={side ? 138 - i * 0.6 : 62 + i * 0.6} cy={104 + i * 12} rx={8 - i * 0.4} ry={7.5} stroke={lo} strokeWidth="1.2" />),
          )}
        </g>
      );
    case 11: // headscarf
      return <path d="M52 92 C48 54 72 30 100 30 C128 30 152 54 148 92 C150 122 146 144 134 158 L66 158 C54 144 50 122 52 92 Z" fill={c} />;
    case 12: // locs
      return (
        <g fill={c}>
          <path d="M56 92 C52 56 74 34 100 34 C126 34 148 56 144 92 L144 100 L56 100 Z" />
          {[58, 66, 74, 126, 134, 142].map((x, i) => (
            <rect key={x} x={x - 4.5} y={86} width="9" height={62 + (i % 3) * 8} rx="4.5" stroke={lo} strokeWidth="1" />
          ))}
        </g>
      );
  }
  return null;
}

function HairFront({ style, c, hi, lo }: { style: number; c: string; hi: string; lo: string }) {
  const strands = (ds: string[]) => ds.map((d) => <path key={d} d={d} stroke={hi} strokeWidth="2.2" fill="none" strokeLinecap="round" opacity=".7" />);
  switch (style) {
    case 0:
      return (
        <>
          <path d="M61 88 C56 58 74 38 101 37 C128 37 145 56 139 88 C137 78 133 70 127 64 C113 70 90 70 74 63 C68 69 63 78 61 88 Z" fill={c} />
          {strands(["M80 50 Q96 44 114 47", "M74 58 Q92 54 110 56"])}
        </>
      );
    case 1:
      return (
        <>
          <path d="M60 90 C56 56 76 36 104 37 C130 38 146 58 140 88 C136 72 128 62 118 58 C104 63 84 63 70 70 C65 76 62 82 60 90 Z" fill={c} />
          <path d="M84 40 Q80 50 82 62" stroke={lo} strokeWidth="2" fill="none" opacity=".6" />
          {strands(["M90 46 Q110 44 126 54", "M88 56 Q106 54 120 60"])}
        </>
      );
    case 2:
      return (
        <>
          <path d="M60 92 C57 58 77 38 102 38 C127 38 143 58 140 92 C136 74 124 62 108 59 C98 74 80 84 60 92 Z" fill={c} />
          {strands(["M108 59 Q126 66 136 84", "M100 44 Q86 60 70 76"])}
        </>
      );
    case 3:
    case 7:
      return (
        <>
          <path d="M61 86 C59 58 78 41 100 41 C122 41 141 58 139 86 C133 66 119 57 100 57 C81 57 67 66 61 86 Z" fill={c} />
          {strands(["M76 56 Q100 46 124 56", "M70 66 Q100 52 130 66"])}
        </>
      );
    case 4:
      return (
        <>
          <g fill={c}>
            {CURL_FRONT.map(([x, y, r], i) => (
              <circle key={i} cx={x} cy={y} r={r} />
            ))}
          </g>
          {CURL_FRONT.map(([x, y], i) => (
            <path key={`h${i}`} d={`M${x - 4} ${y - 1} q4 -5 8 0`} stroke={hi} strokeWidth="1.6" fill="none" opacity=".7" strokeLinecap="round" />
          ))}
        </>
      );
    case 5:
      return <path d="M62 82 C60 58 76 42 100 42 C124 42 140 58 138 82 C134 66 120 57 100 57 C80 57 66 66 62 82 Z" fill={c} opacity=".88" />;
    case 6:
      return (
        <>
          <path d="M60 90 C58 58 78 38 101 38 C126 38 142 58 140 90 C132 70 116 60 98 62 C86 72 74 80 60 90 Z" fill={c} />
          {strands(["M98 62 Q118 64 132 80", "M92 46 Q78 58 68 74"])}
        </>
      );
    case 8:
      return (
        <>
          <path d="M60 92 C57 58 77 38 100 38 C123 38 143 58 140 92 C136 70 120 58 100 56 C80 58 64 70 60 92 Z" fill={c} />
          <path d="M100 39 V56" stroke={lo} strokeWidth="2.2" />
          {strands(["M80 48 Q70 60 66 76", "M120 48 Q130 60 134 76"])}
        </>
      );
    case 9:
      return (
        <>
          <path d="M62 84 C60 62 66 50 74 46 L70 32 L84 41 L86 26 L98 39 L106 24 L113 39 L126 30 L125 46 C134 52 140 64 138 84 C132 68 118 60 100 60 C82 60 68 68 62 84 Z" fill={c} />
          {strands(["M86 44 L92 54", "M108 42 L104 54"])}
        </>
      );
    case 10:
      return <path d="M80 54 Q92 48 104 50" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" opacity=".25" />;
    case 11:
      return (
        <>
          <path fillRule="evenodd" d="M55 90 C53 54 74 34 100 34 C126 34 147 54 145 90 C145 120 132 142 100 148 C68 142 55 120 55 90 Z M100 52 C121 52 133 66 133 86 C133 110 120 128 100 130 C80 128 67 110 67 86 C67 66 79 52 100 52 Z" fill={c} />
          <path d="M68 70 Q100 46 132 70" stroke={hi} strokeWidth="2" fill="none" opacity=".45" />
        </>
      );
    case 12: {
      const locs = ["M78 46 C70 54 64 66 62 84", "M90 42 C82 52 76 62 73 72", "M100 41 C99 50 97 56 95 63", "M110 42 C118 52 124 62 127 72", "M122 46 C130 54 136 66 138 84"];
      return (
        <>
          <path d="M61 86 C59 58 78 40 100 40 C122 40 141 58 139 86 C133 68 118 58 100 58 C82 58 67 68 61 86 Z" fill={c} />
          {locs.map((d) => (
            <g key={d}>
              <path d={d} stroke={c} strokeWidth="10" strokeLinecap="round" fill="none" />
              <path d={d} stroke={lo} strokeWidth="1.4" strokeLinecap="round" strokeDasharray="2.5 4" fill="none" opacity=".8" />
            </g>
          ))}
        </>
      );
    }
    case 13:
      return (
        <>
          <path d="M60 88 C56 60 74 40 100 40 C126 40 144 58 140 86 C138 76 134 70 128 66 C120 73 104 75 92 70 C84 75 72 75 64 72 C62 78 61 82 60 88 Z" fill={c} />
          {strands(["M92 50 Q110 52 126 64", "M76 56 Q88 58 96 66"])}
        </>
      );
  }
  return null;
}

// ---------- face ----------
function Eyes({ kind, iris, skinLo }: { kind: number; iris: string; skinLo: string }) {
  const both = (f: (cx: number) => React.ReactNode) => (
    <>
      {f(85)}
      {f(115)}
    </>
  );
  switch (kind) {
    case 1:
      return both((x) => <path key={x} d={`M${x - 6} 94 Q${x} 87 ${x + 6} 94`} stroke="#1f2430" strokeWidth="3.4" strokeLinecap="round" fill="none" />);
    case 2:
      return both((x) => (
        <g key={x}>
          <path d={`M${x - 7} 92 Q${x} 85 ${x + 7} 92 Q${x} 97 ${x - 7} 92 Z`} fill="#fff" />
          <circle cx={x} cy={91.5} r="3.6" fill={iris} />
          <circle cx={x} cy={91.5} r="1.8" fill="#1f2430" />
          <circle cx={x + 1.3} cy={90.2} r="1" fill="#fff" />
          <path d={`M${x - 7.5} 91.5 Q${x} 84 ${x + 7.5} 91.5`} stroke="#1f2430" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d={`M${x + 6.5} 90 l3 -2.4`} stroke="#1f2430" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      ));
    case 3:
      return both((x) => (
        <g key={x}>
          <ellipse cx={x} cy={92} rx="6.4" ry="6.6" fill="#fff" />
          <circle cx={x} cy={92.6} r="4.2" fill={iris} />
          <circle cx={x} cy={92.6} r="2.1" fill="#1f2430" />
          <circle cx={x + 1.6} cy={90.8} r="1.3" fill="#fff" />
        </g>
      ));
    case 4:
      return both((x) => (
        <g key={x}>
          <ellipse cx={x} cy={93} rx="4.4" ry="4.4" fill="#1f2430" />
          <path d={`M${x - 6} 92 Q${x} 87 ${x + 6} 92 L${x + 6} 86 L${x - 6} 86 Z`} fill={skinLo} />
          <path d={`M${x - 6} 92 Q${x} 89 ${x + 6} 92`} stroke="#1f2430" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      ));
  }
  return both((x) => (
    <g key={x}>
      <ellipse cx={x} cy={92} rx="4.2" ry="5.2" fill="#1f2430" />
      <circle cx={x + 1.6} cy={90.2} r="1.5" fill="#fff" />
    </g>
  ));
}

function Brows({ kind, c }: { kind: number; c: string }) {
  const p = (d: string, w = 3.6) => <path key={d} d={d} stroke={c} strokeWidth={w} strokeLinecap="round" fill="none" />;
  switch (kind) {
    case 1:
      return <>{[p("M76 79 L94 78"), p("M106 78 L124 79")]}</>;
    case 2:
      return <>{[p("M75 80 Q85 73 95 78", 5.6), p("M105 78 Q115 73 125 80", 5.6)]}</>;
    case 3:
      return <>{[p("M76 76 Q85 68 94 73"), p("M106 78 Q115 74 124 79")]}</>;
    case 4:
      return <>{[p("M77 78 Q85 74 93 77", 2.2), p("M107 77 Q115 74 123 78", 2.2)]}</>;
  }
  return <>{[p("M76 79 Q85 73 94 78"), p("M106 78 Q115 73 124 79")]}</>;
}

function Mouth({ kind }: { kind: number }) {
  const lip = "#7a3b32";
  switch (kind) {
    case 1:
      return (
        <>
          <path d="M87 115 Q100 130 113 115 Z" fill={lip} />
          <path d="M89 116 Q100 119 111 116 L110 118.5 Q100 121.5 90 118.5 Z" fill="#fff" />
        </>
      );
    case 2:
      return <path d="M91 118 Q100 120 109 118" stroke={lip} strokeWidth="3" strokeLinecap="round" fill="none" />;
    case 3:
      return <path d="M89 119 Q101 122 111 113" stroke={lip} strokeWidth="3" strokeLinecap="round" fill="none" />;
    case 4:
      return (
        <>
          <path d="M88 116 Q94 112 100 115 Q106 112 112 116 Q100 120 88 116 Z" fill="#b5524a" />
          <path d="M88 116 Q100 127 112 116 Q100 120 88 116 Z" fill="#c9675c" />
        </>
      );
  }
  return <path d="M89 117 Q100 125 111 117" stroke={lip} strokeWidth="3" strokeLinecap="round" fill="none" />;
}

function FacialHair({ kind, c }: { kind: number; c: string }) {
  const stache = <path d="M85 112 Q92 105 100 109 Q108 105 115 112 Q108 116 100 112.5 Q92 116 85 112 Z" fill={c} />;
  switch (kind) {
    case 1:
      return <path d="M64 100 C68 122 84 135 100 135 C116 135 132 122 136 100 C132 114 120 124 100 124 C80 124 68 114 64 100 Z M84 110 Q100 104 116 110 L116 114 Q100 110 84 114 Z" fill={c} opacity=".28" />;
    case 2:
      return stache;
    case 3:
      return (
        <>
          <path d="M61 92 C60 120 78 142 100 142 C122 142 140 120 139 92 C135 106 128 114 118 117 Q109 111 100 112 Q91 111 82 117 C72 114 65 106 61 92 Z" fill={c} />
          {stache}
        </>
      );
    case 4:
      return (
        <>
          <path d="M91 123 Q100 121 109 123 L107 135 Q100 140 93 135 Z" fill={c} />
          {stache}
        </>
      );
  }
  return null;
}

function Glasses({ kind, color = "#1b2433" }: { kind: number; color?: string }) {
  if (!kind) return null;
  const w = kind === 3 ? 4 : 2.6;
  return (
    <>
      <g fill="rgba(210,235,255,.18)" stroke={color} strokeWidth={w}>
        {kind === 2 ? (
          <>
            <circle cx="85" cy="92" r="11" />
            <circle cx="115" cy="92" r="11" />
          </>
        ) : (
          <>
            <rect x="72" y="83" width="26" height="18" rx={kind === 3 ? 3 : 5} />
            <rect x="102" y="83" width="26" height="18" rx={kind === 3 ? 3 : 5} />
          </>
        )}
        <path d="M96 91 Q100 88 104 91" fill="none" />
        <path d="M72 89 L61 87 M128 89 L139 87" fill="none" />
      </g>
      <path d="M76 87 l5 -2" stroke="#fff" strokeWidth="2" opacity=".5" strokeLinecap="round" />
    </>
  );
}

function Details({ kind }: { kind: number }) {
  if (kind === 1)
    return (
      <g fill="#a0603f" opacity=".55">
        {[
          [74, 104],
          [79, 107],
          [72, 109],
          [77, 111],
          [121, 107],
          [126, 104],
          [123, 111],
          [128, 109],
          [96, 101],
          [104, 101],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" />
        ))}
      </g>
    );
  if (kind === 2) return <circle cx="122" cy="112" r="1.7" fill="#3a2418" />;
  return null;
}

// ---------- outfits and items ----------
function Outfit({ id }: { id?: string }) {
  const item = id ? CATALOG_BY_ID.get(id) : undefined;
  const base = item?.color ?? "#5b7fa6";
  const accent = item?.accent ?? "#ffffff";
  const hi = shade(base, 0.18);
  const lo = shade(base, -0.28);
  const body = <path d={BODY} fill={base} />;
  const sideShade = <path d="M138 160 C160 168 174 182 176 204 L146 204 C150 186 146 172 138 160 Z" fill={lo} opacity=".35" />;
  switch (item?.art) {
    case "blazer":
    case "suit":
      return (
        <>
          {body}
          {sideShade}
          <path d="M84 152 L100 186 L116 152 Z" fill={item.art === "blazer" ? accent : "#f2f4f7"} />
          {item.art === "suit" && <path d="M96 158 h8 l-2 6 l4 26 l-6 8 l-6 -8 l4 -26 z" fill={accent} />}
          <path d="M80 152 L100 196 L74 178 L82 168 L74 160 Z" fill={lo} />
          <path d="M120 152 L100 196 L126 178 L118 168 L126 160 Z" fill={lo} />
          <rect x="128" y="180" width="18" height="3" rx="1.5" fill={hi} />
          {item.art === "suit" && <circle cx="100" cy="200" r="2.2" fill={lo} />}
        </>
      );
    case "field":
      return (
        <>
          {body}
          {sideShade}
          <path d="M82 152 L100 166 L118 152 L124 162 L100 176 L76 162 Z" fill={accent} />
          <path d="M100 176 V204" stroke={lo} strokeWidth="2.5" />
          <rect x="52" y="180" width="26" height="18" rx="3" fill={lo} opacity=".6" />
          <rect x="122" y="180" width="26" height="18" rx="3" fill={lo} opacity=".6" />
          <path d="M52 186 h26 M122 186 h26" stroke={hi} strokeWidth="1.5" opacity=".6" />
        </>
      );
    case "uniform":
      return (
        <>
          {body}
          {sideShade}
          <path d="M86 152 h28 l-14 18 z" fill="#f2f4f7" />
          <path d="M100 170 V204" stroke={accent} strokeWidth="2.5" />
          {[178, 188, 198].map((y) => (
            <circle key={y} cx="108" cy={y} r="2.6" fill={accent} />
          ))}
          <rect x="34" y="162" width="32" height="8" rx="4" fill={accent} transform="rotate(-16 50 166)" />
          <rect x="134" y="162" width="32" height="8" rx="4" fill={accent} transform="rotate(16 150 166)" />
          <path d="M86 152 L100 170 L114 152" stroke={accent} strokeWidth="2.5" fill="none" />
        </>
      );
  }
  return (
    <>
      {body}
      {sideShade}
      <path d="M82 152 Q100 168 118 152 L122 157 Q100 178 78 157 Z" fill={lo} />
      {Array.from({ length: 6 }, (_, i) => (
        <path key={i} d={`M${46 + i * 22} 196 v8`} stroke={lo} strokeWidth="2" opacity=".6" />
      ))}
    </>
  );
}

function Headwear({ id }: { id?: string }) {
  const item = id ? CATALOG_BY_ID.get(id) : undefined;
  if (!item) return null;
  const c = item.color;
  const lo = shade(c, -0.3);
  switch (item.art) {
    case "fedora":
      return (
        <>
          <ellipse cx="100" cy="54" rx="58" ry="11" fill={lo} />
          <path d="M66 54 C64 30 78 18 100 18 C122 18 136 30 134 54 Z" fill={c} />
          <path d="M92 20 Q100 30 108 20" stroke={lo} strokeWidth="3" fill="none" />
          <rect x="66" y="44" width="68" height="8" fill="#2a2018" />
        </>
      );
    case "beret":
      return (
        <>
          <path d="M56 64 C54 40 80 26 108 28 C136 30 150 46 146 60 C132 55 112 53 96 54 C80 55 66 59 56 64 Z" fill={c} />
          <path d="M60 60 C76 54 100 52 142 56" stroke={lo} strokeWidth="3" fill="none" opacity=".6" />
          <circle cx="108" cy="27" r="4" fill={lo} />
        </>
      );
    case "headset":
      return (
        <>
          <path d="M58 92 C58 50 78 34 100 34 C122 34 142 50 142 92" fill="none" stroke={c} strokeWidth="7" strokeLinecap="round" />
          <rect x="50" y="80" width="15" height="26" rx="6" fill={c} />
          <rect x="135" y="80" width="15" height="26" rx="6" fill={c} />
          <path d="M58 104 C60 120 72 126 86 124" fill="none" stroke={c} strokeWidth="4" strokeLinecap="round" />
          <circle cx="88" cy="124" r="5" fill={item.accent ?? "#57d38c"} />
        </>
      );
    case "cap":
      return (
        <>
          <path d="M60 60 C58 38 78 26 100 26 C122 26 142 38 140 60 Z" fill={c} />
          <rect x="62" y="52" width="76" height="10" fill={item.accent ?? "#e0b84a"} />
          <path d="M62 62 L138 62 L128 74 L72 74 Z" fill="#111827" />
          <circle cx="100" cy="40" r="6" fill={item.accent ?? "#e0b84a"} stroke="#fff" strokeWidth="1.5" />
        </>
      );
    case "laurel":
      return (
        <g fill={c} stroke={lo} strokeWidth="1">
          {Array.from({ length: 8 }, (_, i) => {
            const a = Math.PI * (1.05 + i * 0.055);
            const x = 100 + Math.cos(a) * 44;
            const y = 76 + Math.sin(a) * 40;
            const b = Math.PI * (1.95 - i * 0.055);
            const x2 = 100 + Math.cos(b) * 44;
            const y2 = 76 + Math.sin(b) * 40;
            return (
              <g key={i}>
                <ellipse cx={x} cy={y} rx="8" ry="4" transform={`rotate(${(a * 180) / Math.PI + 60} ${x} ${y})`} />
                <ellipse cx={x2} cy={y2} rx="8" ry="4" transform={`rotate(${(b * 180) / Math.PI - 60} ${x2} ${y2})`} />
              </g>
            );
          })}
        </g>
      );
  }
  return null;
}

function Accessory({ id }: { id?: string }) {
  const item = id ? CATALOG_BY_ID.get(id) : undefined;
  if (!item) return null;
  const c = item.color;
  switch (item.art) {
    case "glasses":
      return <Glasses kind={2} color={c} />;
    case "lanyard":
      return (
        <>
          <path d="M80 152 L100 184 L120 152" fill="none" stroke={c} strokeWidth="4" />
          <rect x="89" y="180" width="22" height="17" rx="3" fill="#fff" stroke="#8b95a1" />
          <rect x="93" y="185" width="14" height="3" rx="1.5" fill={c} />
        </>
      );
    case "tie":
      return <path d="M96 158 h8 l-2 6 l4 26 l-6 8 l-6 -8 l4 -26 z" fill={c} />;
    case "earpiece":
      return <path d="M140 94 c6 0 8 6 5 11 s-4 16 -1 28" fill="none" stroke={c} strokeWidth="2.6" strokeLinecap="round" />;
    case "pin":
      return <circle cx="68" cy="174" r="6" fill={c} stroke="#fff" strokeWidth="2" />;
    case "medal":
      return (
        <>
          <path d="M62 160 l6 14 l6 -14 z" fill={item.accent ?? "#3a6ea5"} />
          <circle cx="68" cy="180" r="8" fill={c} stroke={shade(c, -0.3)} strokeWidth="2" />
          <path d="M65 180 l2 2 l4 -4" stroke="#fff" strokeWidth="1.6" fill="none" />
        </>
      );
    case "sash":
      return <path d="M58 160 l14 -8 l78 52 h-26 z" fill={c} stroke={item.accent ?? "#ffd76a"} strokeWidth="2" />;
  }
  return null;
}

const HATS_THAT_HIDE_BUNS = new Set(["fedora", "beret", "cap"]);

const CROPS = { full: "0 0 200 200", head: "28 12 144 144", face: "56 60 88 88" } as const;

export function AvatarFigure({ avatar, equipped, size = 64, ring = true, className, crop = "full" }: { avatar: AvatarConfig; equipped: PlayerState["equipped"]; size?: number; ring?: boolean; className?: string; crop?: keyof typeof CROPS }) {
  const uid = useId().replace(/:/g, "");
  const a = fullAvatar(avatar);
  const skin = SKIN[a.skin];
  const skinLo = shade(skin, -0.16);
  const skinLo2 = shade(skin, -0.3);
  const hair = HAIR_COLORS[a.hairColor];
  const hairHi = shade(hair, 0.22);
  const hairLo = shade(hair, -0.25);
  const bg = BACKDROPS[a.backdrop];
  const head = HEADS[a.face];
  const hatArt = equipped.headwear ? CATALOG_BY_ID.get(equipped.headwear)?.art : undefined;
  const scarf = a.hair === 11;
  const bald = a.hair === 10 || a.hair === 5;
  // brows match the hair, but stay dark for grey, white and bright colours
  const browColor = a.hairColor >= 4 && a.hairColor !== 5 ? shade("#4a2f1d", -0.1) : hairLo;
  return (
    <svg width={size} height={size} viewBox={CROPS[crop]} className={className} aria-hidden>
      <defs>
        <clipPath id={`${uid}c`}>
          <circle cx="100" cy="100" r="96" />
        </clipPath>
        <clipPath id={`${uid}h`}>
          <path d={head} />
        </clipPath>
        <radialGradient id={`${uid}bg`} cx="35%" cy="25%" r="85%">
          <stop offset="0" stopColor={shade(bg, 0.25)} />
          <stop offset="1" stopColor={shade(bg, -0.2)} />
        </radialGradient>
      </defs>
      <g clipPath={`url(#${uid}c)`}>
        <circle cx="100" cy="100" r="96" fill={`url(#${uid}bg)`} />
        <circle cx="150" cy="44" r="40" fill="#fff" opacity=".07" />
        <HairBack style={a.hair} c={hair} lo={hairLo} hat={!!hatArt && HATS_THAT_HIDE_BUNS.has(hatArt)} />
        <path d={NECK} fill={skinLo} />
        <path d="M86 132 Q100 146 114 132 L114 140 Q100 152 86 140 Z" fill={skinLo2} opacity=".55" />
        <Outfit id={equipped.outfit} />
        {!scarf && (
          <>
            <ellipse cx="61" cy="92" rx="7" ry="11" fill={skinLo} />
            <ellipse cx="139" cy="92" rx="7" ry="11" fill={skinLo} />
          </>
        )}
        <path d={head} fill={skin} />
        <g clipPath={`url(#${uid}h)`}>
          <path d="M122 40 C150 70 146 120 104 140 L150 150 L150 40 Z" fill={skinLo} opacity=".6" />
        </g>
        {a.details === 3 ? (
          <>
            <ellipse cx="76" cy="108" rx="9" ry="5" fill="#e86b6b" opacity=".32" />
            <ellipse cx="124" cy="108" rx="9" ry="5" fill="#e86b6b" opacity=".32" />
          </>
        ) : (
          <>
            <ellipse cx="76" cy="108" rx="7" ry="4" fill="#e86b6b" opacity=".18" />
            <ellipse cx="124" cy="108" rx="7" ry="4" fill="#e86b6b" opacity=".18" />
          </>
        )}
        <Details kind={a.details} />
        <Brows kind={a.brows} c={bald ? shade(skin, -0.55) : browColor} />
        <Eyes kind={a.eyes} iris={EYE_COLORS[a.eyeColor]} skinLo={skinLo} />
        <path d="M99 99 Q96.5 106 101 108" stroke={shade(skin, -0.24)} strokeWidth="2.2" strokeLinecap="round" fill="none" />
        <FacialHair kind={a.facialHair} c={a.facialHair === 1 ? shade(hair, -0.2) : hair} />
        <Mouth kind={a.mouth} />
        <HairFront style={a.hair} c={hair} hi={hairHi} lo={hairLo} />
        {!(equipped.accessory && CATALOG_BY_ID.get(equipped.accessory)?.art === "glasses") && <Glasses kind={a.glasses} />}
        <Accessory id={equipped.accessory} />
        <Headwear id={equipped.headwear} />
      </g>
      {ring && crop === "full" && <circle cx="100" cy="100" r="95" fill="none" stroke="#fff" strokeWidth="6.5" />}
    </svg>
  );
}
