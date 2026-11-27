"use client";
// The HQ is a building: one floor per room. Office and Library are free; the rest are bought with coins.
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CATALOG_BY_ID } from "@/lib/game/catalog";
import { RANKS } from "@/lib/config";
import { levelFromXp } from "@/lib/game/progression";
import { sound } from "@/lib/client/sound";
import { useGame } from "../game/GameProvider";
import { Building, FLOOR_ORDER, RoomDiorama, type FloorState, type RoomId } from "../hq/Building";
import { BriefingRoom, LibraryRoom, OfficeRoom, ROOM_INFO, RooftopRoom, SituationRoom } from "../hq/Rooms";
import { SectionPanel } from "../ui/bits";
import { Coin } from "../ui/icons";

const ROOM_VIEW: Record<RoomId, () => React.ReactElement> = {
  office: OfficeRoom,
  library: LibraryRoom,
  briefing: BriefingRoom,
  situation: SituationRoom,
  rooftop: RooftopRoom,
};

export function HeadquartersSection() {
  const { player, backend, run, go, trends, toast } = useGame();
  const [room, setRoom] = useState<RoomId | null>(null);
  const [hover, setHover] = useState<RoomId | null>(null);
  const [busy, setBusy] = useState(false);
  const rank = levelFromXp(player.xp).rankIndex;
  const books = trends.filter((t) => player.trendBooks?.[t.id]?.following).map((t) => t.color);

  const state = (r: RoomId) => {
    const id = ROOM_INFO[r].item;
    const item = id ? CATALOG_BY_ID.get(id) : undefined;
    const locked = !!item && !player.inventory.includes(item.id);
    const rankLocked = !!item && rank < item.minRank;
    return { item, locked, rankLocked };
  };
  const floors: FloorState[] = FLOOR_ORDER.map((r) => {
    const { item, locked, rankLocked } = state(r);
    return { room: r, name: ROOM_INFO[r].name, locked, lockLabel: locked && item ? (rankLocked ? `Rank: ${RANKS[item.minRank].name}` : `${item.price} coins`) : undefined };
  });

  const unlock = async (r: RoomId) => {
    const { item } = state(r);
    if (!item || busy) return;
    setBusy(true);
    const res = await run(backend.buy(item.id));
    setBusy(false);
    if (res) {
      sound.play("purchase");
      toast({ kind: "coins", title: `${ROOM_INFO[r].name} unlocked`, body: "Step inside to try it." });
      setRoom(r);
    }
  };
  const enter = (r: RoomId) => {
    sound.play("open");
    setRoom(r);
  };

  if (room && !state(room).locked) {
    const View = ROOM_VIEW[room];
    return (
      <SectionPanel
        title={ROOM_INFO[room].name}
        subtitle={ROOM_INFO[room].learn}
        actions={
          <button className="btn btn-ghost" onClick={() => setRoom(null)}>
            ← Back to the building
          </button>
        }
      >
        {room !== "office" && (
          <div className="mb-5 hidden h-36 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-b from-ocean-500/15 to-parchment-100 sm:flex">
          <RoomDiorama room={room} books={books} className="h-full" />
          </div>
        )}
        <View />
      </SectionPanel>
    );
  }

  return (
    <SectionPanel
      title="Headquarters"
      subtitle="Your building. Every floor teaches you something about the world."
      actions={
        <button className="btn btn-primary" onClick={() => go("shop")}>
          Visit shop
        </button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="relative rounded-3xl bg-gradient-to-b from-[#bfe0f5] via-[#e6f2f8] to-parchment-100 p-2">
          <div className="mx-auto aspect-[5/6] w-full max-w-[22rem] sm:max-w-[34rem]">
            <Building floors={floors} hover={hover} onHover={setHover} onPick={(r) => (state(r).locked ? setHover(r) : enter(r))} books={books} />
          </div>
          <p className="pb-1 text-center text-xs font-semibold text-navy-700/70">Tap a floor to go inside</p>
        </div>
        <ul className="grid content-start gap-2.5">
          {[...FLOOR_ORDER].reverse().map((r) => {
            const { item, locked, rankLocked } = state(r);
            const short = !!item && player.coins < item.price;
            return (
              <li key={r}>
                <motion.div layout onPointerEnter={() => setHover(r)} onPointerLeave={() => setHover(null)} className={`flex items-center gap-3 rounded-2xl border-2 bg-white p-2.5 transition ${hover === r ? "border-gold-400 shadow-pop" : "border-parchment-200"}`}>
                  <div className={`h-14 w-16 shrink-0 ${locked ? "opacity-60 grayscale" : ""}`}>
                    <RoomDiorama room={r} books={books} className="h-full w-full" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-navy-900">{ROOM_INFO[r].name}</div>
                    <p className="line-clamp-2 text-xs text-navy-700/80">{ROOM_INFO[r].learn}</p>
                  </div>
                  {!locked ? (
                    <button className="btn btn-blue shrink-0 !px-3 !py-1.5 text-sm" onClick={() => enter(r)}>
                      Enter
                    </button>
                  ) : rankLocked ? (
                    <span className="chip shrink-0 bg-parchment-100 text-navy-700">🔒 {RANKS[item!.minRank].name}</span>
                  ) : (
                    <button className="btn btn-primary shrink-0 !px-3 !py-1.5 text-sm" disabled={busy || short} onClick={() => unlock(r)} title={short ? `You need ${item!.price - player.coins} more coins` : undefined}>
                      <span className="inline-flex items-center gap-1">
                        Unlock <Coin size={16} /> {item!.price}
                      </span>
                    </button>
                  )}
                </motion.div>
              </li>
            );
          })}
          <AnimatePresence>
            {hover && state(hover).locked && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-navy-700/70">
                {state(hover).rankLocked ? "Earn XP from quizzes and briefings to reach the rank this floor needs." : "Earn coins from quizzes to unlock this floor."}
              </motion.p>
            )}
          </AnimatePresence>
        </ul>
      </div>
    </SectionPanel>
  );
}
