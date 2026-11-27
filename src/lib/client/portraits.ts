"use client";
import { useEffect, useState } from "react";

export interface Portrait {
  url: string;
  credit: string;
  license: string;
  source: string;
}

let cache: Record<string, Portrait> | null = null;
let pending: Promise<Record<string, Portrait>> | null = null;
const listeners = new Set<(p: Record<string, Portrait>) => void>();

function load() {
  if (!pending)
    pending = fetch("/api/figures/portraits")
      .then((r) => (r.ok ? r.json() : { portraits: {} }))
      .then((d: { portraits?: Record<string, Portrait> }) => (cache = d.portraits ?? {}))
      .catch(() => (cache = {}))
      .then((c) => {
        listeners.forEach((l) => l(c));
        return c;
      });
  return pending;
}

/** Licensed portrait for a political figure, or undefined while loading / when none is available. */
export function usePortrait(id: string | undefined): Portrait | undefined {
  const [map, setMap] = useState(cache);
  useEffect(() => {
    if (cache) return;
    listeners.add(setMap);
    void load();
    return () => {
      listeners.delete(setMap);
    };
  }, []);
  return id && map ? map[id] : undefined;
}
