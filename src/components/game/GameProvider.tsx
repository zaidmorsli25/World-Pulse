"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ACHIEVEMENTS_BY_ID } from "@/lib/game/achievements";
import { getBackend, type Backend, type Me, type NewsPayload, type PlayerUpdate } from "@/lib/client/backend";
import { useSettings, type Settings } from "@/lib/client/settings";
import { sound } from "@/lib/client/sound";
import type { PublicTrend } from "@/lib/trends";
import type { GameEvents, NewsEvent, PlayerState } from "@/lib/types";

export type Section = "map" | "briefing" | "figures" | "hq" | "shop" | "achievements" | "profile" | "settings";
export const SECTIONS: Section[] = ["map", "briefing", "figures", "hq", "shop", "achievements", "profile", "settings"];

export interface Toast {
  id: number;
  kind: "info" | "error" | "coins" | "achievement";
  title: string;
  body?: string;
  icon?: string;
}

export interface Celebration {
  kind: "level" | "rank";
  title: string;
  body: string;
}

interface Ctx {
  backend: Backend;
  me: Me;
  player: PlayerState;
  news: NewsPayload | null;
  newsError: string | null;
  settings: Settings;
  setSettings: (p: Partial<Settings>) => void;
  section: Section;
  go: (s: Section) => void;
  openEventId: string | null;
  openEvent: (id: string | null) => void;
  countryId: string | null;
  openCountry: (id: string | null) => void;
  figureId: string | null;
  openFigure: (id: string | null) => void;
  focusCountry: { id: string; nonce: number } | null;
  flyToCountry: (id: string) => void;
  apply: (u: PlayerUpdate) => void;
  run: <T extends PlayerUpdate>(p: Promise<T>) => Promise<T | null>;
  toast: (t: Omit<Toast, "id">) => void;
  toasts: Toast[];
  dismissToast: (id: number) => void;
  celebration: Celebration | null;
  clearCelebration: () => void;
  eventsById: Map<string, NewsEvent>;
  /** approved trends players can see */
  trends: PublicTrend[];
  /** the trend picked in the lens (chip row), if any */
  lensTrendId: string | null;
  setLensTrend: (id: string | null) => void;
  /** the trend whose big-picture briefing is open */
  bigPictureId: string | null;
  openBigPicture: (id: string | null) => void;
  /** the trend book open from the HQ library */
  bookId: string | null;
  openBook: (id: string | null) => void;
  logout: () => Promise<void>;
  reloadNews: () => void;
}

const GameCtx = createContext<Ctx | null>(null);
export const useGame = () => {
  const c = useContext(GameCtx);
  if (!c) throw new Error("useGame outside provider");
  return c;
};

function readHash(): Section {
  if (typeof window === "undefined") return "map";
  const h = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  return (SECTIONS as string[]).includes(h) ? (h as Section) : "map";
}

