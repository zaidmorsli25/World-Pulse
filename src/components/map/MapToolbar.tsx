"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import { FIGURES } from "@/data/figures";
import { COUNTRIES } from "@/lib/client/world";
import { CATEGORIES, REGIONS, TIERS } from "@/lib/types";
import { FigureBadge } from "../figures/FigureBadge";
import type { Filters } from "../game/GameShell";
import { useGame } from "../game/GameProvider";
import { CATEGORY_META, CategoryIcon, NavIcon } from "../ui/icons";
import { TIER_LABEL, TIER_SIZE } from "./Markers";

const ZOOM_REGIONS = ["World", "Africa", "Americas", "Asia", "Europe", "Middle East", "Oceania"];
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "");

export function MapToolbar({ filters, setFilters, onRegion, shown, total }: { filters: Filters; setFilters: (f: Filters) => void; onRegion: (r: string) => void; shown: number; total: number }) {
  const { flyToCountry, openCountry, openFigure } = useGame();
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const n = norm(q.trim());
    if (!n) return [];
    const cs = COUNTRIES.filter((c) => norm(c.name).includes(n) || norm(c.official).includes(n) || (c.capital && norm(c.capital).startsWith(n)))
      .sort((a, b) => (norm(a.name).startsWith(n) ? 0 : 1) - (norm(b.name).startsWith(n) ? 0 : 1))
      .slice(0, 6)
      .map((c) => ({ kind: "country" as const, id: c.id, label: c.name, sub: c.capital ? `Capital: ${c.capital}` : (c.subregion ?? ""), flag: c.flag }));
    const fs = FIGURES.filter((f) => norm(f.name).includes(n))
      .slice(0, 4)
      .map((f) => ({ kind: "figure" as const, id: f.id, label: f.name, sub: f.position, flag: "" }));
    return [...cs, ...fs];
  }, [q]);

  const pick = (r: (typeof results)[number]) => {
    if (r.kind === "country") {
      flyToCountry(r.id);
      openCountry(r.id);
    } else openFigure(r.id);
    setQ("");
    inputRef.current?.blur();
  };

  const toggle = <T,>(set: Set<T>, v: T) => {
    const n = new Set(set);
    if (n.has(v)) n.delete(v);
    else n.add(v);
    return n;
  };
  const activeFilterCount = CATEGORIES.length - filters.categories.size + (TIERS.length - filters.tiers.size) + filters.regions.size + (filters.status !== "all" ? 1 : 0);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[74px] z-20 flex flex-col items-center gap-2 px-2 sm:top-3 sm:px-0">
      <div className="pointer-events-auto flex w-full max-w-xl items-center gap-2 sm:w-[min(36rem,calc(100vw-30rem))]">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-700">
            <NavIcon.search size={18} />
          </span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && results[active]) pick(results[active]);
              else if (e.key === "Escape") setQ("");
            }}
            placeholder="Search countries, capitals or leaders…"
            className="h-11 w-full rounded-2xl border-2 border-white/60 bg-white/95 pl-10 pr-3 text-navy-900 shadow-game outline-none placeholder:text-navy-700/60 focus:border-gold-400"
            role="combobox"
            aria-expanded={focused && results.length > 0}
            aria-controls="search-results"
            aria-label="Search the map"
          />
          {focused && results.length > 0 && (
            <ul id="search-results" role="listbox" className="absolute left-0 right-0 top-full mt-1.5 overflow-hidden rounded-2xl bg-white shadow-game">
              {results.map((r, i) => (
                <li key={`${r.kind}-${r.id}`} role="option" aria-selected={i === active}>
                  <button onMouseDown={(e) => e.preventDefault()} onClick={() => pick(r)} className={`flex w-full items-center gap-3 px-3 py-2 text-left ${i === active ? "bg-ocean-400/15" : "hover:bg-parchment-100"}`}>
                    {r.kind === "country" ? <span className="text-2xl">{r.flag}</span> : <FigureBadge id={r.id} size={30} />}
                    <span>
                      <span className="block font-semibold text-navy-900">{r.label}</span>
                      <span className="block text-xs text-navy-700/80">{r.sub}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button onClick={() => setShowFilters((s) => !s)} className={`btn h-11 !px-3 ${showFilters ? "btn-primary" : "btn-ghost"}`} aria-expanded={showFilters} aria-label="Filters">
          <NavIcon.filter size={20} />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#e5484d] px-1 text-[11px] text-white">{activeFilterCount}</span>}
        </button>
      </div>

      <div className="pointer-events-auto scroll-thin flex max-w-full gap-1.5 overflow-x-auto rounded-2xl px-1 pb-1">
        {ZOOM_REGIONS.map((r) => (
          <button key={r} onClick={() => onRegion(r)} className="shrink-0 rounded-xl bg-navy-900/75 px-3 py-1 text-xs font-semibold text-white shadow backdrop-blur transition hover:bg-navy-900">
            {r}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="panel pointer-events-auto scroll-thin max-h-[60dvh] w-[min(36rem,calc(100vw-1rem))] overflow-y-auto p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-navy-900">
                Filters <span className="text-sm font-medium text-navy-700/70">· showing {shown} of {total} events</span>
              </h2>
              <button className="text-sm font-semibold text-ocean-700 hover:underline" onClick={() => setFilters({ categories: new Set(CATEGORIES), tiers: new Set(TIERS), regions: new Set(), status: "all" })}>
                Reset
              </button>
            </div>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-navy-700/70">Categories</p>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => {
                const on = filters.categories.has(c);
                return (
                  <button key={c} onClick={() => setFilters({ ...filters, categories: toggle(filters.categories, c) })} aria-pressed={on} className={`flex items-center gap-1.5 rounded-xl border-2 px-2.5 py-1 text-sm font-semibold transition ${on ? "text-white" : "border-parchment-200 bg-white text-navy-700/60"}`} style={on ? { background: CATEGORY_META[c].color, borderColor: CATEGORY_META[c].dark } : undefined}>
                    <CategoryIcon category={c} size={16} />
                    {CATEGORY_META[c].label}
                  </button>
                );
              })}
            </div>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-navy-700/70">Importance</p>
            <div className="mb-4 flex flex-wrap items-end gap-1.5">
              {TIERS.map((t) => {
                const on = filters.tiers.has(t);
                return (
                  <button key={t} onClick={() => setFilters({ ...filters, tiers: toggle(filters.tiers, t) })} aria-pressed={on} className={`flex items-center gap-1.5 rounded-xl border-2 px-2.5 py-1 text-sm font-semibold ${on ? "border-navy-800 bg-navy-800 text-white" : "border-parchment-200 bg-white text-navy-700/60"}`}>
                    <span className="inline-block rounded bg-gold-400" style={{ width: TIER_SIZE[t] / 4, height: TIER_SIZE[t] / 4 }} />
                    {TIER_LABEL[t]}
                  </button>
                );
              })}
            </div>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-navy-700/70">Region</p>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {REGIONS.filter((r) => r !== "Antarctic").map((r) => {
                const on = filters.regions.has(r);
                return (
                  <button key={r} onClick={() => setFilters({ ...filters, regions: toggle(filters.regions, r) })} aria-pressed={on} className={`rounded-xl border-2 px-2.5 py-1 text-sm font-semibold ${on ? "border-ocean-600 bg-ocean-500 text-white" : "border-parchment-200 bg-white text-navy-700"}`}>
                    {r}
                  </button>
                );
              })}
              <span className="self-center text-xs text-navy-700/60">(none selected = all)</span>
            </div>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-navy-700/70">Briefings</p>
            <div className="grid grid-cols-3 gap-1 rounded-2xl bg-parchment-200 p-1">
              {(["all", "unread", "completed"] as const).map((s) => (
                <button key={s} onClick={() => setFilters({ ...filters, status: s })} aria-pressed={filters.status === s} className={`rounded-xl py-1.5 text-sm font-semibold capitalize ${filters.status === s ? "bg-white shadow" : "text-navy-700"}`}>
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
