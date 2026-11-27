"use client";
import { useEffect, useState } from "react";
import { sound } from "./sound";

export interface Settings {
  sfxOn: boolean;
  musicOn: boolean;
  sfxVolume: number;
  musicVolume: number;
  motion: "system" | "reduced" | "full";
  showLabels: boolean;
  showGraticule: boolean;
  /** keep trend lines on the map without hovering a marker */
  trendLinesAlways: boolean;
}

export const DEFAULT_SETTINGS: Settings = { sfxOn: true, musicOn: false, sfxVolume: 0.6, musicVolume: 0.35, motion: "system", showLabels: true, showGraticule: true, trendLinesAlways: false };
const KEY = "worldpulse-settings";

/** Per-device preferences (audio, motion, map display). Stored in localStorage when available. */
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
    } catch {
      /* storage unavailable */
    }
  }, []);
  useEffect(() => {
    sound.configure(settings);
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
    const reduce = settings.motion === "reduced" || (settings.motion === "system" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
    document.documentElement.classList.toggle("reduce-motion", !!reduce);
  }, [settings]);
  return [settings, (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }))] as const;
}

export function prefersReducedMotion(): boolean {
  return typeof document !== "undefined" && document.documentElement.classList.contains("reduce-motion");
}
