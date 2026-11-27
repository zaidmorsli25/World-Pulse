"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { levelFromXp } from "@/lib/game/progression";
import { CATEGORIES, TIERS, type Category, type Tier } from "@/lib/types";
import { BriefingModal } from "../briefing/BriefingModal";
import { FigureModal } from "../figures/FigureModal";
import { CountryPanel } from "../map/CountryPanel";
import { MapToolbar } from "../map/MapToolbar";
import { WorldMap } from "../map/WorldMap";
import { AchievementsSection } from "../sections/Achievements";
import { DailyBriefingSection } from "../sections/DailyBriefing";
import { FiguresSection } from "../sections/Figures";
import { HeadquartersSection } from "../sections/Headquarters";
import { ProfileSection } from "../sections/Profile";
import { SettingsSection } from "../sections/Settings";
import { ShopSection } from "../sections/Shop";
import { AvatarFigure } from "../ui/Avatar";
import { CelebrationOverlay, CoinAmount, timeAgo, Toasts, XpAmount, XPBar } from "../ui/bits";
import { NavIcon } from "../ui/icons";
import { useGame, type Section } from "./GameProvider";
import { WelcomeIntro } from "./WelcomeIntro";

export interface Filters {
  categories: Set<Category>;
  tiers: Set<Tier>;
  regions: Set<string>;
  status: "all" | "unread" | "completed";
}

const NAV: { id: Section; label: string; icon: keyof typeof NavIcon }[] = [
  { id: "map", label: "World Map", icon: "map" },
  { id: "briefing", label: "Daily Briefing", icon: "briefing" },
  { id: "figures", label: "Political Figures", icon: "figures" },
  { id: "hq", label: "Headquarters", icon: "hq" },
  { id: "shop", label: "Shop", icon: "shop" },
  { id: "achievements", label: "Achievements", icon: "achievements" },
  { id: "profile", label: "Profile", icon: "profile" },
  { id: "settings", label: "Settings", icon: "settings" },
];

