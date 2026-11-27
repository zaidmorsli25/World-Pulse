"use client";
// A short 4-step introduction shown once per player on this device.
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { REWARDS } from "@/lib/config";
import { TIER_LABEL, TIER_SIZE } from "../map/Markers";
import { Modal } from "../ui/Modal";
import { Coin, XpIcon } from "../ui/icons";
import { BriefingArt, HQArt, MarkersArt, WelcomeArt } from "./IntroArt";
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
      art: <WelcomeArt />,
    },
    {
      title: "Mission markers",
      body: (
        <>
          <p>Each square marker on the map is a developing story. The symbol shows its category, and bigger markers mean bigger stories.</p>
          <p className="mt-2">Click a country to see its capital, leaders, relationships and active news.</p>
        </>
      ),
      art: <MarkersArt tiers={(["minor", "notable", "significant", "major", "global"] as const).map((t) => ({ label: TIER_LABEL[t], size: TIER_SIZE[t] }))} />,
    },
    {
      title: "Briefings and quizzes",
      body: (
        <>
          <p>Open a marker for a 2 to 4 minute briefing with links to the original reporting. Then take a short quiz.</p>
          <p className="mt-2">
            Each correct answer earns{" "}
            <span className="inline-flex items-center gap-1 whitespace-nowrap align-[-2px] font-semibold">
              <Coin size={15} /> {REWARDS.coinsPerCorrect} coins
            </span>{" "}
            and{" "}
            <span className="inline-flex items-center gap-1 whitespace-nowrap align-[-2px] font-semibold">
              <XpIcon size={16} /> {REWARDS.xpPerCorrect} XP
            </span>
            . A perfect score adds a bonus of{" "}
            <span className="inline-flex items-center gap-1 whitespace-nowrap align-[-2px] font-semibold">
              <Coin size={15} /> {REWARDS.perfectBonusCoins}
            </span>
            .
          </p>
        </>
      ),
      art: <BriefingArt />,
    },
    {
      title: "Build your headquarters",
      body: (
        <>
          <p>Spend coins in the shop on outfits, office upgrades and collectible models. Promotions unlock new items and free rewards.</p>
          {news?.mode === "demo" && <p className="mt-2 rounded-xl bg-gold-300/30 px-3 py-2 text-sm">Live news isn&apos;t connected right now, so the map shows clearly labelled fictional demo scenarios.</p>}
        </>
      ),
      art: <HQArt />,
    },
  ];
  const s = steps[step];
  const last = step === steps.length - 1;

  return (
    <Modal open={open} onClose={close} label="Welcome to WorldPulse">
      <div className="p-6 text-navy-900 sm:p-8">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
            <div className="mb-4 aspect-[36/17] w-full overflow-hidden rounded-2xl bg-navy-900 ring-1 ring-navy-900/10">{s.art}</div>
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
            {step > 0 ? (
              <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>
                Back
              </button>
            ) : (
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
