"use client";
import { CATALOG_BY_ID } from "@/lib/game/catalog";
import type { AvatarConfig, PlayerState } from "@/lib/types";

export const SKIN = ["#f6d7c3", "#eec1a0", "#d9a07a", "#b9794f", "#8d5a3b", "#5e3b28"];
export const HAIR_COLORS = ["#1f1a17", "#4a2f1d", "#8a5a2b", "#c99a54", "#9aa0a6", "#b5462f"];
export const HAIR_STYLES = ["Short", "Side part", "Long", "Bun", "Curly", "Buzz"];
export const BACKDROPS = ["#2d86cc", "#12a594", "#8e4ec6", "#e8a31c", "#e5484d", "#24406f"];

function Hair({ style, color }: { style: number; color: string }) {
  switch (style) {
    case 0:
      return <path d="M38 50c0-16 10-24 22-24s22 8 22 24c-4-6-10-9-22-9s-18 3-22 9z" fill={color} />;
    case 1:
      return <path d="M37 52c-1-17 9-26 23-26 13 0 23 8 23 24-6-9-17-12-30-10-6 1-11 5-16 12z" fill={color} />;
    case 2:
      return (
        <>
          <path d="M36 52c0-17 10-27 24-27s24 10 24 27v26c-3 0-6-2-7-5V56c-5-8-11-11-17-11s-13 3-17 11v17c-1 3-4 5-7 5z" fill={color} />
        </>
      );
    case 3:
      return (
        <>
          <circle cx="60" cy="22" r="9" fill={color} />
          <path d="M37 52c0-16 10-25 23-25s23 9 23 25c-5-7-12-10-23-10s-18 3-23 10z" fill={color} />
        </>
      );
    case 4:
      return (
        <g fill={color}>
          {[40, 47, 54, 61, 68, 75, 80].map((x, i) => (
            <circle key={i} cx={x} cy={i % 2 ? 33 : 38} r={8} />
          ))}
          <circle cx="38" cy="47" r="6" />
          <circle cx="82" cy="47" r="6" />
        </g>
      );
    default:
      return <path d="M39 48c1-13 10-20 21-20s20 7 21 20c-5-4-12-6-21-6s-16 2-21 6z" fill={color} opacity={0.85} />;
  }
}

function Outfit({ id }: { id?: string }) {
  const item = id ? CATALOG_BY_ID.get(id) : undefined;
  const c = item?.color ?? "#5b7fa6";
  const a = item?.accent ?? "#ffffff";
  const body = "M18 120c2-22 18-34 42-34s40 12 42 34z";
  switch (item?.art) {
    case "blazer":
    case "suit":
      return (
        <>
          <path d={body} fill={c} />
          <path d="M50 87l10 22 10-22z" fill="#f4f4f2" />
          <path d="M57 92h6l-1 4 3 18-5 6-5-6 3-18z" fill={item?.art === "suit" ? a : "#3a6ea5"} />
          <path d="M48 88l12 26-16-10 4-6-4-4zM72 88L60 114l16-10-4-6 4-4z" fill={c} stroke="rgba(0,0,0,.25)" strokeWidth="1" />
        </>
      );
    case "field":
      return (
        <>
          <path d={body} fill={c} />
          <path d="M46 88l14 10 14-10 4 6-18 10-18-10z" fill={a} />
          <rect x="34" y="104" width="14" height="10" rx="2" fill="rgba(0,0,0,.15)" />
          <rect x="72" y="104" width="14" height="10" rx="2" fill="rgba(0,0,0,.15)" />
        </>
      );
    case "uniform":
      return (
        <>
          <path d={body} fill={c} />
          <path d="M52 87h16l-8 12z" fill="#f4f4f2" />
          <path d="M60 99v21" stroke={a} strokeWidth="2" />
          {[104, 111, 118].map((y) => (
            <circle key={y} cx="60" cy={y} r="1.8" fill={a} />
          ))}
          <rect x="22" y="94" width="18" height="5" rx="2.5" fill={a} transform="rotate(-18 31 96)" />
          <rect x="80" y="94" width="18" height="5" rx="2.5" fill={a} transform="rotate(18 89 96)" />
        </>
      );
    default:
      return (
        <>
          <path d={body} fill={c} />
          <path d="M48 88c4 6 20 6 24 0" stroke="rgba(255,255,255,.45)" strokeWidth="4" fill="none" />
        </>
      );
  }
}

