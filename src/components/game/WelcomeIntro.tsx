"use client";
// A short four-step introduction shown once per player on this device.
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { REWARDS } from "@/lib/config";
import { CATEGORIES } from "@/lib/types";
import { TIER_LABEL, TIER_SIZE } from "../map/Markers";
import { Modal } from "../ui/Modal";
import { CategoryIcon, CATEGORY_META, Coin } from "../ui/icons";
import { useGame } from "./GameProvider";

const key = (userId: string) => `worldpulse-intro-${userId}`;

export function WelcomeIntro() {
  const { player, news } = useGame();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(key(player.userId)) && player.stats.quizzesCompleted === 0) setOpen(true);
    } catch {
      /* storage unavailable: skip the intro rather than show it every time */
    }
  }, [player.userId, player.stats.quizzesCompleted]);

  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(key(player.userId), "1");
    } catch {
      /* ignore */
    }
  };

  const steps = [
    {
      title: `Welcome to WorldPulse, ${player.username}`,
      body: (
        <>
          <p>You are a new recruit at a global intelligence agency. Your job: understand what is happening in the world, and why it matters.</p>
          <p className="mt-2">Read short briefings, answer quick questions, earn coins and XP, and climb from Recruit to Global Strategist.</p>
        </>
      ),
      art: <div className="text-7xl">🌍</div>,
    },
    {
      title: "Mission markers",
      body: (
        <>
          <p>Each square marker on the map is a developing story. The symbol shows its category, and bigger markers mean bigger stories.</p>
          <p className="mt-2">Click a country to see its capital, leaders, relationships and active news.</p>
        </>
      ),
      art: (
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-end gap-2">
            {(["minor", "notable", "significant", "major", "global"] as const).map((t, i) => (
              <div key={t} className="flex flex-col items-center gap-1">
                <span className="grid place-items-center rounded-xl text-white shadow-game ring-2 ring-white" style={{ width: TIER_SIZE[t], height: TIER_SIZE[t], background: CATEGORY_META[CATEGORIES[i]].color }}>
                  <CategoryIcon category={CATEGORIES[i]} size={TIER_SIZE[t] * 0.55} />
                </span>
                <span className="text-[10px] font-semibold text-navy-700">{TIER_LABEL[t]}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: "Briefings and quizzes",
      body: (
        <>
          <p>Open a marker for a two-to-four minute briefing with links to the original reporting. Then take a short quiz.</p>
          <p className="mt-2 flex flex-wrap items-center gap-1">
            Each correct answer earns <Coin size={14} /> {REWARDS.coinsPerCorrect} and {REWARDS.xpPerCorrect} XP. A perfect score adds a bonus of <Coin size={14} /> {REWARDS.perfectBonusCoins}.
          </p>
        </>
      ),
      art: <div className="text-7xl">📰</div>,
    },
    {
      title: "Build your headquarters",
      body: (
        <>
          <p>Spend coins in the shop on outfits, office upgrades and collectible models. Promotions unlock new items and free rewards. Everything is cosmetic, and there is no real money.</p>
          {news?.mode === "demo" && <p className="mt-2 rounded-xl bg-gold-300/30 px-3 py-2 text-sm">Live news isn&apos;t connected right now, so the map shows clearly labelled fictional demo scenarios.</p>}
        </>
      ),
      art: <div className="text-7xl">🏛️</div>,
    },
  ];
  const s = steps[step];
  const last = step === steps.length - 1;

  return (
    <Modal open={open} onClose={close} label="Welcome to WorldPulse">
      <div className="p-6 text-navy-900 sm:p-8">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
            <div className="mb-4 grid h-32 place-items-center rounded-2xl bg-gradient-to-br from-ocean-400/20 to-land-400/20">{s.art}</div>
            <h2 className="font-display text-2xl font-bold">{s.title}</h2>
            <div className="mt-2 text-navy-800">{s.body}</div>
          </motion.div>
        </AnimatePresence>
        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="flex gap-1.5" aria-label={`Step ${step + 1} of ${steps.length}`}>
            {steps.map((_, i) => (
              <span key={i} className={`h-2 rounded-full transition-all ${i === step ? "w-6 bg-gold-400" : "w-2 bg-parchment-200"}`} />
            ))}
          </div>
          <div className="flex gap-2">
            {!last && (
              <button className="btn btn-ghost" onClick={close}>
                Skip
              </button>
            )}
            <button className="btn btn-primary" onClick={() => (last ? close() : setStep(step + 1))}>
              {last ? "Start exploring" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