export function GameShell() {
  const g = useGame();
  const { player, news, section, go, settings } = g;
  const [filters, setFilters] = useState<Filters>({ categories: new Set(CATEGORIES), tiers: new Set(TIERS), regions: new Set(), status: "all" });
  const [regionFocus, setRegionFocus] = useState<{ region: string; nonce: number } | null>(null);
  const info = levelFromXp(player.xp);

  const completed = useMemo(() => new Set(Object.keys(player.quizRecords)), [player.quizRecords]);
  const events = useMemo(
    () =>
      (news?.events ?? []).filter(
        (e) =>
          filters.categories.has(e.category) &&
          filters.tiers.has(e.importance.tier) &&
          (filters.regions.size === 0 || filters.regions.has(e.region)) &&
          (filters.status === "all" || (filters.status === "completed" ? completed.has(e.quizId) : !completed.has(e.quizId))),
      ),
    [news, filters, completed],
  );
  const unread = (news?.events ?? []).filter((e) => !completed.has(e.quizId)).length;

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <WorldMap
        events={events}
        completed={completed}
        selectedCountry={g.countryId}
        onCountry={(id) => g.openCountry(id)}
        onEvent={(id) => g.openEvent(id)}
        focus={g.focusCountry}
        regionFocus={regionFocus}
        showLabels={settings.showLabels}
        showGraticule={settings.showGraticule}
      />

      {/* ---------------- HUD ---------------- */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-2 sm:p-3">
        <button onClick={() => go("profile")} className="hud-pill pointer-events-auto !gap-3 !py-1.5 !pl-1.5 !pr-4 text-left transition hover:brightness-110" aria-label="Open profile">
          <AvatarFigure avatar={player.avatar} equipped={player.equipped} size={46} />
          <span className="min-w-0">
            <span className="block max-w-[9rem] truncate font-display text-sm font-semibold leading-tight sm:text-base">{player.username}</span>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-gold-300 sm:text-xs">
              {info.rank.icon} {info.rank.name} · Lv {info.level}
            </span>
            <span className="mt-1 block">
              <XPBar xp={player.xp} compact />
            </span>
          </span>
        </button>

        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
          <span className={`hud-pill hidden !py-1 text-xs font-semibold md:flex ${news?.mode === "demo" ? "!bg-[#5a3d06]/85" : ""}`} title={news?.updatedAt ? `Last news update: ${new Date(news.updatedAt).toLocaleString()}` : undefined}>
            <span className={`h-2 w-2 rounded-full ${news?.mode === "live" ? "bg-land-400" : "bg-gold-400"}`} />
            {news?.mode === "live" ? "Live news" : "Demo scenarios"} · updated {timeAgo(news?.updatedAt ?? null)}
          </span>
          <span className="hud-pill" title={`Daily streak: ${player.streak.count} days (best ${player.streak.best}). Streak shields: ${player.streak.shields}`}>
            <span className="text-[#ff8a3d]">
              <NavIcon.flame size={18} />
            </span>
            <span className="font-display font-semibold">{player.streak.count}</span>
          </span>
          <button className="hud-pill hidden transition hover:brightness-110 sm:flex" onClick={() => go("profile")} aria-label={`${player.xp} XP. Open profile`}>
            <XpAmount value={player.xp} />
          </button>
          <button className="hud-pill transition hover:brightness-110" onClick={() => go("shop")} aria-label={`${player.coins} coins. Open shop`}>
            <CoinAmount value={player.coins} />
          </button>
        </div>
      </div>

      {section === "map" && (
        <MapToolbar
          filters={filters}
          setFilters={setFilters}
          onRegion={(region) => setRegionFocus({ region, nonce: Date.now() })}
          shown={events.length}
          total={news?.events.length ?? 0}
        />
      )}

      {news?.mode === "demo" && section === "map" && (
        <div className="pointer-events-none absolute bottom-24 left-1/2 z-10 -translate-x-1/2 sm:bottom-5">
          <div className="rounded-full bg-navy-950/80 px-4 py-1.5 text-center text-xs font-semibold text-gold-300 shadow-game">Demo mode: markers show fictional, illustrative scenarios, not real news.</div>
        </div>
      )}
      {g.newsError && (
        <div className="absolute bottom-36 left-1/2 z-20 -translate-x-1/2">
          <button className="hud-pill text-sm" onClick={g.reloadNews}>
            ⚠️ News could not load. Tap to retry.
          </button>
        </div>
      )}

      {/* ---------------- Navigation ---------------- */}
      <nav aria-label="Main" className="absolute bottom-0 left-0 right-0 z-30 flex justify-around gap-1 bg-navy-900/90 px-1 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5 backdrop-blur sm:bottom-auto sm:left-3 sm:right-auto sm:top-1/2 sm:-translate-y-1/2 sm:flex-col sm:rounded-3xl sm:p-2 sm:shadow-game">
        {NAV.map((n) => {
          const Icon = NavIcon[n.icon];
          const active = section === n.id;
          return (
            <button
              key={n.id}
              onClick={() => go(n.id)}
              aria-current={active ? "page" : undefined}
              className={`group relative grid h-12 w-11 place-items-center rounded-2xl transition sm:h-12 sm:w-12 ${active ? "bg-gold-400 text-navy-900 shadow-pop" : "text-white/80 hover:bg-white/10 hover:text-white"}`}
            >
              <Icon size={24} />
              <span className="sr-only">{n.label}</span>
              {n.id === "briefing" && unread > 0 && <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#e5484d] px-1 text-[10px] font-bold text-white">{unread}</span>}
              <span className="pointer-events-none absolute left-full ml-3 hidden whitespace-nowrap rounded-lg bg-navy-900 px-2 py-1 text-xs font-semibold text-white opacity-0 shadow-game transition group-hover:opacity-100 sm:block">{n.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ---------------- Section overlays ---------------- */}
      <AnimatePresence>
        {section !== "map" && (
          <motion.div key="overlay" className="absolute inset-0 z-20 bg-navy-950/45 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => go("map")} />
        )}
      </AnimatePresence>
      {section !== "map" && (
        <div className="pointer-events-none absolute inset-0 z-20 px-2 pb-[76px] pt-[78px] sm:pb-4 sm:pl-24 sm:pr-4 sm:pt-[86px]">
          {section === "briefing" && <DailyBriefingSection />}
          {section === "figures" && <FiguresSection />}
          {section === "hq" && <HeadquartersSection />}
          {section === "shop" && <ShopSection />}
          {section === "achievements" && <AchievementsSection />}
          {section === "profile" && <ProfileSection />}
          {section === "settings" && <SettingsSection />}
        </div>
      )}

      {section === "map" && <CountryPanel />}
      <BriefingModal />
      <FigureModal />
      <Toasts />
      <CelebrationOverlay />
      <WelcomeIntro />
    </div>
  );
}
