"use client";
import { useState } from "react";
import { RANKS } from "@/lib/config";
import { CATALOG, RARITY_STYLE, SLOT_LABEL, type ShopItem } from "@/lib/game/catalog";
import { levelFromXp } from "@/lib/game/progression";
import { sound } from "@/lib/client/sound";
import { RARITIES, type Slot } from "@/lib/types";
import { useGame } from "../game/GameProvider";
import { ItemThumb } from "../hq/HQScene";
import { CoinAmount, RarityBadge, SectionPanel } from "../ui/bits";
import { Coin } from "../ui/icons";

const TABS: { id: string; label: string; slots: Slot[] }[] = [
  { id: "style", label: "Style", slots: ["outfit", "headwear", "accessory"] },
  { id: "office", label: "Office", slots: ["background", "desk", "wallmap", "monitor", "bookshelf", "flag", "globe"] },
  { id: "building", label: "Building", slots: ["room"] },
  { id: "display", label: "Collectibles", slots: ["display"] },
];

export function ShopSection() {
  const { player, backend, run, toast, go } = useGame();
  const [tab, setTab] = useState("style");
  const [busy, setBusy] = useState<string | null>(null);
  const rank = levelFromXp(player.xp).rankIndex;
  const slots = TABS.find((t) => t.id === tab)!.slots;
  const items = CATALOG.filter((i) => slots.includes(i.slot)).sort((a, b) => slots.indexOf(a.slot) - slots.indexOf(b.slot) || RARITIES.indexOf(a.rarity) - RARITIES.indexOf(b.rarity) || a.price - b.price);

  const buy = async (it: ShopItem) => {
    setBusy(it.id);
    const r = await run(backend.buy(it.id));
    if (r) {
      sound.play("purchase");
      toast({ kind: "coins", title: `Purchased ${it.name}`, body: it.slot === "display" ? "Put it on your display shelf in Headquarters." : it.slot === "room" ? "A new floor is open in your Headquarters." : "Equip it from Headquarters.", icon: "🛍️" });
    }
    setBusy(null);
  };
  const equip = async (it: ShopItem) => {
    setBusy(it.id);
    await run(backend.equip(it.slot, it.id));
    setBusy(null);
  };

  return (
    <SectionPanel
      title="Shop"
      subtitle="Spend coins earned from briefings on outfits, office upgrades and collectibles."
      actions={
        <span className="hud-pill !text-base">
          <CoinAmount value={player.coins} />
        </span>
      }
    >
      <div className="mb-4 grid max-w-xl grid-cols-2 sm:grid-cols-4 gap-1 rounded-2xl bg-parchment-200 p-1" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`rounded-xl py-1.5 text-sm font-semibold ${tab === t.id ? "bg-white shadow" : "text-navy-700"}`}>
            {t.label}
          </button>
        ))}
      </div>
      {slots.map((slot) => (
        <section key={slot} className="mb-6">
          {slots.length > 1 && <h2 className="mb-2 font-display text-lg font-bold text-navy-900">{SLOT_LABEL[slot]}</h2>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items
              .filter((i) => i.slot === slot)
              .map((it) => {
                const owned = player.inventory.includes(it.id);
                const locked = rank < it.minRank;
                const equipped = it.slot === "display" ? (player.equipped.display ?? []).includes(it.id) : (player.equipped as Record<string, string | undefined>)[it.slot] === it.id;
                const affordable = player.coins >= it.price;
                const style = RARITY_STYLE[it.rarity];
                return (
                  <article key={it.id} className="relative flex flex-col overflow-hidden rounded-2xl border-2 bg-white" style={{ borderColor: style.color }}>
                    <div className="relative grid place-items-center py-3" style={{ background: `radial-gradient(circle at 50% 40%, ${style.glow}, transparent 70%)` }}>
                      <div className={locked && !owned ? "opacity-40 grayscale" : ""}>
                        <ItemThumb item={it} size={92} avatar={player.avatar} />
                      </div>
                      <span className="absolute left-2 top-2">
                        <RarityBadge rarity={it.rarity} />
                      </span>
                      {locked && !owned && <span className="absolute inset-x-2 bottom-1 rounded-lg bg-navy-900/80 px-2 py-0.5 text-center text-[11px] font-semibold text-white">🔒 {RANKS[it.minRank].name}</span>}
                    </div>
                    <div className="flex flex-1 flex-col gap-1 border-t border-parchment-200 p-3">
                      <h3 className="font-display font-bold leading-tight text-navy-900">{it.name}</h3>
                      <p className="flex-1 text-xs text-navy-700/80">{it.description}</p>
                      {owned && it.slot === "room" ? (
                        <button className="btn btn-blue mt-1 !py-1.5 text-sm" onClick={() => go("hq")}>
                          Go to the floor
                        </button>
                      ) : owned ? (
                        equipped ? (
                          <span className="btn btn-ghost mt-1 !py-1.5 text-sm">✓ {it.slot === "display" ? "On shelf" : "Equipped"}</span>
                        ) : (
                          <button className="btn btn-blue mt-1 !py-1.5 text-sm" disabled={busy === it.id} onClick={() => equip(it)}>
                            {it.slot === "display" ? "Put on shelf" : "Equip"}
                          </button>
                        )
                      ) : it.rankReward ? (
                        <span className="mt-1 rounded-xl bg-parchment-100 px-2 py-1.5 text-center text-xs font-semibold text-navy-700">Rank reward: reach {RANKS[it.minRank].name}</span>
                      ) : (
                        <button
                          className="btn btn-primary mt-1 !py-1.5 text-sm"
                          disabled={locked || !affordable || busy === it.id}
                          onClick={() => buy(it)}
                          title={locked ? `Unlocks at ${RANKS[it.minRank].name}` : !affordable ? "Not enough coins yet" : undefined}
                        >
                          <Coin size={16} /> {it.price.toLocaleString()}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
          </div>
        </section>
      ))}
    </SectionPanel>
  );
}
