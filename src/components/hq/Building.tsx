"use client";
// The Headquarters building: an isometric, terraced tower of rooms. Each floor steps back and up
// from the one below, so every room stays visible. Drawn with a tiny isometric box kit.
import { shade } from "../ui/Avatar";

export type RoomId = "office" | "library" | "briefing" | "situation" | "rooftop";
export const FLOOR_ORDER: RoomId[] = ["office", "library", "situation", "briefing", "rooftop"];

const W = 12; // room width (x)
const D = 7; // room depth (y)
const H = 4; // wall height (z)
const S = 13; // pixels per unit
const C = 0.866;

type V3 = [number, number, number];
/** isometric projection of a point in building space */
const P = ([x, y, z]: V3): [number, number] => [(x - y) * C * S, (x + y) * 0.5 * S - z * S];
const pts = (vs: V3[]) => vs.map((v) => P(v).map((n) => n.toFixed(1)).join(",")).join(" ");

function Poly({ v, fill, stroke, sw = 0.8, opacity }: { v: V3[]; fill: string; stroke?: string; sw?: number; opacity?: number }) {
  return <polygon points={pts(v)} fill={fill} stroke={stroke ?? shade(fill, -0.25)} strokeWidth={sw} strokeLinejoin="round" opacity={opacity} />;
}

/** A box with its 3 visible faces (top, front = +y side, right = +x side). */
function Box({ o, x, y, z, w, d, h, color, top }: { o: V3; x: number; y: number; z: number; w: number; d: number; h: number; color: string; top?: string }) {
  const [ox, oy, oz] = o;
  const X = ox + x;
  const Y = oy + y;
  const Z = oz + z;
  return (
    <g>
      <Poly v={[[X, Y + d, Z], [X + w, Y + d, Z], [X + w, Y + d, Z + h], [X, Y + d, Z + h]]} fill={shade(color, -0.12)} />
      <Poly v={[[X + w, Y, Z], [X + w, Y + d, Z], [X + w, Y + d, Z + h], [X + w, Y, Z + h]]} fill={shade(color, -0.28)} />
      <Poly v={[[X, Y, Z + h], [X + w, Y, Z + h], [X + w, Y + d, Z + h], [X, Y + d, Z + h]]} fill={top ?? shade(color, 0.12)} />
    </g>
  );
}

/** A flat panel on the back wall (plane y = o.y + 0.02) */
function BackPanel({ o, x, z, w, h, fill, stroke }: { o: V3; x: number; z: number; w: number; h: number; fill: string; stroke?: string }) {
  const [ox, oy, oz] = o;
  const y = oy + 0.04;
  return <Poly v={[[ox + x, y, oz + z], [ox + x + w, y, oz + z], [ox + x + w, y, oz + z + h], [ox + x, y, oz + z + h]]} fill={fill} stroke={stroke} sw={1.2} />;
}
/** A flat panel on the left wall (plane x = o.x + 0.02) */
function LeftPanel({ o, y, z, d, h, fill, stroke }: { o: V3; y: number; z: number; d: number; h: number; fill: string; stroke?: string }) {
  const [ox, oy, oz] = o;
  const x = ox + 0.04;
  return <Poly v={[[x, oy + y, oz + z], [x, oy + y + d, oz + z], [x, oy + y + d, oz + z + h], [x, oy + y, oz + z + h]]} fill={fill} stroke={stroke} sw={1.2} />;
}
/** A flat shape on the floor */
function Rug({ o, x, y, w, d, fill }: { o: V3; x: number; y: number; w: number; d: number; fill: string }) {
  const [ox, oy, oz] = o;
  return <Poly v={[[ox + x, oy + y, oz + 0.02], [ox + x + w, oy + y, oz + 0.02], [ox + x + w, oy + y + d, oz + 0.02], [ox + x, oy + y + d, oz + 0.02]]} fill={fill} />;
}

const THEME: Record<RoomId, { wall: string; floor: string; trim: string }> = {
  office: { wall: "#e9dfcc", floor: "#b98a5a", trim: "#8a6a4a" },
  library: { wall: "#dfe6d5", floor: "#9c6b45", trim: "#6b4a2b" },
  briefing: { wall: "#dde5f0", floor: "#7d8aa3", trim: "#4f5d78" },
  situation: { wall: "#2b3646", floor: "#2a313c", trim: "#1b222c" },
  rooftop: { wall: "#c9d3dc", floor: "#a9b4bf", trim: "#7d8894" },
};