function Headwear({ id }: { id?: string }) {
  const item = id ? CATALOG_BY_ID.get(id) : undefined;
  if (!item) return null;
  const c = item.color;
  switch (item.art) {
    case "fedora":
      return (
        <>
          <ellipse cx="60" cy="40" rx="32" ry="6" fill={c} />
          <path d="M42 40c0-12 6-18 18-18s18 6 18 18z" fill={c} />
          <rect x="42" y="34" width="36" height="5" fill="#2a2018" />
        </>
      );
    case "beret":
      return <path d="M34 42c2-12 16-18 30-16s22 8 20 16c-6-3-14-4-25-4s-19 2-25 4z" fill={c} />;
    case "headset":
      return (
        <>
          <path d="M36 52c0-18 10-26 24-26s24 8 24 26" fill="none" stroke={c} strokeWidth="4" />
          <rect x="31" y="50" width="8" height="14" rx="3" fill={c} />
          <rect x="81" y="50" width="8" height="14" rx="3" fill={c} />
          <path d="M35 62c0 8 6 12 14 12" fill="none" stroke={c} strokeWidth="2.5" />
          <circle cx="50" cy="74" r="3" fill={item.accent} />
        </>
      );
    case "cap":
      return (
        <>
          <path d="M38 40c0-10 10-16 22-16s22 6 22 16z" fill={c} />
          <rect x="38" y="38" width="44" height="6" fill={item.accent} />
          <path d="M40 44h40l-6 6H46z" fill="#111" />
          <circle cx="60" cy="32" r="3" fill={item.accent} />
        </>
      );
    case "laurel":
      return (
        <g fill={c}>
          {Array.from({ length: 7 }).map((_, i) => (
            <ellipse key={`l${i}`} cx={38 + i * 3} cy={46 - i * 2.4} rx="5" ry="2.5" transform={`rotate(${-50 + i * 8} ${38 + i * 3} ${46 - i * 2.4})`} />
          ))}
          {Array.from({ length: 7 }).map((_, i) => (
            <ellipse key={`r${i}`} cx={82 - i * 3} cy={46 - i * 2.4} rx="5" ry="2.5" transform={`rotate(${50 - i * 8} ${82 - i * 3} ${46 - i * 2.4})`} />
          ))}
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
      return (
        <g fill="rgba(200,230,255,.35)" stroke={c} strokeWidth="2">
          <circle cx="51" cy="58" r="6" />
          <circle cx="69" cy="58" r="6" />
          <path d="M57 58h6" />
        </g>
      );
    case "lanyard":
      return (
        <>
          <path d="M48 88l12 18 12-18" fill="none" stroke={c} strokeWidth="3" />
          <rect x="53" y="104" width="14" height="10" rx="2" fill="#fff" stroke="#999" />
        </>
      );
    case "tie":
      return <path d="M57 90h6l-1 4 3 18-5 6-5-6 3-18z" fill={c} />;
    case "earpiece":
      return <path d="M82 56c4 0 5 4 3 7s-3 10-1 16" fill="none" stroke={c} strokeWidth="2" />;
    case "pin":
      return <circle cx="44" cy="100" r="4" fill={c} stroke="#fff" strokeWidth="1.5" />;
    case "medal":
      return (
        <>
          <path d="M40 92l4 8 4-8z" fill={item.accent} />
          <circle cx="44" cy="104" r="5" fill={c} stroke="#a7791d" strokeWidth="1.5" />
        </>
      );
    case "sash":
      return <path d="M34 92l8-4 44 32h-14z" fill={c} stroke={item.accent} strokeWidth="1.5" />;
  }
  return null;
}

export function AvatarFigure({ avatar, equipped, size = 64, ring = true, className }: { avatar: AvatarConfig; equipped: PlayerState["equipped"]; size?: number; ring?: boolean; className?: string }) {
  const skin = SKIN[avatar.skin] ?? SKIN[2];
  const hair = HAIR_COLORS[avatar.hairColor] ?? HAIR_COLORS[0];
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} aria-hidden>
      <defs>
        <clipPath id="av-clip">
          <circle cx="60" cy="60" r="58" />
        </clipPath>
      </defs>
      <g clipPath="url(#av-clip)">
        <rect width="120" height="120" fill={BACKDROPS[avatar.backdrop] ?? BACKDROPS[0]} />
        <circle cx="60" cy="60" r="44" fill="#fff" opacity=".12" />
        <Outfit id={equipped.outfit} />
        <rect x="53" y="72" width="14" height="16" rx="5" fill={skin} />
        {avatar.hair === 2 && <path d="M36 56v22c3 0 6-2 7-5V56z M84 56v22c-3 0-6-2-7-5V56z" fill={hair} />}
        <ellipse cx="38" cy="59" rx="4" ry="6" fill={skin} />
        <ellipse cx="82" cy="59" rx="4" ry="6" fill={skin} />
        <ellipse cx="60" cy="56" rx="22" ry="25" fill={skin} />
        <Hair style={avatar.hair} color={hair} />
        <circle cx="51" cy="58" r="2.6" fill="#1d2430" />
        <circle cx="69" cy="58" r="2.6" fill="#1d2430" />
        <circle cx="52" cy="57" r="0.9" fill="#fff" />
        <circle cx="70" cy="57" r="0.9" fill="#fff" />
        <path d="M47 51q4-3 8 0M65 51q4-3 8 0" stroke={hair} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M53 68q7 6 14 0" stroke="#7a3b2e" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <circle cx="46" cy="65" r="3.5" fill="#f19a8a" opacity=".35" />
        <circle cx="74" cy="65" r="3.5" fill="#f19a8a" opacity=".35" />
        <Accessory id={equipped.accessory} />
        <Headwear id={equipped.headwear} />
      </g>
      {ring && <circle cx="60" cy="60" r="57" fill="none" stroke="#fff" strokeWidth="4" />}
    </svg>
  );
}
