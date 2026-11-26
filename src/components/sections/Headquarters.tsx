"use client";
import { useState } from "react";
import { CATALOG, MAX_DISPLAY, RARITY_STYLE, SLOT_LABEL } from "@/lib/game/catalog";
import type { Slot } from "@/lib/types";
import { useGame } from "../game/GameProvider";
import { HQScene, ItemThumb } from "../hq/HQScene";
import { SectionPanel } from "../ui/bits";
import { sound } from "@/lib/client/sound";

const SLOTS: Slot[] = ["background", "desk", "wallmap", "monitor", "bookshelf", "flag", "globe", "display", "outfit", "headwear", "accessory"];
const OPTIONAL: Slot[] = ["headwear", "accessory", "wallmap", "monitor", "bookshelf", "flag", "globe"];

export function HeadquartersSection() {
  const { player, backend, run, go } = useGame();
  const [slot, setSlot] = useState<Slot>("background");
  const [busy, setBusy] = useState(false);
  const owned = CATALOG.filter((i) => i.slot === slot && player.inventory.includes(i.id));
  const shelf = player.equipped.display ?? [];
  const current = slot === "display" ? null : (player.equipped as Record<string, string | undefined>)[slot];

  const equip = async (id: string | null) => {
    if (busy) return;
    setBusy(true);
    const r = await run(backend.equip(slot, id));
    if (r) sound.play("click");
    setBusy(false);
  };

  return (
    <SectionPanel
      title="Headquarters"
      subtitle="Your personal office. Decorate it with items from the shop and rewards from promotions."
      actions={
        <button className="btn btn-primary" onClick={() => go("shop")}>
          Visit shop
        </button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <HQScene player={player} />
        <div>
          <h2 className="mb-2 font-display text-lg font-bold text-navy-900">Customize</h2>
          <div className="mb-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Item slot">
            {SLOTS.map((s) => (
              <button key={s} role="tab" aria-selected={slot === s} onClick={() => setSlot(s)} className={`rounded-xl px-2.5 py-1 text-sm font-semibold transition ${slot === s ? "bg-navy-800 text-white" : "bg-parchment-100 text-navy-700 hover:bg-parchment-200"}`}>
                {SLOT_LABEL[s]}
              </button>
            ))}
          </div>
          {slot === "display" && (
            <p className="mb-2 text-sm text-navy-700/80">
              Display shelf: {shelf.length} of {MAX_DISPLAY} spaces used. Collectibles are cosmetic only.
            </p>
          )}
          {owned.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-parchment-200 p-6 text-center text-sm text-navy-700/80">
              You don&apos;t own any {SLOT_LABEL[slot].toLowerCase()} yet.{" "}
              <button className="font-semibold text-ocean-700 hover:underline" onClick={() => go("shop")}>
                Browse the shop
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {owned.map((it) => {
                const on = slot === "display" ? shelf.includes(it.id) : current === it.id;
                return (
                  <button
                    key={it.id}
                    disabled={busy}
                    onClick={() => equip(slot === "display" ? it.id : on && OPTIONAL.includes(slot) ? null : it.id)}
                    aria-pressed={on}
                    className={`relative flex flex-col items-center rounded-2xl border-2 bg-white p-2 text-center transition hover:-translate-y-0.5 ${on ? "border-gold-400 shadow-pop" : "border-parchment-200"}`}
                    style={{ boxShadow: on ? `0 0 0 3px ${RARITY_STYLE[it.rarity].glow}` : undefined }}
                  >
                    <ItemThumb item={it} size={72} avatar={player.avatar} />
                    <span className="mt-1 text-xs font-semibold leading-tight text-navy-900">{it.name}</span>
                    {on && <span className="absolute right-1.5 top-1.5 rounded-full bg-gold-400 px-1.5 text-[10px] font-bold text-navy-900">{slot === "display" ? "ON SHELF" : "IN USE"}</span>}
                  </button>
                );
              })}
            </div>
          )}
          {current && OPTIONAL.includes(slot) && (
            <button className="mt-3 text-sm font-semibold text-ocean-700 hover:underline" disabled={busy} onClick={() => equip(null)}>
              Remove {SLOT_LABEL[slot].toLowerCase()} from HQ
            </button>
          )}
        </div>
      </div>
    </SectionPanel>
  );
}