function Shell({ o, room }: { o: V3; room: RoomId }) {
  const t = THEME[room];
  const [ox, oy, oz] = o;
  const slab = 0.7;
  const open = room === "rooftop";
  const wallH = open ? 0.9 : H;
  return (
    <g>
      {/* slab: front and right faces */}
      <Poly v={[[ox, oy + D, oz - slab], [ox + W, oy + D, oz - slab], [ox + W, oy + D, oz], [ox, oy + D, oz]]} fill={shade(t.trim, 0.1)} />
      <Poly v={[[ox + W, oy, oz - slab], [ox + W, oy + D, oz - slab], [ox + W, oy + D, oz], [ox + W, oy, oz]]} fill={shade(t.trim, -0.15)} />
      {/* floor */}
      <Poly v={[[ox, oy, oz], [ox + W, oy, oz], [ox + W, oy + D, oz], [ox, oy + D, oz]]} fill={t.floor} />
      {Array.from({ length: room === "rooftop" ? 6 : 5 }, (_, i) => {
        const x = ((i + 1) * W) / (room === "rooftop" ? 7 : 6);
        return <line key={i} x1={P([ox + x, oy, oz])[0]} y1={P([ox + x, oy, oz])[1]} x2={P([ox + x, oy + D, oz])[0]} y2={P([ox + x, oy + D, oz])[1]} stroke={shade(t.floor, -0.12)} strokeWidth="0.8" />;
      })}
      {room === "rooftop" &&
        Array.from({ length: 3 }, (_, i) => {
          const y = ((i + 1) * D) / 4;
          return <line key={`r${i}`} x1={P([ox, oy + y, oz])[0]} y1={P([ox, oy + y, oz])[1]} x2={P([ox + W, oy + y, oz])[0]} y2={P([ox + W, oy + y, oz])[1]} stroke={shade(t.floor, -0.12)} strokeWidth="0.8" />;
        })}
      {/* back wall (y = 0) and left wall (x = 0) */}
      <Poly v={[[ox, oy, oz], [ox + W, oy, oz], [ox + W, oy, oz + wallH], [ox, oy, oz + wallH]]} fill={shade(t.wall, -0.04)} />
      <Poly v={[[ox, oy, oz], [ox, oy + D, oz], [ox, oy + D, oz + wallH], [ox, oy, oz + wallH]]} fill={shade(t.wall, -0.14)} />
      {/* wall tops */}
      <Poly v={[[ox - 0.3, oy - 0.3, oz + wallH], [ox + W, oy - 0.3, oz + wallH], [ox + W, oy, oz + wallH], [ox, oy, oz + wallH]]} fill={shade(t.trim, 0.25)} />
      <Poly v={[[ox - 0.3, oy - 0.3, oz + wallH], [ox, oy, oz + wallH], [ox, oy + D, oz + wallH], [ox - 0.3, oy + D, oz + wallH]]} fill={shade(t.trim, 0.15)} />
      {/* skirting */}
      {!open && <Poly v={[[ox, oy + 0.02, oz], [ox + W, oy + 0.02, oz], [ox + W, oy + 0.02, oz + 0.25], [ox, oy + 0.02, oz + 0.25]]} fill={t.trim} />}
    </g>
  );
}

