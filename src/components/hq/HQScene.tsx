"use client";
// The player's headquarters: one illustrated room assembled from equipped items.
import { motion } from "framer-motion";
import { CATALOG_BY_ID, type ShopItem } from "@/lib/game/catalog";
import { levelFromXp } from "@/lib/game/progression";
import type { AvatarConfig, PlayerState } from "@/lib/types";
import { AvatarFigure } from "../ui/Avatar";
import { ItemArt, RoomView } from "./ItemArt";

const get = (id: string | undefined): ShopItem | undefined => (id ? CATALOG_BY_ID.get(id) : undefined);

/** Places a 100×100 ItemArt drawing into the room at (x, y) with size (w, h). */
function Place({ item, x, y, w, h, title }: { item?: ShopItem; x: number; y: number; w: number; h: number; title?: string }) {
  if (!item) return null;
  return (
    <svg x={x} y={y} width={w} height={h} viewBox="0 0 100 100" preserveAspectRatio="xMidYMax meet" overflow="visible">
      <title>{title ?? item.name}</title>
      <ItemArt item={item} />
    </svg>
  );
}

const WALL: Record<string, [string, string]> = {
  basement: ["#c9c2b2", "#b3ab98"],
  city: ["#dfe7ef", "#c7d3df"],
  harbor: ["#e3efe9", "#cbded5"],
  alpine: ["#efe5d6", "#dccdb5"],
  situation: ["#26303d", "#1b232d"],
  embassy: ["#e9dccb", "#d6c3aa"],
  orbital: ["#1c2340", "#141a31"],
};
const FLOOR: Record<string, string> = { basement: "#8b7a63", city: "#8a6a4a", harbor: "#7d5f45", alpine: "#9b7650", situation: "#2a2f37", embassy: "#5c3523", orbital: "#2c3350" };

