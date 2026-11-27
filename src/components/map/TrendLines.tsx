"use client";
import { motion } from "framer-motion";
import type { PublicTrend } from "@/lib/trends";
import type { NewsEvent } from "@/lib/types";
import { TIER_SIZE } from "./Markers";

export interface Thread {
  trend: PublicTrend;
  /** the story the threads start from: the hovered marker, or the trend's lead story */
  hub: string;
}

/** The stories of a trend that are on the map now, lead story first. */
export function visibleLinks(t: PublicTrend, onMap: Map<string, unknown>) {
  return t.links.filter((l) => l.live && onMap.has(l.eventId));
}

export function leadStory(t: PublicTrend, onMap: Map<string, unknown>): string | null {
  const ls = visibleLinks(t, onMap);
  return (ls.find((l) => l.kind === "direct") ?? ls[0])?.eventId ?? null;
}

/** Curved control point: bend each thread to one side so overlapping threads stay apart. */
function ctrl(a: [number, number], b: [number, number], bend: number): [number, number] {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return [mx - dy * bend, my + dx * bend];
}

/** A point on the thread for its label, away from markers (which sit above the map and would hide it). */
function labelSpot(a: [number, number], c: [number, number], b: [number, number], pos: Map<string, [number, number]>, k: number): [number, number] {
  const at = (t: number): [number, number] => [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t ** 2 * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t ** 2 * b[1]];
  let best = at(0.5);
  let bestGap = -1;
  for (const t of [0.5, 0.42, 0.58, 0.34, 0.66, 0.26, 0.74]) {
    const p = at(t);
    let gap = Infinity;
    for (const m of pos.values()) gap = Math.min(gap, Math.hypot(m[0] - p[0], m[1] - p[1]) * k);
    if (gap > 60) return p;
    if (gap > bestGap) [best, bestGap] = [p, gap];
  }
  return best;
}

function Label({ x, y, text, color, k }: { x: number; y: number; text: string; color: string; k: number }) {
  const fs = 12.5 / k;
  const w = (text.length * 7.1 + 16) / k;
  const h = 22 / k;
  return (
    <g pointerEvents="none">
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={h / 2} fill={color} stroke="#fff" strokeWidth={1.6 / k} />
      <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={fs} fontWeight={700} fontFamily="'Nunito Variable', system-ui" fill="#fff">
        {text}
      </text>
    </g>
  );
}

/**
 * Threads between the stories of a trend, drawn inside the zoomed map group (so they pan and zoom
 * with the map in the same frame). Solid threads are direct links; dotted ones are ripple effects.
 */
export function TrendLines({ threads, pos, events, k }: { threads: Thread[]; pos: Map<string, [number, number]>; events: Map<string, NewsEvent>; k: number }) {
  return (
    <g>
      {threads.map(({ trend, hub }, ti) => {
        const a = pos.get(hub);
        if (!a) return null;
        const links = visibleLinks(trend, pos).filter((l) => l.eventId !== hub);
        const hubLink = trend.links.find((l) => l.eventId === hub);
        const hubSize = TIER_SIZE[events.get(hub)?.importance.tier ?? "notable"];
        // alternate the side each trend's threads bend to, so trends sharing a story stay apart
        const bend = (ti % 2 ? -1 : 1) * (0.16 + Math.floor(ti / 2) * 0.08);
        return (
          <motion.g key={`${trend.id}-${hub}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
            {links.map((l) => {
              const b = pos.get(l.eventId);
              if (!b) return null;
              const c = ctrl(a, b, bend);
              const d = `M${a[0]},${a[1]} Q${c[0]},${c[1]} ${b[0]},${b[1]}`;
              const dash = l.kind === "ripple" ? `${1 / k} ${7 / k}` : undefined;
              return (
                <g key={l.eventId} pointerEvents="none">
                  <path d={d} fill="none" stroke="#0b1d33" strokeOpacity={0.35} strokeWidth={7 / k} strokeLinecap="round" />
                  <path d={d} fill="none" stroke="#fff" strokeWidth={5.5 / k} strokeLinecap="round" strokeDasharray={dash} />
                  <path d={d} fill="none" stroke={trend.color} strokeWidth={3.2 / k} strokeLinecap="round" strokeDasharray={dash} />
                </g>
              );
            })}
            {links.map((l) => {
              const b = pos.get(l.eventId);
              if (!b) return null;
              const c = ctrl(a, b, bend);
              const [x, y] = labelSpot(a, c, b, pos, k);
              return <Label key={`l-${l.eventId}`} x={x} y={y} text={l.label} color={trend.color} k={k} />;
            })}
            {hubLink && <Label x={a[0]} y={a[1] + (hubSize / 2 + 20 + ti * 26) / k} text={hubLink.label} color={trend.color} k={k} />}
          </motion.g>
        );
      })}
    </g>
  );
}
