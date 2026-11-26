// Original SVG icon set for WorldPulse (category symbols and navigation).
import type { Category } from "@/lib/types";

type P = { size?: number; className?: string; title?: string };

const S = ({ size = 24, className, title, children, vb = "0 0 32 32" }: P & { children: React.ReactNode; vb?: string }) => (
  <svg width={size} height={size} viewBox={vb} className={className} aria-hidden={title ? undefined : true} role={title ? "img" : undefined} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    {title && <title>{title}</title>}
    {children}
  </svg>
);

export const CATEGORY_META: Record<Category, { label: string; color: string; dark: string }> = {
  conflict: { label: "Conflict", color: "#e5484d", dark: "#a8262b" },
  election: { label: "Election", color: "#8e4ec6", dark: "#5f2b8c" },
  diplomacy: { label: "Diplomacy", color: "#12a594", dark: "#0a6e62" },
  economy: { label: "Economy", color: "#e8a31c", dark: "#9c6a07" },
  trade: { label: "Trade", color: "#3e63dd", dark: "#24409f" },
  energy: { label: "Energy", color: "#7c5a3a", dark: "#4d3621" },
  organizations: { label: "Int'l Orgs", color: "#0090ff", dark: "#0059a6" },
  security: { label: "Security", color: "#5b6b7d", dark: "#36414e" },
  technology: { label: "Technology", color: "#6e56cf", dark: "#46339b" },
  sanctions: { label: "Sanctions", color: "#d6409f", dark: "#931d68" },
  humanitarian: { label: "Humanitarian", color: "#ec5d5e", dark: "#b0302f" },
  leadership: { label: "Leadership", color: "#2f9e6e", dark: "#1b6847" },
};

export function CategoryIcon({ category, size = 24, className }: { category: Category } & P) {
  switch (category) {
    case "conflict": // crossed swords
      return (
        <S size={size} className={className}>
          <path d="M6 6l14 14M26 6L12 20" />
          <path d="M6 6l1 5M6 6l5 1M26 6l-1 5M26 6l-5 1" />
          <path d="M17 23l6-6M9 17l6 6" />
          <path d="M21 21l4 4M11 21l-4 4" />
        </S>
      );
    case "election": // ballot box
      return (
        <S size={size} className={className}>
          <rect x="6" y="14" width="20" height="13" rx="2" />
          <path d="M11 14V6h10v8" />
          <path d="M14 10l2 2 4-4" />
          <path d="M11 19h10" />
        </S>
      );
    case "diplomacy": // handshake
      return (
        <S size={size} className={className}>
          <path d="M3 13l5-4 5 2 3-2 4 1 5-1 4 4" />
          <path d="M8 9l-5 5 7 7 2-1" />
          <path d="M29 13l-6 7-3-1" />
          <path d="M13 11l-3 4c1 1 3 1 4 0l2-2 6 6" />
          <path d="M14 22l2 2M17 20l2.5 2.5" />
        </S>
      );
    case "economy": // currency coin
      return (
        <S size={size} className={className}>
          <circle cx="16" cy="16" r="11" />
          <path d="M20 11.5c-1-1-2.3-1.5-4-1.5-2.2 0-4 1.2-4 3s1.6 2.5 4 3 4 1.2 4 3-1.8 3-4 3c-1.7 0-3.2-.6-4-1.6M16 8v2M16 22v2" />
        </S>
      );
    case "trade": // cargo ship
      return (
        <S size={size} className={className}>
          <path d="M4 20h24l-3 6H8z" />
          <path d="M8 20v-5h6v5M14 20v-8h6v8M20 20v-5h4v5" />
          <path d="M3 28c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1 2-1 4-1 2 1 4 1" strokeWidth={1.8} />
        </S>
      );
    case "energy": // oil barrel
      return (
        <S size={size} className={className}>
          <ellipse cx="16" cy="7" rx="8" ry="3" />
          <path d="M8 7v18c0 1.7 3.6 3 8 3s8-1.3 8-3V7" />
          <path d="M8 13c0 1.7 3.6 3 8 3s8-1.3 8-3M8 19c0 1.7 3.6 3 8 3s8-1.3 8-3" />
          <path d="M16 11.5c-1.4 1.6-2 2.6-2 3.4a2 2 0 004 0c0-.8-.6-1.8-2-3.4z" fill="currentColor" strokeWidth={1} />
        </S>
      );
    case "organizations": // globe
      return (
        <S size={size} className={className}>
          <circle cx="16" cy="16" r="11" />
          <path d="M5 16h22M16 5c3 3 4.5 7 4.5 11S19 24 16 27c-3-3-4.5-7-4.5-11S13 8 16 5z" />
        </S>
      );
    case "security": // shield
      return (
        <S size={size} className={className}>
          <path d="M16 4l10 4v7c0 6.5-4.3 11-10 13-5.7-2-10-6.5-10-13V8z" />
          <path d="M11.5 16l3 3 6-6" />
        </S>
      );
    case "technology": // chip
      return (
        <S size={size} className={className}>
          <rect x="9" y="9" width="14" height="14" rx="2" />
          <rect x="13" y="13" width="6" height="6" rx="1" />
          <path d="M13 4v5M19 4v5M13 23v5M19 23v5M4 13h5M4 19h5M23 13h5M23 19h5" />
        </S>
      );
    case "sanctions": // padlock
      return (
        <S size={size} className={className}>
          <rect x="7" y="14" width="18" height="13" rx="3" />
          <path d="M11 14v-3a5 5 0 0110 0v3" />
          <path d="M16 19v3" />
        </S>
      );
    case "humanitarian": // aid cross in heart
      return (
        <S size={size} className={className}>
          <path d="M16 27S5 20.5 5 12.5A5.5 5.5 0 0116 9.3a5.5 5.5 0 0111 3.2C27 20.5 16 27 16 27z" />
          <path d="M16 12.5v7M12.5 16h7" />
        </S>
      );
    case "leadership": // podium / capitol
      return (
        <S size={size} className={className}>
          <path d="M5 27h22M7 27V14M12 27V14M20 27V14M25 27V14M4 14h24L16 5z" />
        </S>
      );
  }
}

