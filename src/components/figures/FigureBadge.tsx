"use client";
import { useState } from "react";
import { FIGURES_BY_ID, type Figure } from "@/data/figures";
import { usePortrait } from "@/lib/client/portraits";
import { COUNTRY_BY_ID } from "@/lib/client/world";

const PALETTE = ["#24406f", "#12a594", "#8e4ec6", "#b0302f", "#2f9e6e", "#9c6a07", "#3e63dd", "#5b6b7d"];
const initials = (name: string) =>
  name
    .replace(/^(King|Queen|Emir)\s+/, "")
    .split(/\s+/)
    .filter((w) => /^[A-ZÀ-ÖØ-Þ]/.test(w))
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

/** Official photo (freely licensed, from Wikimedia Commons) with a flag badge; initials while loading or if none. */
export function FigureBadge({ figure, id, size = 48 }: { figure?: Figure; id?: string; size?: number }) {
  const f = figure ?? (id ? FIGURES_BY_ID.get(id) : undefined);
  const photo = usePortrait(f?.id);
  const [broken, setBroken] = useState(false);
  if (!f) return null;
  const flag = f.country ? COUNTRY_BY_ID.get(f.country)?.flag : "🌐";
  const p = f.portrait ?? photo;
  if (p && !broken) {
    return (
      <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={p.url}
          alt={f.name}
          title={`Photo: ${p.credit} (${p.license})`}
          width={size}
          height={size}
          loading="lazy"
          onError={() => setBroken(true)}
          className="h-full w-full rounded-2xl bg-navy-700 object-cover object-top shadow-pop"
        />
        <span className="absolute -bottom-1 -right-1 rounded-md bg-white px-0.5 leading-none shadow" style={{ fontSize: size * 0.3 }} aria-hidden>
          {flag}
        </span>
      </span>
    );
  }
  const color = PALETTE[[...f.id].reduce((h, c) => h + c.charCodeAt(0), 0) % PALETTE.length];
  return (
    <span className="relative inline-grid shrink-0 place-items-center rounded-2xl font-display font-bold text-white shadow-pop" style={{ width: size, height: size, background: `linear-gradient(150deg, ${color}, #0d1a2e)`, fontSize: size * 0.36 }} aria-hidden>
      {initials(f.name)}
      <span className="absolute -bottom-1 -right-1 rounded-md bg-white px-0.5 leading-none shadow" style={{ fontSize: size * 0.3 }}>
        {flag}
      </span>
    </span>
  );
}