function Furniture({ o, room, books }: { o: V3; room: RoomId; books: string[] }) {
  switch (room) {
    case "office":
      return (
        <g>
          <BackPanel o={o} x={4.2} z={1.5} w={3} h={1.9} fill="#9fd0f0" stroke="#f7f3ea" />
          <BackPanel o={o} x={5.65} z={1.5} w={0.1} h={1.9} fill="#f7f3ea" />
          <LeftPanel o={o} y={1.6} z={1.6} d={3.4} h={1.8} fill="#efe4c8" stroke="#8a6a4a" />
          <LeftPanel o={o} y={2.2} z={2.1} d={1.3} h={0.8} fill="#7dba67" />
          <LeftPanel o={o} y={3.8} z={2.0} d={0.8} h={0.9} fill="#7dba67" />
          <Box o={o} x={0.8} y={0.15} z={0} w={2.6} d={0.7} h={3.1} color="#8a5a33" />
          {["#c94c4c", "#3d8bff", "#e8a31c", "#2f9e6e"].map((c, i) => (
            <Box key={c} o={o} x={1.0 + i * 0.55} y={0.3} z={2.1} w={0.4} d={0.5} h={0.7} color={c} />
          ))}
          <Rug o={o} x={4.5} y={2.6} w={6} d={3.6} fill="#b5462f" />
          <Box o={o} x={5.5} y={2.2} z={0} w={3.6} d={1.6} h={1.25} color="#a0703f" />
          <Box o={o} x={6.5} y={2.4} z={1.25} w={1.8} d={0.25} h={1.1} color="#2b2f36" />
          <Box o={o} x={6.8} y={4.4} z={0} w={1.1} d={1.1} h={0.7} color="#3a6ea5" />
          <Box o={o} x={6.8} y={5.3} z={0.7} w={1.1} d={0.2} h={1} color="#3a6ea5" />
          <Box o={o} x={10.6} y={0.6} z={0} w={0.8} d={0.8} h={0.7} color="#c9763a" />
          <circle cx={P([o[0] + 11, o[1] + 1, o[2] + 1.5])[0]} cy={P([o[0] + 11, o[1] + 1, o[2] + 1.5])[1]} r={11} fill="#2f9e6e" />
        </g>
      );
    case "library": {
      const spines = books.length ? books : ["#8a5a2b", "#5f6b3a", "#3a4f7a", "#9b3d3d"];
      return (
        <g>
          {[0.4, 4.3, 8.2].map((x, si) => (
            <g key={x}>
              <Box o={o} x={x} y={0.12} z={0} w={3.4} d={0.8} h={3.5} color="#6b4a2b" />
              {[0.5, 1.5, 2.5].map((z, ri) => (
                <g key={z}>
                  {Array.from({ length: 6 }, (_, bi) => {
                    const c = spines[(si * 18 + ri * 6 + bi) % spines.length];
                    return <Box key={bi} o={o} x={x + 0.2 + bi * 0.5} y={0.5} z={z} w={0.38} d={0.42} h={0.75 + ((bi + ri) % 3) * 0.08} color={c} />;
                  })}
                </g>
              ))}
            </g>
          ))}
          <Rug o={o} x={2.5} y={2.6} w={7.5} d={3.8} fill="#2f6f62" />
          <Box o={o} x={4} y={3.2} z={0} w={3.8} d={1.8} h={1.1} color="#8a5a33" />
          <Box o={o} x={4.6} y={3.6} z={1.1} w={0.9} d={0.6} h={0.12} color="#f4f0e4" />
          <Box o={o} x={6.6} y={3.5} z={1.1} w={0.25} d={0.25} h={0.9} color="#3b3f48" />
          <Box o={o} x={6.3} y={3.3} z={2.0} w={0.8} d={0.7} h={0.35} color="#ffd76a" />
          <Box o={o} x={9.2} y={4.3} z={0} w={1.5} d={1.4} h={0.9} color="#b5462f" />
          <Box o={o} x={9.2} y={5.5} z={0.9} w={1.5} d={0.25} h={0.9} color="#b5462f" />
        </g>
      );
    }
    case "briefing":
      return (
        <g>
          <BackPanel o={o} x={2.6} z={1.2} w={6.6} h={2.4} fill="#1c3f6e" stroke="#0e2238" />
          <BackPanel o={o} x={3.2} z={1.6} w={2.5} h={1.6} fill="#3d8bff" />
          <BackPanel o={o} x={6.1} z={2.6} w={2.5} h={0.25} fill="#9fd0f0" />
          <BackPanel o={o} x={6.1} z={2.1} w={1.8} h={0.25} fill="#9fd0f0" />
          <BackPanel o={o} x={6.1} z={1.6} w={2.2} h={0.25} fill="#9fd0f0" />
          <LeftPanel o={o} y={1.2} z={2.2} d={1.6} h={1} fill="#ffd76a" stroke="#8a6a2b" />
          <Box o={o} x={5.4} y={1.6} z={0} w={1.3} d={0.9} h={1.4} color="#5b3a26" />
          <Box o={o} x={5.6} y={1.7} z={1.4} w={0.9} d={0.6} h={0.12} color="#e0b84a" />
          {[3.6, 4.9, 6.2].map((y) => [2.6, 4.4, 6.2, 8.0].map((x) => <Box key={`${x}-${y}`} o={o} x={x} y={y} z={0} w={1} d={0.8} h={0.6} color="#c94c4c" />))}
        </g>
      );
    case "situation":
      return (
        <g>
          {[0, 1].map((r) => [0, 1, 2].map((c) => <BackPanel key={`${r}-${c}`} o={o} x={1.6 + c * 3.1} z={1.0 + r * 1.45} w={2.8} h={1.25} fill={["#0f6b8f", "#14806b", "#8f2d2d", "#2c4f99", "#a26b0f", "#14806b"][r * 3 + c]} stroke="#7fe0ff" />))}
          <LeftPanel o={o} y={1.4} z={1.2} d={4} h={2.2} fill="#0f3a59" stroke="#7fe0ff" />
          <Box o={o} x={3.2} y={2.8} z={0} w={5.6} d={2.4} h={1.05} color="#3a4452" top="#0d5e78" />
          {[3.6, 5.2, 6.8].map((x) => (
            <Box key={x} o={o} x={x} y={5.6} z={0} w={0.9} d={0.9} h={0.6} color="#5b6b7d" />
          ))}
          {[3.6, 5.2, 6.8].map((x) => (
            <Box key={`b${x}`} o={o} x={x} y={1.6} z={0} w={0.9} d={0.9} h={0.6} color="#5b6b7d" />
          ))}
          <ellipse cx={P([o[0] + 6, o[1] + 4, o[2] + 1.06])[0]} cy={P([o[0] + 6, o[1] + 4, o[2] + 1.06])[1]} rx={30} ry={11} fill="#57d3ff" opacity=".35" />
        </g>
      );
    case "rooftop": {
      const [ox, oy, oz] = o;
      const tele = P([ox + 7, oy + 3, oz + 2.2]);
      const dish = P([ox + 2.4, oy + 1.6, oz + 3.2]);
      const mast0 = P([ox + 10.5, oy + 1, oz]);
      const mast1 = P([ox + 10.5, oy + 1, oz + 5.5]);
      return (
        <g>
          {Array.from({ length: 13 }, (_, i) => (
            <Box key={`pb${i}`} o={o} x={i * 0.97} y={0.05} z={0} w={0.12} d={0.12} h={1.5} color="#e9eef2" />
          ))}
          <Box o={o} x={0} y={0} z={1.4} w={W} d={0.14} h={0.12} color="#e9eef2" />
          {/* helipad mark */}
          <Rug o={o} x={3.2} y={3.2} w={3} d={2.6} fill="#e8a31c" />
          <Rug o={o} x={3.6} y={3.6} w={2.2} d={1.8} fill="#a9b4bf" />
          {/* telescope */}
          <line x1={tele[0]} y1={tele[1]} x2={P([ox + 6.4, oy + 2.4, oz])[0]} y2={P([ox + 6.4, oy + 2.4, oz])[1]} stroke="#3b3f48" strokeWidth="2.2" />
          <line x1={tele[0]} y1={tele[1]} x2={P([ox + 7.6, oy + 2.6, oz])[0]} y2={P([ox + 7.6, oy + 2.6, oz])[1]} stroke="#3b3f48" strokeWidth="2.2" />
          <line x1={tele[0]} y1={tele[1]} x2={P([ox + 7, oy + 3.8, oz])[0]} y2={P([ox + 7, oy + 3.8, oz])[1]} stroke="#3b3f48" strokeWidth="2.2" />
          <line x1={tele[0] - 14} y1={tele[1] + 8} x2={tele[0] + 22} y2={tele[1] - 16} stroke="#2d86cc" strokeWidth="8" strokeLinecap="round" />
          <circle cx={tele[0] + 22} cy={tele[1] - 16} r="4.5" fill="#9fd0f0" stroke="#1c3f6e" strokeWidth="1.5" />
          {/* dish */}
          <line x1={dish[0]} y1={dish[1]} x2={P([ox + 2.4, oy + 1.6, oz])[0]} y2={P([ox + 2.4, oy + 1.6, oz])[1]} stroke="#7d8894" strokeWidth="2.5" />
          <ellipse cx={dish[0]} cy={dish[1]} rx="15" ry="9" fill="#f2f4f7" stroke="#7d8894" strokeWidth="1.5" transform={`rotate(-25 ${dish[0]} ${dish[1]})`} />
          {/* mast and flag */}
          <line x1={mast0[0]} y1={mast0[1]} x2={mast1[0]} y2={mast1[1]} stroke="#5b6b7d" strokeWidth="2.5" />
          <path d={`M${mast1[0]} ${mast1[1]} l20 4 l-20 8 z`} fill="#e5484d" />
          <circle cx={mast1[0]} cy={mast1[1] - 3} r="2.5" fill="#ff5a5a" />
          <Box o={o} x={8.6} y={5.2} z={0} w={2.4} d={0.8} h={0.5} color="#8a5a33" />
        </g>
      );
    }
  }
}

