"use client";
import type { GeoProjection } from "d3-geo";
import type { ZoomTransform } from "d3-zoom";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { sound } from "@/lib/client/sound";
import type { NewsEvent, Tier } from "@/lib/types";
import { CATEGORY_META, CategoryIcon } from "../ui/icons";

export const TIER_SIZE: Record<Tier, number> = { minor: 30, notable: 36, significant: 44, major: 52, global: 62 };
export const TIER_LABEL: Record<Tier, string> = { minor: "Minor", notable: "Notable", significant: "Significant", major: "Major", global: "Global" };

interface Placed {
  e: NewsEvent;
  x: number;
  y: number;
  size: number;
}
interface Group {
  x: number;
  y: number;
  members: Placed[];
}

export function MarkerButton({ e, size, done, onClick, tabIndex }: { e: NewsEvent; size: number; done: boolean; onClick: () => void; tabIndex?: number }) {
  const meta = CATEGORY_META[e.category];
  const global = e.importance.tier === "global" || e.importance.tier === "major";
  return (
    <motion.button
      type="button"
      tabIndex={tabIndex}
      onClick={(ev) => {
        ev.stopPropagation();
        sound.play("click");
        onClick();
      }}
      whileHover={{ scale: 1.12, y: -3 }}
      whileTap={{ scale: 0.92 }}
      className="group relative grid place-items-center rounded-[28%] text-white outline-none"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(160deg, ${meta.color} 0%, ${meta.dark} 100%)`,
        boxShadow: `0 ${size * 0.1}px 0 ${meta.dark}, 0 ${size * 0.16}px ${size * 0.3}px rgba(8,17,31,0.45), inset 0 2px 0 rgba(255,255,255,0.35)`,
        border: "2px solid rgba(255,255,255,0.85)",
        opacity: done ? 0.78 : 1,
      }}
      aria-label={`${meta.label} briefing: ${e.title}. Importance ${TIER_LABEL[e.importance.tier]}${done ? ". Completed" : ""}`}
    >
      {global && !done && <span className="absolute inset-0 -z-10 animate-pulseRing rounded-[28%]" style={{ background: meta.color }} />}
      <CategoryIcon category={e.category} size={size * 0.58} />
      {done && (
        <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-land-500 text-[11px] font-bold text-white ring-2 ring-white">✓</span>
      )}
      {e.isDemo && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-navy-900/85 px-1.5 text-[8px] font-bold uppercase tracking-wider text-gold-300">demo</span>}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-56 -translate-x-1/2 rounded-xl bg-navy-900/95 px-3 py-2 text-left text-xs font-medium leading-snug text-white shadow-game group-hover:block group-focus-visible:block">
        <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider" style={{ color: meta.color }}>
          {meta.label} · {TIER_LABEL[e.importance.tier]}
        </span>
        {e.title}
      </span>
    </motion.button>
  );
}

export function MarkerLayer({
  events,
  completed,
  projection,
  transform,
  onEvent,
  zoomToBounds,
  size,
}: {
  events: NewsEvent[];
  completed: Set<string>;
  projection: GeoProjection;
  transform: ZoomTransform;
  onEvent: (id: string) => void;
  zoomToBounds: (b: [[number, number], [number, number]], maxK?: number) => void;
  size: { w: number; h: number };
}) {
  const [expanded, setExpanded] = useState<number | null>(null);

  const base = useMemo(
    () =>
      events
        .map((e) => {
          const p = projection([e.location.lng, e.location.lat]);
          return p ? { e, bx: p[0], by: p[1] } : null;
        })
        .filter(Boolean) as { e: NewsEvent; bx: number; by: number }[],
    [events, projection],
  );

  // Greedy screen-space clustering: biggest events first, smaller ones merge into nearby groups.
  const groups = useMemo(() => {
    const placed: Placed[] = base
      .map(({ e, bx, by }) => ({ e, x: transform.applyX(bx), y: transform.applyY(by), size: TIER_SIZE[e.importance.tier] }))
      .sort((a, b) => b.e.importance.score - a.e.importance.score);
    const gs: Group[] = [];
    for (const m of placed) {
      const g = gs.find((g) => Math.hypot(g.x - m.x, g.y - m.y) < (g.members[0].size + m.size) / 2 + 4);
      if (g) g.members.push(m);
      else gs.push({ x: m.x, y: m.y, members: [m] });
    }
    return gs;
  }, [base, transform]);

  // collapse an expanded group when the zoom level changes
  const zoomKey = Math.round(transform.k * 10);
  useEffect(() => setExpanded(null), [zoomKey]);

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {groups.map((g, gi) => {
        if (g.x < -80 || g.y < -80 || g.x > size.w + 80 || g.y > size.h + 80) return null;
        const lead = g.members[0];
        if (g.members.length === 1)
          return (
            <div key={lead.e.id} className="pointer-events-auto absolute" style={{ left: g.x - lead.size / 2, top: g.y - lead.size / 2 }}>
              <MarkerButton e={lead.e} size={lead.size} done={completed.has(lead.e.quizId)} onClick={() => onEvent(lead.e.id)} />
            </div>
          );
        const isOpen = expanded === gi;
        const r = Math.max(56, g.members.length * 14);
        return (
          <div key={`g-${lead.e.id}`} className="pointer-events-auto absolute" style={{ left: g.x, top: g.y }}>
            <AnimatePresence>
              {isOpen &&
                g.members.map((m, i) => {
                  const a = (i / g.members.length) * Math.PI * 2 - Math.PI / 2;
                  const s = Math.min(m.size, 46);
                  return (
                    <motion.div
                      key={m.e.id}
                      className="absolute z-20"
                      initial={{ x: -s / 2, y: -s / 2, opacity: 0, scale: 0.4 }}
                      animate={{ x: Math.cos(a) * r - s / 2, y: Math.sin(a) * r - s / 2, opacity: 1, scale: 1 }}
                      exit={{ x: -s / 2, y: -s / 2, opacity: 0, scale: 0.4 }}
                      transition={{ type: "spring", stiffness: 380, damping: 26, delay: i * 0.02 }}
                    >
                      <MarkerButton e={m.e} size={s} done={completed.has(m.e.quizId)} onClick={() => onEvent(m.e.id)} />
                    </motion.div>
                  );
                })}
            </AnimatePresence>
            <motion.button
              type="button"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              onClick={(ev) => {
                ev.stopPropagation();
                sound.play("click");
                const xs = g.members.map((m) => m.x);
                const ys = g.members.map((m) => m.y);
                const spread = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
                if (spread > 6 && transform.k < 30) {
                  const inv = (x: number, y: number) => transform.invert([x, y]);
                  const [x0, y0] = inv(Math.min(...xs) - 40, Math.min(...ys) - 40);
                  const [x1, y1] = inv(Math.max(...xs) + 40, Math.max(...ys) + 40);
                  zoomToBounds(
                    [
                      [x0, y0],
                      [x1, y1],
                    ],
                    48,
                  );
                } else setExpanded(isOpen ? null : gi);
              }}
              className="absolute grid place-items-center rounded-[28%] border-2 border-white/90 text-white"
              style={{
                width: lead.size + 6,
                height: lead.size + 6,
                left: -(lead.size + 6) / 2,
                top: -(lead.size + 6) / 2,
                background: `linear-gradient(160deg, ${CATEGORY_META[lead.e.category].color}, ${CATEGORY_META[lead.e.category].dark})`,
                boxShadow: "0 5px 0 rgba(8,17,31,0.45), 0 8px 18px rgba(8,17,31,0.45), 6px -6px 0 -2px rgba(255,255,255,0.75), 6px -6px 0 0 rgba(13,26,46,0.6)",
              }}
              aria-label={`${g.members.length} news events in this area. ${isOpen ? "Collapse" : "Show them"}`}
              aria-expanded={isOpen}
            >
              <CategoryIcon category={lead.e.category} size={(lead.size + 6) * 0.5} />
              <span className="absolute -right-2.5 -top-2.5 grid h-6 min-w-6 place-items-center rounded-full bg-gold-400 px-1 font-display text-xs font-bold text-navy-900 ring-2 ring-white">{g.members.length}</span>
            </motion.button>
          </div>
        );
      })}
    </div>
  );
}