export const NavIcon = {
  map: (p: P) => (
    <S {...p}>
      <path d="M4 8l7-3 10 3 7-3v19l-7 3-10-3-7 3z" />
      <path d="M11 5v19M21 8v19" />
    </S>
  ),
  briefing: (p: P) => (
    <S {...p}>
      <rect x="5" y="5" width="22" height="22" rx="3" />
      <path d="M10 11h12M10 16h12M10 21h7" />
    </S>
  ),
  figures: (p: P) => (
    <S {...p}>
      <circle cx="12" cy="11" r="4" />
      <path d="M4 26c0-4.4 3.6-8 8-8s8 3.6 8 8" />
      <circle cx="23" cy="12" r="3" />
      <path d="M22 18c3.4 0 6 2.7 6 6" />
    </S>
  ),
  hq: (p: P) => (
    <S {...p}>
      <path d="M4 14L16 5l12 9" />
      <path d="M7 12v15h18V12" />
      <rect x="13" y="18" width="6" height="9" />
    </S>
  ),
  shop: (p: P) => (
    <S {...p}>
      <path d="M5 11h22l-2 15H7z" />
      <path d="M11 11V9a5 5 0 0110 0v2" />
    </S>
  ),
  achievements: (p: P) => (
    <S {...p}>
      <path d="M10 5h12v6a6 6 0 01-12 0z" />
      <path d="M10 7H5c0 4 2 6 5 6M22 7h5c0 4-2 6-5 6M16 17v5M11 27h10M12 22h8v5h-8z" />
    </S>
  ),
  profile: (p: P) => (
    <S {...p}>
      <circle cx="16" cy="12" r="5" />
      <path d="M6 27c0-5.5 4.5-9 10-9s10 3.5 10 9" />
    </S>
  ),
  settings: (p: P) => (
    <S {...p}>
      <circle cx="16" cy="16" r="4" />
      <path d="M16 3v4M16 25v4M3 16h4M25 16h4M6.8 6.8l2.8 2.8M22.4 22.4l2.8 2.8M6.8 25.2l2.8-2.8M22.4 9.6l2.8-2.8" />
    </S>
  ),
  search: (p: P) => (
    <S {...p}>
      <circle cx="14" cy="14" r="8" />
      <path d="M20 20l7 7" />
    </S>
  ),
  close: (p: P) => (
    <S {...p}>
      <path d="M8 8l16 16M24 8L8 24" />
    </S>
  ),
  filter: (p: P) => (
    <S {...p}>
      <path d="M5 7h22l-8 10v8l-6 3V17z" />
    </S>
  ),
  plus: (p: P) => (
    <S {...p}>
      <path d="M16 7v18M7 16h18" />
    </S>
  ),
  minus: (p: P) => (
    <S {...p}>
      <path d="M7 16h18" />
    </S>
  ),
  home: (p: P) => (
    <S {...p}>
      <circle cx="16" cy="16" r="11" />
      <path d="M5 16h22M16 5c3 3 4.5 7 4.5 11S19 24 16 27c-3-3-4.5-7-4.5-11S13 8 16 5z" />
    </S>
  ),
  check: (p: P) => (
    <S {...p}>
      <path d="M7 17l6 6L25 9" />
    </S>
  ),
  link: (p: P) => (
    <S {...p}>
      <path d="M13 19l6-6M11 14l-3 3a4.2 4.2 0 006 6l3-3M21 18l3-3a4.2 4.2 0 00-6-6l-3 3" />
    </S>
  ),
  lock: (p: P) => (
    <S {...p}>
      <rect x="7" y="14" width="18" height="13" rx="3" />
      <path d="M11 14v-3a5 5 0 0110 0v3" />
    </S>
  ),
  flame: (p: P) => (
    <S {...p}>
      <path d="M16 28c5 0 8-3.5 8-8 0-6-6-8-5-15-4 2-7 6-7 10-1.5-1-2-3-2-4-2 2-2 5.5-2 9 0 4.5 3 8 8 8z" fill="currentColor" stroke="none" />
    </S>
  ),
};

export function Coin({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <circle cx="16" cy="17" r="13" fill="#b9801a" />
      <circle cx="16" cy="15" r="13" fill="#f7c552" />
      <circle cx="16" cy="15" r="9.5" fill="none" stroke="#d99a22" strokeWidth="2" />
      <path d="M12 15.5l3 3 5.5-6.5" fill="none" stroke="#b9801a" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx="11" cy="9" rx="3" ry="1.6" fill="#fff" opacity=".55" />
    </svg>
  );
}
