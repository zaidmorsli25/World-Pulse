"use client";
import { useMemo, useState } from "react";
import { CATALOG_BY_ID } from "@/lib/game/catalog";
import { AVATAR_LIMITS } from "@/lib/game/avatarOptions";
import { sound } from "@/lib/client/sound";
import type { AvatarConfig, Slot } from "@/lib/types";
import { useGame } from "../game/GameProvider";
import { AvatarFigure, BACKDROPS, BROWS, DETAILS, EYE_COLORS, EYES, FACE_SHAPES, FACIAL_HAIR, fullAvatar, GLASSES, HAIR_COLORS, HAIR_STYLES, MOUTHS, SKIN } from "../ui/Avatar";
import { Modal } from "../ui/Modal";

type Key = keyof typeof AVATAR_LIMITS;
const TABS = ["Face", "Hair", "Extras", "Wardrobe"] as const;
type Tab = (typeof TABS)[number];

function Swatches({ label, colors, value, onPick }: { label: string; colors: string[]; value: number; onPick: (i: number) => void }) {
  return (
    <fieldset className="mb-5">
      <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-navy-700/70">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {colors.map((c, i) => (
          <button key={c} onClick={() => onPick(i)} aria-label={`${label} ${i + 1}`} aria-pressed={value === i} className={`h-9 w-9 rounded-full ring-offset-2 transition ${value === i ? "ring-4 ring-gold-400" : "ring-2 ring-white shadow hover:scale-110"}`} style={{ background: c }} />
        ))}
      </div>
    </fieldset>
  );
}