/** One room as a standalone isometric diorama (used in room headers). */
export function RoomDiorama({ room, books = [], className = "", style }: { room: RoomId; books?: string[]; className?: string; style?: React.CSSProperties }) {
  const o: V3 = [0, 0, 0];
  const corners = [P([0, 0, H + 1.5]), P([W, 0, 0]), P([0, D, 0]), P([W, D, -0.7]), P([W, 0, H + 1.5])];
  const minX = Math.min(...corners.map((c) => c[0])) - 8;
  const maxX = Math.max(...corners.map((c) => c[0])) + 8;
  const minY = Math.min(...corners.map((c) => c[1])) - (room === "rooftop" ? 30 : 8);
  const maxY = Math.max(...corners.map((c) => c[1])) + 8;
  return (
    <svg viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} className={className} style={style} aria-hidden>
      <Shell o={o} room={room} />
      <Furniture o={o} room={room} books={books} />
    </svg>
  );
}

export interface FloorState {
  room: RoomId;
  name: string;
  locked: boolean;
  /** short tag under a locked floor, e.g. "300 coins" */
  lockLabel?: string;
}

/** The whole building. Upper floors are drawn first, since lower floors sit in front of them. */
export function Building({ floors, hover, onHover, onPick, books }: { floors: FloorState[]; hover: RoomId | null; onHover: (r: RoomId | null) => void; onPick: (r: RoomId) => void; books: string[] }) {
  const origin = (i: number): V3 => [0, -i * D, i * H];
  const all = floors.flatMap((_, i) => {
    const o = origin(i);
    return [P([o[0], o[1], o[2] + H + 2]), P([o[0] + W, o[1], o[2]]), P([o[0], o[1] + D, o[2]]), P([o[0] + W, o[1] + D, o[2] - 0.7]), P([o[0] + W, o[1], o[2] + H + 2])];
  });
  const minX = Math.min(...all.map((c) => c[0])) - 70;
  const maxX = Math.max(...all.map((c) => c[0])) + 10;
  const minY = Math.min(...all.map((c) => c[1])) - 40;
  const maxY = Math.max(...all.map((c) => c[1])) + 14;
  return (
    <svg viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} className="h-full w-full" role="group" aria-label="Your headquarters building">
      <defs>
        <filter id="hq-glow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#ffd76a" floodOpacity="0.95" />
        </filter>
        <filter id="hq-locked">
          <feColorMatrix type="saturate" values="0.15" />
        </filter>
      </defs>
      {/* ground shadow */}
      <ellipse cx={P([W / 2, D / 2, 0])[0]} cy={P([W / 2, D / 2, 0])[1] + 26} rx={130} ry={22} fill="#0b1d33" opacity=".25" />
      {[...floors.keys()].reverse().map((i) => {
        const f = floors[i];
        const o = origin(i);
        const label = P([o[0], o[1] + D, o[2] + 1.2]);
        const center = P([o[0] + W / 2, o[1] + D / 2, o[2] + 1.6]);
        const isHover = hover === f.room;
        return (
          <g
            key={f.room}
            role="button"
            tabIndex={0}
            aria-label={`${f.name}${f.locked ? `, locked${f.lockLabel ? `: ${f.lockLabel}` : ""}` : ""}`}
            className="cursor-pointer outline-none"
            onClick={() => onPick(f.room)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onPick(f.room))}
            onPointerEnter={() => onHover(f.room)}
            onPointerLeave={() => onHover(null)}
            onFocus={() => onHover(f.room)}
            onBlur={() => onHover(null)}
            filter={isHover ? "url(#hq-glow)" : undefined}
          >
            <g filter={f.locked ? "url(#hq-locked)" : undefined} opacity={f.locked ? 0.8 : 1}>
              <Shell o={o} room={f.room} />
              <Furniture o={o} room={f.room} books={books} />
            </g>
            {f.locked && (
              <g transform={`translate(${center[0]} ${center[1]})`}>
                <circle r="15" fill="#0b1d33" opacity=".85" />
                <path d="M-5 -1 v-4 a5 5 0 0 1 10 0 v4" stroke="#ffd76a" strokeWidth="2.2" fill="none" />
                <rect x="-7" y="-1" width="14" height="10" rx="2" fill="#ffd76a" />
              </g>
            )}
            <g transform={`translate(${label[0] - 8} ${label[1]})`}>
              <rect x={-(f.name.length * 6.2 + 18)} y="-11" width={f.name.length * 6.2 + 16} height="20" rx="10" fill={isHover ? "#ffd76a" : "#0b1d33"} opacity={isHover ? 1 : 0.85} />
              <text x={-(f.name.length * 3.1 + 10)} y="3.5" textAnchor="middle" fontSize="11" fontWeight="700" fontFamily="'Nunito Variable', system-ui" fill={isHover ? "#0b1d33" : "#fff"}>
                {f.name}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