export function GameProvider({ backend, initial, onLogout, children }: { backend: Backend; initial: Me; onLogout: () => void; children: React.ReactNode }) {
  const [me, setMe] = useState(initial);
  const [news, setNews] = useState<NewsPayload | null>(null);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [settings, setSettings] = useSettings();
  const [section, setSection] = useState<Section>("map");
  const [openEventId, setOpenEventId] = useState<string | null>(null);
  const [countryId, setCountryId] = useState<string | null>(null);
  const [figureId, setFigureId] = useState<string | null>(null);
  const [focusCountry, setFocusCountry] = useState<{ id: string; nonce: number } | null>(null);
  const [lensTrendId, setLensTrendId] = useState<string | null>(null);
  const [bigPictureId, setBigPictureId] = useState<string | null>(null);
  const [bookId, setBookId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const toastId = useRef(0);

  useEffect(() => {
    setSection(readHash());
    const onHash = () => setSection(readHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const reloadNews = useCallback(() => {
    setNewsError(null);
    getBackend()
      .then((b) => b.news())
      .then(setNews)
      .catch((e) => setNewsError(e.message ?? "Could not load news."));
  }, []);
  useEffect(() => {
    reloadNews();
    const t = setInterval(reloadNews, 10 * 60_000);
    return () => clearInterval(t);
  }, [reloadNews]);

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = ++toastId.current;
    setToasts((ts) => [...ts.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), t.kind === "error" ? 6000 : 4200);
  }, []);

  const celebrate = useCallback(
    (ev: GameEvents) => {
      for (const id of ev.achievements) {
        const a = ACHIEVEMENTS_BY_ID.get(id);
        if (a) {
          toast({ kind: "achievement", title: `Achievement unlocked: ${a.name}`, body: `+${a.coins} coins · +${a.xp} XP`, icon: a.icon });
          sound.play("achievement");
        }
      }
      if (ev.rankUp) {
        setCelebration({ kind: "rank", title: `Promoted to ${ev.rankUp.to}!`, body: "New cosmetics and headquarters upgrades are now available." });
        sound.play("levelup");
      } else if (ev.levelUp) {
        setCelebration({ kind: "level", title: `Level ${ev.levelUp.to}!`, body: "Your expertise in world affairs is growing." });
        sound.play("levelup");
      }
    },
    [toast],
  );

  useEffect(() => {
    if (initial.events.coins > 0) toast({ kind: "coins", title: `Daily streak bonus`, body: `+${initial.events.coins} coins. Welcome back!`, icon: "🔥" });
    celebrate(initial.events);
  }, [initial, celebrate, toast]);

  const apply = useCallback(
    (u: PlayerUpdate) => {
      setMe((m) => ({ ...m, player: u.player }));
      celebrate(u.events);
    },
    [celebrate],
  );

  const run = useCallback(
    async <T extends PlayerUpdate>(p: Promise<T>): Promise<T | null> => {
      try {
        const r = await p;
        apply(r);
        return r;
      } catch (e) {
        const err = e as { message?: string; status?: number };
        if (err.status === 401) onLogout();
        toast({ kind: "error", title: err.message ?? "Something went wrong." });
        return null;
      }
    },
    [apply, toast, onLogout],
  );

  const go = useCallback((s: Section) => {
    sound.play("click");
    window.location.hash = s === "map" ? "/map" : `/${s}`;
    setSection(s);
  }, []);

  const eventsById = useMemo(() => new Map((news?.events ?? []).map((e) => [e.id, e])), [news]);
  const trends = useMemo(() => news?.trends ?? [], [news]);

  const value: Ctx = {
    backend,
    me,
    player: me.player,
    news,
    newsError,
    settings,
    setSettings,
    section,
    go,
    openEventId,
    openEvent: (id) => {
      if (id) sound.play("open");
      setOpenEventId(id);
    },
    countryId,
    openCountry: (id) => {
      setCountryId(id);
      if (id) {
        setFigureId(null);
        void run(backend.explore(id));
      }
    },
    figureId,
    openFigure: (id) => {
      setFigureId(id);
      if (id) {
        sound.play("open");
        void run(backend.viewFigure(id));
      }
    },
    focusCountry,
    flyToCountry: (id) => {
      setFocusCountry({ id, nonce: Date.now() });
      if (section !== "map") go("map");
    },
    apply,
    run,
    toast,
    toasts,
    dismissToast: (id) => setToasts((ts) => ts.filter((t) => t.id !== id)),
    celebration,
    clearCelebration: () => setCelebration(null),
    eventsById,
    trends,
    lensTrendId,
    setLensTrend: (id) => {
      sound.play("click");
      setLensTrendId(id);
    },
    bigPictureId,
    openBigPicture: (id) => {
      if (id) sound.play("open");
      setBigPictureId(id);
    },
    bookId,
    openBook: (id) => {
      if (id) sound.play("open");
      setBookId(id);
    },
    logout: async () => {
      await backend.logout().catch(() => {});
      onLogout();
    },
    reloadNews,
  };
  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}
