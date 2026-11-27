"use client";
import { animate, AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { levelFromXp } from "@/lib/game/progression";
import { RARITY_STYLE } from "@/lib/game/catalog";
import type { Rarity } from "@/lib/types";
import { useGame } from "../game/GameProvider";
import { Coin, XpIcon } from "./icons";

/** Number that counts up/down smoothly when it changes. */
export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [shown, setShown] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    if (document.documentElement.classList.contains("reduce-motion")) {
      setShown(value);
      prev.current = value;
      return;
    }
    const c = animate(prev.current, value, { duration: 0.9, ease: "easeOut", onUpdate: (v) => setShown(Math.round(v)) });
    prev.current = value;
    return () => c.stop();
  }, [value]);
  return <span className={className}>{shown.toLocaleString()}</span>;
}

export function XPBar({ xp, compact }: { xp: number; compact?: boolean }) {
  const info = levelFromXp(xp);
  return (
    <div className={compact ? "w-28 sm:w-40" : "w-full"}>
      {!compact && (
        <div className="mb-1 flex justify-between text-xs font-semibold text-navy-700">
          <span>Level {info.level}</span>
          <span className="flex items-center gap-1">
            <XpIcon size={15} />
            {info.xpIntoLevel} / {info.xpForLevel} XP
          </span>
        </div>
      )}
      <div className={`relative overflow-hidden rounded-full bg-navy-950/40 ${compact ? "h-2.5" : "h-4"} ring-1 ring-white/20`} role="progressbar" aria-valuenow={Math.round(info.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`Level ${info.level} progress`}>
        <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg,#4da3e0,#57d3c9 60%,#8cf0b0)" }} initial={false} animate={{ width: `${Math.max(4, info.progress * 100)}%` }} transition={{ type: "spring", stiffness: 90, damping: 18 }} />
        <div className="absolute inset-0 animate-shimmer bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent)] bg-[length:200%_100%]" />
      </div>
    </div>
  );
}

export function XpAmount({ value, size = 18, className = "" }: { value: number; size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 font-display font-semibold ${className}`}>
      <XpIcon size={size} />
      <AnimatedNumber value={value} />
      <span className="text-[0.8em] opacity-80">XP</span>
    </span>
  );
}

export function CoinAmount({ value, size = 18, className = "" }: { value: number; size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 font-display font-semibold ${className}`}>
      <Coin size={size} />
      <AnimatedNumber value={value} />
    </span>
  );
}

export function RarityBadge({ rarity }: { rarity: Rarity }) {
  const r = RARITY_STYLE[rarity];
  return (
    <span className="chip text-white" style={{ background: r.color }}>
      {r.label}
    </span>
  );
}

export function Toasts() {
  const { toasts, dismissToast } = useGame();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[128px] z-50 sm:top-20 flex flex-col items-center gap-2 px-3" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            layout
            onClick={() => dismissToast(t.id)}
            initial={{ y: -20, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0, scale: 0.95 }}
            className={`pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl px-4 py-3 text-left shadow-game ${t.kind === "error" ? "bg-[#fde8e8] text-[#8a1c1c]" : t.kind === "achievement" ? "bg-gradient-to-r from-navy-800 to-navy-700 text-white ring-2 ring-gold-400" : "bg-parchment-50 text-navy-900"}`}
          >
            {t.icon && <span className="text-2xl">{t.icon}</span>}
            <span>
              <span className="block font-display font-semibold">{t.title}</span>
              {t.body && <span className="block text-sm opacity-80">{t.body}</span>}
            </span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function CelebrationOverlay() {
  const { celebration, clearCelebration } = useGame();
  return (
    <AnimatePresence>
      {celebration && (
        <motion.div className="fixed inset-0 z-[60] grid place-items-center bg-navy-950/60 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={clearCelebration} role="alertdialog" aria-label={celebration.title}>
          <motion.div initial={{ scale: 0.5, rotate: -6 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 14 }} className="panel relative w-full max-w-sm overflow-hidden p-8 text-center">
            <Confetti />
            <div className="mx-auto mb-3 grid h-24 w-24 place-items-center rounded-3xl bg-gradient-to-b from-gold-300 to-gold-500 text-5xl shadow-pop">{celebration.kind === "rank" ? "🎖️" : "⭐"}</div>
            <h2 className="font-display text-3xl font-bold text-navy-900">{celebration.title}</h2>
            <p className="mt-2 text-navy-700">{celebration.body}</p>
            <button className="btn btn-primary mt-6" onClick={clearCelebration} autoFocus>
              Continue
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Confetti({ count = 26 }: { count?: number }) {
  const colors = ["#f7c552", "#4da3e0", "#e5484d", "#12a594", "#8e4ec6", "#73b25f"];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute block h-2.5 w-1.5 rounded-sm"
          style={{ background: colors[i % colors.length], left: `${(i * 37) % 100}%`, top: -10 }}
          initial={{ y: -20, rotate: 0, opacity: 1 }}
          animate={{ y: 420, rotate: 360 + i * 40, opacity: 0 }}
          transition={{ duration: 1.6 + (i % 5) * 0.25, delay: (i % 7) * 0.05, ease: "easeIn" }}
        />
      ))}
    </div>
  );
}

export function SectionPanel({ title, subtitle, children, actions }: { title: string; subtitle?: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      className="panel pointer-events-auto mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden"
      aria-label={title}
    >
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-parchment-200 bg-gradient-to-b from-parchment-100 to-parchment-50 px-5 pb-4 pt-5 sm:px-7">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900 sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-navy-700/80">{subtitle}</p>}
        </div>
        {actions}
      </header>
      <div className="scroll-thin flex-1 overflow-y-auto px-5 py-5 sm:px-7">{children}</div>
    </motion.section>
  );
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

export const fmtDate = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
export const fmtDay = (iso: string) => new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