/** A row of picture tiles: each tile shows the avatar wearing that option. */
function Tiles({ label, names, k, draft, set, equipped, crop = "face" }: { label: string; names: string[]; k: Key; draft: AvatarConfig; set: (k: Key, v: number) => void; equipped: Parameters<typeof AvatarFigure>[0]["equipped"]; crop?: "face" | "head" | "full" }) {
  const value = fullAvatar(draft)[k];
  return (
    <fieldset className="mb-5">
      <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-navy-700/70">{label}</legend>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-2">
        {names.map((n, i) => (
          <button key={n} onClick={() => set(k, i)} aria-pressed={value === i} className={`flex flex-col items-center gap-1 rounded-2xl border-2 bg-white p-1.5 transition hover:-translate-y-0.5 ${value === i ? "border-gold-400 shadow-pop" : "border-parchment-200"}`}>
            <span className="block overflow-hidden rounded-xl">
              <AvatarFigure avatar={{ ...draft, [k]: i }} equipped={{ outfit: equipped.outfit }} size={60} ring={false} crop={crop} />
            </span>
            <span className="text-[11px] font-semibold leading-tight text-navy-800">{n}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

const WEAR: { slot: Extract<Slot, "outfit" | "headwear" | "accessory">; label: string; optional: boolean }[] = [
  { slot: "outfit", label: "Outfit", optional: false },
  { slot: "headwear", label: "Headwear", optional: true },
  { slot: "accessory", label: "Accessory", optional: true },
];

/** The avatar editor: a screen of its own, opened from the profile. */
export function AvatarStudio({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} label="Customize avatar" wide className="md:h-[min(46rem,92dvh)]">
      {open && <Studio onClose={onClose} />}
    </Modal>
  );
}

function Studio({ onClose }: { onClose: () => void }) {
  const { player, backend, run, go } = useGame();
  const [draft, setDraft] = useState<AvatarConfig>(() => fullAvatar(player.avatar));
  const [tab, setTab] = useState<Tab>("Face");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(fullAvatar(draft)) !== JSON.stringify(fullAvatar(player.avatar));
  const set = (k: Key, v: number) => {
    sound.play("click");
    setDraft((d) => ({ ...d, [k]: v }));
  };
  const randomize = () => {
    sound.play("click");
    const r = (n: number) => Math.floor(Math.random() * n);
    const next = Object.fromEntries((Object.keys(AVATAR_LIMITS) as Key[]).map((k) => [k, r(AVATAR_LIMITS[k])])) as unknown as AvatarConfig;
    // keep it believable: most people have no glasses, beard or headscarf
    if (Math.random() < 0.6) next.glasses = 0;
    if (Math.random() < 0.55) next.facialHair = 0;
    if (Math.random() < 0.5) next.details = 0;
    if (next.hairColor! >= 8 && Math.random() < 0.7) next.hairColor = r(6);
    setDraft(next);
  };
  const save = async () => {
    setSaving(true);
    const r = await run(backend.updateAvatar(fullAvatar(draft)));
    setSaving(false);
    if (r) {
      sound.play("achievement");
      onClose();
    }
  };
  const equip = async (slot: Slot, id: string | null) => {
    if (busy) return;
    setBusy(true);
    await run(backend.equip(slot, id));
    setBusy(false);
  };
  const owned = useMemo(() => {
    const m: Record<string, string[]> = { outfit: [], headwear: [], accessory: [] };
    for (const id of player.inventory) {
      const it = CATALOG_BY_ID.get(id);
      if (it && it.slot in m) m[it.slot].push(id);
    }
    return m;
  }, [player.inventory]);

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <div className="flex shrink-0 flex-col items-center gap-3 bg-gradient-to-b from-ocean-500/15 to-parchment-100 px-5 pb-4 pt-6 md:w-[19rem] md:justify-center md:pb-6">
        <h2 className="font-display text-xl font-bold text-navy-900">Avatar studio</h2>
        <AvatarFigure avatar={draft} equipped={player.equipped} size={200} className="h-36 w-36 drop-shadow-lg md:h-52 md:w-52" />
        <div className="flex w-full max-w-xs gap-2">
          <button className="btn btn-ghost flex-1 !py-2 text-sm" onClick={randomize}>
            🎲 Surprise me
          </button>
          {dirty && (
            <button className="btn btn-ghost !py-2 text-sm" onClick={() => setDraft(fullAvatar(player.avatar))}>
              Undo
            </button>
          )}
        </div>
        <button className="btn btn-primary w-full max-w-xs" disabled={!dirty || saving} onClick={save}>
          {saving ? "Saving…" : dirty ? "Save avatar" : "Saved"}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div role="tablist" className="flex shrink-0 gap-1 border-b border-parchment-200 px-4 pt-3 sm:px-6">
          {TABS.map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded-t-xl px-3 py-2 text-sm font-bold transition ${tab === t ? "bg-white text-navy-900 shadow-[0_-2px_0_inset] shadow-gold-400" : "text-navy-700/70 hover:text-navy-900"}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {tab === "Face" && (
            <>
              <Swatches label="Skin tone" colors={SKIN} value={fullAvatar(draft).skin} onPick={(v) => set("skin", v)} />
              <Tiles label="Face shape" names={FACE_SHAPES} k="face" draft={draft} set={set} equipped={player.equipped} crop="head" />
              <Tiles label="Eyes" names={EYES} k="eyes" draft={draft} set={set} equipped={player.equipped} />
              <Swatches label="Eye colour (shows with almond and wide eyes)" colors={EYE_COLORS} value={fullAvatar(draft).eyeColor} onPick={(v) => set("eyeColor", v)} />
              <Tiles label="Eyebrows" names={BROWS} k="brows" draft={draft} set={set} equipped={player.equipped} />
              <Tiles label="Mouth" names={MOUTHS} k="mouth" draft={draft} set={set} equipped={player.equipped} />
            </>
          )}
          {tab === "Hair" && (
            <>
              <Tiles label="Hairstyle" names={HAIR_STYLES} k="hair" draft={draft} set={set} equipped={player.equipped} crop="head" />
              <Swatches label={fullAvatar(draft).hair === 11 ? "Headscarf colour" : "Hair colour"} colors={HAIR_COLORS} value={fullAvatar(draft).hairColor} onPick={(v) => set("hairColor", v)} />
            </>
          )}
          {tab === "Extras" && (
            <>
              <Tiles label="Facial hair" names={FACIAL_HAIR} k="facialHair" draft={draft} set={set} equipped={player.equipped} />
              <Tiles label="Glasses" names={GLASSES} k="glasses" draft={draft} set={set} equipped={player.equipped} />
              <Tiles label="Details" names={DETAILS} k="details" draft={draft} set={set} equipped={player.equipped} />
              <Swatches label="Background colour" colors={BACKDROPS} value={fullAvatar(draft).backdrop} onPick={(v) => set("backdrop", v)} />
            </>
          )}
          {tab === "Wardrobe" && (
            <>
              <p className="mb-4 text-sm text-navy-700/80">Clothes you own change straight away. Earn coins from quizzes to buy more in the shop.</p>
              {WEAR.map(({ slot, label, optional }) => {
                const current = player.equipped[slot];
                return (
                  <fieldset key={slot} className="mb-5">
                    <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-navy-700/70">{label}</legend>
                    {owned[slot].length === 0 ? (
                      <p className="text-sm text-navy-700/70">Nothing here yet.</p>
                    ) : (
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2">
                        {owned[slot].map((id) => {
                          const it = CATALOG_BY_ID.get(id)!;
                          const on = current === id;
                          return (
                            <button key={id} disabled={busy} onClick={() => equip(slot, on && optional ? null : id)} aria-pressed={on} className={`flex flex-col items-center gap-1 rounded-2xl border-2 bg-white p-1.5 text-center transition hover:-translate-y-0.5 ${on ? "border-gold-400 shadow-pop" : "border-parchment-200"}`}>
                              <AvatarFigure avatar={draft} equipped={{ ...player.equipped, [slot]: id }} size={64} ring={false} />
                              <span className="text-[11px] font-semibold leading-tight text-navy-800">{it.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </fieldset>
                );
              })}
              <button
                className="btn btn-blue"
                onClick={() => {
                  onClose();
                  go("shop");
                }}
              >
                Visit the shop
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