export function HQScene({ player, className = "" }: { player: PlayerState; className?: string }) {
  const e = player.equipped;
  const bg = get(e.background) ?? CATALOG_BY_ID.get("bg-basement")!;
  const [wall, wallDark] = WALL[bg.art] ?? WALL.basement;
  const dark = bg.art === "situation" || bg.art === "orbital";
  const info = levelFromXp(player.xp);
  const display = (e.display ?? []).map(get).filter(Boolean) as ShopItem[];

  return (
    <div className={`relative aspect-[16/10] w-full overflow-hidden rounded-3xl shadow-game ring-4 ring-white/70 ${className}`}>
      <svg viewBox="0 0 1600 1000" className="absolute inset-0 h-full w-full" role="img" aria-label={`Your headquarters: ${bg.name}`}>
        <defs>
          <linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3b4f8f" />
            <stop offset=".6" stopColor="#c86f7a" />
            <stop offset="1" stopColor="#f2b56b" />
          </linearGradient>
          <linearGradient id="hq-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={wall} />
            <stop offset="1" stopColor={wallDark} />
          </linearGradient>
          <radialGradient id="hq-light" cx=".5" cy=".25" r=".7">
            <stop offset="0" stopColor="#fff" stopOpacity={dark ? 0.12 : 0.35} />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <clipPath id="hq-window">
            <rect x="90" y="120" width="360" height="290" rx="14" />
          </clipPath>
        </defs>

        {/* walls and floor */}
        <rect width="1600" height="1000" fill="url(#hq-wall)" />
        {bg.art === "embassy" && <path d="M0 520h1600" stroke="#b79a76" strokeWidth="10" />}
        {bg.art === "basement" && Array.from({ length: 9 }).map((_, r) => <path key={r} d={`M0 ${70 + r * 70}h1600`} stroke="#000" strokeOpacity=".05" strokeWidth="3" />)}
        <rect y="760" width="1600" height="240" fill={FLOOR[bg.art] ?? FLOOR.basement} />
        <rect y="752" width="1600" height="14" fill="#000" opacity=".18" />
        {Array.from({ length: 8 }).map((_, i) => (
          <path key={i} d={`M${i * 220} 766l-60 234`} stroke="#000" strokeOpacity=".08" strokeWidth="4" />
        ))}
        <rect width="1600" height="1000" fill="url(#hq-light)" />

        {/* window */}
        <rect x="78" y="108" width="384" height="314" rx="20" fill={dark ? "#0d1219" : "#f7f3ea"} />
        <g clipPath="url(#hq-window)">
          <svg x="90" y="120" width="360" height="290" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
            <RoomView art={bg.art} />
          </svg>
        </g>
        <path d="M270 120v290M90 265h360" stroke={dark ? "#0d1219" : "#f7f3ea"} strokeWidth="10" />
        <rect x="64" y="418" width="412" height="18" rx="6" fill={dark ? "#0d1219" : "#e9e1cf"} />

        {/* rank plaque */}
        <g transform="translate(140 450)">
          <rect width="250" height="96" rx="14" fill={dark ? "#121a24" : "#2b3a55"} stroke="#e0b84a" strokeWidth="5" />
          <text x="125" y="40" textAnchor="middle" fontSize="34">
            {info.rank.icon}
          </text>
          <text x="125" y="78" textAnchor="middle" fontSize="22" fontWeight="700" fill="#ffe3a3" fontFamily="Fredoka, sans-serif">
            {info.rank.name}
          </text>
        </g>

        {/* wall map */}
        <Place item={get(e.wallmap)} x={560} y={-40} w={480} h={480} />

        {/* bookshelf */}
        <Place item={get(e.bookshelf)} x={1060} y={200} w={600} h={600} />

        {/* display shelf */}
        <g>
          <rect x="490" y="440" width="620" height="20" rx="6" fill="#6b4a2b" />
          <rect x="490" y="440" width="620" height="6" rx="3" fill="#8a6a3b" />
          <path d="M530 460l20 30M1070 460l-20 30" stroke="#5a3d22" strokeWidth="10" strokeLinecap="round" />
          {display.length === 0 && (
            <text x="800" y="425" textAnchor="middle" fontSize="22" fill={dark ? "#9aa7b8" : "#7a6f5c"} fontStyle="italic">
              Collectibles you display appear here
            </text>
          )}
          {display.map((it, i) => (
            <Place key={it.id} item={it} x={490 + i * 124} y={300} w={128} h={145} />
          ))}
        </g>

        {/* flag */}
        <Place item={get(e.flag)} x={360} y={420} w={340} h={340} />

        {/* desk with monitor and globe */}
        <Place item={get(e.desk)} x={470} y={384} w={660} h={660} />
        <Place item={get(e.monitor)} x={660} y={420} w={280} h={280} />
        <Place item={get(e.globe)} x={930} y={470} w={190} h={190} />
      </svg>

      {/* the player's avatar, standing beside the desk */}
      <motion.div className="absolute bottom-[5%] left-[6%] w-[21%]" animate={{ y: [0, -4, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}>
        <AvatarFigure avatar={player.avatar} equipped={player.equipped} size={400} className="h-auto w-full drop-shadow-[0_10px_14px_rgba(0,0,0,0.35)]" />
        <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-navy-900/85 px-3 py-0.5 text-xs font-semibold text-white">{player.username}</span>
      </motion.div>
    </div>
  );
}

/** A 100×100 thumbnail for shop and inventory cards. */
export function ItemThumb({ item, size = 88, avatar }: { item: ShopItem; size?: number; avatar?: AvatarConfig }) {
  if (item.slot === "outfit" || item.slot === "headwear" || item.slot === "accessory") {
    const equipped = { outfit: item.slot === "outfit" ? item.id : "outfit-casual", [item.slot]: item.id };
    return <AvatarFigure avatar={avatar ?? { skin: 2, hair: 0, hairColor: 1, backdrop: 5 }} equipped={equipped} size={size} />;
  }
  if (item.slot === "background")
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden className="rounded-xl">
        <defs>
          <linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3b4f8f" />
            <stop offset=".6" stopColor="#c86f7a" />
            <stop offset="1" stopColor="#f2b56b" />
          </linearGradient>
          <clipPath id={`thumb-${item.id}`}>
            <rect width="100" height="100" rx="12" />
          </clipPath>
        </defs>
        <g clipPath={`url(#thumb-${item.id})`}>
          <RoomView art={item.art} />
        </g>
      </svg>
    );
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <ItemArt item={item} />
    </svg>
  );
}
