// Original SVG artwork for headquarters items and collectibles. Every item is drawn in a
// 100×100 box so it can be shown as a shop thumbnail or placed in the HQ scene.
import type { ShopItem } from "@/lib/game/catalog";

const shade = (hex: string, amt: number) => {
  const n = parseInt(hex.replace("#", ""), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
};

export function ItemArt({ item }: { item: ShopItem }) {
  const c = item.color;
  const a = item.accent ?? "#d4a73a";
  switch (item.art) {
    // ------------------------------------------------ desks
    case "desk":
      return (
        <g>
          <rect x="6" y="40" width="88" height="10" rx="3" fill={c} />
          <rect x="6" y="40" width="88" height="3" rx="1.5" fill={shade(c, 0.12)} />
          <rect x="10" y="50" width="30" height="40" fill={shade(c, -0.08)} />
          <rect x="60" y="50" width="30" height="40" fill={shade(c, -0.08)} />
          {item.accent && [58, 70, 82].map((y) => <rect key={y} x="20" y={y} width="10" height="2.5" rx="1" fill={a} />)}
          {!item.accent && <rect x="12" y="50" width="76" height="4" fill={shade(c, -0.2)} />}
        </g>
      );
    case "desk-glass":
      return (
        <g>
          <rect x="4" y="42" width="92" height="6" rx="2" fill={c} opacity=".75" stroke="#e8f8ff" />
          <path d="M14 48l-6 42M86 48l6 42M14 48l10 42M86 48l-10 42" stroke="#9aa7b4" strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    case "desk-command":
      return (
        <g>
          <path d="M4 52h92l-6 38H10z" fill={c} />
          <path d="M8 40h84l4 12H4z" fill={shade(c, 0.1)} />
          {[16, 30, 44, 58, 72].map((x, i) => (
            <rect key={x} x={x} y="44" width="10" height="4" rx="1" fill={a} opacity={0.5 + (i % 2) * 0.5} />
          ))}
          <circle cx="50" cy="70" r="10" fill={shade(c, -0.15)} stroke={a} strokeWidth="1.5" />
          <path d="M44 70h12M50 64v12" stroke={a} strokeWidth="1" />
        </g>
      );
    // ------------------------------------------------ wall maps
    case "map":
    case "cork":
      return (
        <g>
          <rect x="4" y="16" width="92" height="64" rx="3" fill={item.accent ?? shade(c, -0.25)} />
          <rect x="8" y="20" width="84" height="56" fill={c} />
          {item.art === "cork" ? (
            <>
              {[18, 40, 66, 80].map((x, i) => (
                <rect key={x} x={x - 6} y={28 + (i % 2) * 20} width="16" height="12" fill={["#fff", "#fef3a7", "#cfe8ff", "#fff"][i]} transform={`rotate(${i * 7 - 8} ${x} ${34})`} />
              ))}
              <path d="M20 34L42 54 66 32 80 52" stroke="#d64545" strokeWidth="1.2" fill="none" />
              {[20, 42, 66, 80].map((x, i) => (
                <circle key={x} cx={x} cy={[34, 54, 32, 52][i]} r="2" fill="#d64545" />
              ))}
            </>
          ) : (
            <>
              <path d="M16 30c6-4 14-3 18 2s0 10 6 12 10-2 12 4-6 10-12 12M20 56c4-2 8 0 9 4M58 28c8-2 16 0 20 6s-2 8 2 12 8 6 4 12M64 58c4 0 8 4 6 10" fill="none" stroke="#7a9a5b" strokeWidth="5" strokeLinecap="round" opacity=".8" />
              {[0, 1, 2, 3].map((i) => (
                <circle key={i} cx={[10, 90, 10, 90][i]} cy={[22, 22, 74, 74][i]} r="2" fill="#c33" />
              ))}
            </>
          )}
        </g>
      );
    case "map-digital":
      return (
        <g>
          <rect x="2" y="14" width="96" height="68" rx="4" fill="#1d2430" />
          <rect x="6" y="18" width="88" height="60" rx="2" fill={c} />
          <path d="M16 34c6-4 14-3 18 2s0 10 6 12 10-2 12 4-6 10-12 12M20 60c4-2 8 0 9 4M58 30c8-2 16 0 20 6s-2 8 2 12 8 6 4 12M64 60c4 0 8 4 6 10" fill="none" stroke={a} strokeWidth="3.5" strokeLinecap="round" opacity=".9" />
          {[[30, 44], [70, 40], [44, 66]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2.5" fill="#fff" opacity=".9" />
          ))}
          <path d="M6 48h88M50 18v60" stroke={a} strokeOpacity=".15" />
        </g>
      );
    // ------------------------------------------------ monitors
    case "laptop":
      return (
        <g>
          <path d="M22 40h56v34H22z" fill="#2b2f36" />
          <rect x="25" y="43" width="50" height="28" fill="#5fb3ff" opacity=".85" />
          <path d="M14 76h72l-6 8H20z" fill={c} />
          <circle cx="66" cy="60" r="3" fill="#f7c552" />
          <rect x="30" y="48" width="20" height="3" fill="#fff" opacity=".7" />
        </g>
      );
    case "dual":
      return (
        <g>
          {[8, 52].map((x) => (
            <g key={x}>
              <rect x={x} y="30" width="40" height="30" rx="2" fill={c} />
              <rect x={x + 3} y="33" width="34" height="24" fill={a} opacity=".85" />
              <rect x={x + 6} y="38" width="16" height="2.5" fill="#fff" opacity=".7" />
              <rect x={x + 6} y="44" width="24" height="2" fill="#fff" opacity=".5" />
              <rect x={x + 17} y="60" width="6" height="12" fill={shade(c, 0.1)} />
            </g>
          ))}
          <rect x="16" y="72" width="68" height="4" rx="2" fill={shade(c, 0.15)} />
        </g>
      );
    case "wall":
      return (
        <g>
          <rect x="2" y="10" width="96" height="72" rx="3" fill={c} />
          {[0, 1, 2].map((r) =>
            [0, 1, 2].map((col) => (
              <g key={`${r}-${col}`}>
                <rect x={6 + col * 31} y={14 + r * 22} width="28" height="19" fill={r === 1 && col === 1 ? a : "#2e6fb5"} opacity={0.85} />
                <rect x={9 + col * 31} y={18 + r * 22} width="12" height="2" fill="#fff" opacity=".6" />
              </g>
            )),
          )}
        </g>
      );
    // ------------------------------------------------ bookshelves
    case "shelf":
    case "shelf-tall": {
      const rows = item.art === "shelf" ? 3 : 4;
      const top = item.art === "shelf" ? 28 : 6;
      const h = (92 - top) / rows;
      const books = ["#b8323a", "#2f5d9e", "#2f9e6e", "#e0b84a", "#6a2c91", "#d9d2c3", "#3d4f66"];
      return (
        <g>
          <rect x="14" y={top} width="72" height={94 - top} fill={c} />
          {Array.from({ length: rows }).map((_, r) => (
            <g key={r}>
              <rect x="18" y={top + 4 + r * h} width="64" height={h - 8} fill={shade(c, -0.18)} />
              {Array.from({ length: 9 }).map((__, b) => (
                <rect key={b} x={20 + b * 7} y={top + 6 + r * h + ((b * 3 + r) % 4)} width="5.5" height={h - 12 - ((b * 3 + r) % 4)} fill={books[(b + r * 2) % books.length]} rx="1" />
              ))}
              <rect x="16" y={top + r * h + h - 4} width="68" height="4" fill={shade(c, 0.08)} />
            </g>
          ))}
        </g>
      );
    }
    // ------------------------------------------------ flags
    case "pennant":
      return (
        <g>
          <rect x="30" y="10" width="3" height="84" fill="#8a6a3b" />
          <path d="M33 14l46 14-46 14z" fill={c} />
          <circle cx="48" cy="28" r="6" fill="#fff" />
          <path d="M44 28h8M48 24v8" stroke={c} strokeWidth="1.5" />
        </g>
      );
    case "banner":
      return (
        <g>
          <rect x="24" y="8" width="3" height="86" fill="#c0c6cc" />
          <path d="M27 12h50v34H27z" fill={c} />
          <circle cx="52" cy="29" r="10" fill="none" stroke="#fff" strokeWidth="2" />
          <path d="M42 29h20M52 19c4 4 4 16 0 20M52 19c-4 4-4 16 0 20" stroke="#fff" strokeWidth="1.5" fill="none" />
        </g>
      );
    case "flagrow":
      return (
        <g>
          {["#d64545", "#2f80ed", "#2f9e6e", "#f2b134", "#6a2c91"].map((col, i) => (
            <g key={i}>
              <rect x={10 + i * 18} y={20 + (i % 2) * 6} width="2" height="70" fill="#c0c6cc" />
              <path d={`M${12 + i * 18} ${22 + (i % 2) * 6}h14v10h-14z`} fill={col} />
              <path d={`M${12 + i * 18} ${27 + (i % 2) * 6}h14`} stroke="#fff" strokeWidth="1.5" />
            </g>
          ))}
        </g>
      );
    // ------------------------------------------------ globes
    case "globe":
    case "globe-float":
      return (
        <g>
          {item.art === "globe" ? (
            <>
              <path d="M50 84v8M36 94h28" stroke={a} strokeWidth="4" strokeLinecap="round" />
              <path d="M24 50a26 26 0 0052 0" fill="none" stroke={a} strokeWidth="3" />
            </>
          ) : (
            <>
              <ellipse cx="50" cy="92" rx="22" ry="5" fill={a} />
              <ellipse cx="50" cy="84" rx="14" ry="3" fill={c} opacity=".35" />
            </>
          )}
          <circle cx="50" cy={item.art === "globe" ? 50 : 46} r="24" fill={c} />
          <path d={`M36 ${item.art === "globe" ? 40 : 36}c6-3 10 0 12 4s-2 8 4 10M56 ${item.art === "globe" ? 60 : 56}c4 0 8 3 6 8M54 ${item.art === "globe" ? 34 : 30}c6 0 10 4 12 8`} stroke="#8cc574" strokeWidth="5" strokeLinecap="round" fill="none" />
          <circle cx="42" cy={item.art === "globe" ? 40 : 36} r="6" fill="#fff" opacity=".25" />
        </g>
      );
    case "armillary":
      return (
        <g fill="none" stroke={c} strokeWidth="3">
          <circle cx="50" cy="46" r="28" />
          <ellipse cx="50" cy="46" rx="28" ry="9" />
          <ellipse cx="50" cy="46" rx="9" ry="28" transform="rotate(30 50 46)" />
          <circle cx="50" cy="46" r="8" fill="#3d8fd1" stroke="none" />
          <path d="M50 74v14M34 92h32" strokeLinecap="round" strokeWidth="4" />
        </g>
      );
    // ------------------------------------------------ collectibles (models on stands)
    case "airliner":
      return (
        <g>
          <Stand />
          <path d="M14 50c0-4 4-6 10-6h52c6 0 10 3 10 6s-4 6-10 6H24c-6 0-10-2-10-6z" fill={c} />
          <path d="M44 50L30 30h8l20 20zM44 50L34 68h8l18-18zM78 46l6-12h4l-2 14z" fill={shade(c, -0.12)} />
          {[28, 36, 44, 52, 60, 68].map((x) => <circle key={x} cx={x} cy="48" r="1.4" fill={a} />)}
          <path d="M14 52h70" stroke={a} strokeWidth="2" />
        </g>
      );
    case "jet":
      return (
        <g>
          <Stand />
          <path d="M12 50l20-4h40l16 4-16 4H32z" fill={c} />
          <path d="M42 46L58 26h6L56 46zM42 54l14 20h6l-6-20zM74 46l8-12h4l-4 12z" fill={shade(c, -0.15)} />
          <path d="M18 49l8-2v6l-8-2z" fill="#9fd3e6" />
        </g>
      );
    case "tank":
      return (
        <g>
          <Stand />
          <rect x="16" y="54" width="68" height="12" rx="6" fill="#3a3f36" />
          {[24, 36, 48, 60, 72].map((x) => <circle key={x} cx={x} cy="60" r="4" fill="#6c7266" />)}
          <path d="M20 54l6-10h48l6 10z" fill={c} />
          <path d="M36 44l4-8h20l4 8z" fill={shade(c, 0.08)} />
          <rect x="60" y="37" width="30" height="4" rx="2" fill={shade(c, -0.1)} />
        </g>
      );
    case "rover":
      return (
        <g>
          <Stand />
          <rect x="24" y="44" width="52" height="12" rx="2" fill={c} />
          <rect x="34" y="34" width="20" height="8" fill={a} />
          <path d="M60 44V30h8" stroke={shade(c, -0.2)} strokeWidth="2.5" fill="none" />
          <circle cx="70" cy="28" r="4" fill={shade(c, -0.2)} />
          {[26, 42, 58, 74].map((x) => <circle key={x} cx={x} cy="64" r="6" fill="#3a3f46" stroke="#9aa0a6" strokeWidth="1.5" />)}
          <path d="M26 64l8-8M74 64l-8-8M42 64v-8M58 64v-8" stroke={shade(c, -0.3)} strokeWidth="2" />
        </g>
      );
    case "ship":
    case "carrier":
      return (
        <g>
          <Stand />
          <path d="M8 56h84l-10 12H18z" fill={c} />
          <path d="M8 56h84" stroke={shade(c, 0.2)} strokeWidth="2" />
          {item.art === "carrier" ? (
            <>
              <rect x="12" y="50" width="76" height="6" fill={shade(c, -0.15)} />
              <rect x="62" y="38" width="10" height="12" fill={shade(c, 0.1)} />
              {[22, 34, 46].map((x) => <path key={x} d={`M${x} 52l6-2 6 2-6 1z`} fill="#cfd6dd" />)}
            </>
          ) : (
            <>
              <path d="M30 56v-10h30v10M40 46v-10h14v10" fill={shade(c, 0.08)} stroke={shade(c, -0.15)} />
              <path d="M48 36V24" stroke={shade(c, -0.3)} strokeWidth="2" />
              <rect x="66" y="50" width="14" height="6" fill={shade(c, -0.1)} />
            </>
          )}
        </g>
      );
    case "sub":
      return (
        <g>
          <Stand />
          <path d="M12 54c0-8 10-10 26-10h30c12 0 20 4 20 10s-8 10-20 10H38c-16 0-26-2-26-10z" fill={c} />
          <path d="M46 44v-10h12l2 10z" fill={shade(c, 0.1)} />
          <path d="M88 54l6-8v16z" fill={shade(c, -0.1)} />
          {[30, 40, 70].map((x) => <circle key={x} cx={x} cy="54" r="1.5" fill="#8fd3f4" />)}
        </g>
      );
    case "satellite":
      return (
        <g>
          <Stand />
          <rect x="40" y="34" width="20" height="24" rx="2" fill={c} />
          <rect x="6" y="40" width="30" height="12" fill={a} stroke="#9fc2ea" />
          <rect x="64" y="40" width="30" height="12" fill={a} stroke="#9fc2ea" />
          {[14, 22, 72, 80].map((x) => <path key={x} d={`M${x} 40v12`} stroke="#9fc2ea" />)}
          <path d="M36 46h4M60 46h4" stroke="#999" strokeWidth="2" />
          <path d="M50 34V24M44 22a6 6 0 0012 0" stroke="#cfd6dd" strokeWidth="2" fill="none" />
        </g>
      );
    case "rocket":
      return (
        <g>
          <ellipse cx="50" cy="92" rx="22" ry="5" fill="#6b4a2b" />
          <path d="M50 6c10 10 14 24 14 40v34H36V46c0-16 4-30 14-40z" fill={c} />
          <path d="M50 6c6 6 10 14 12 22H38c2-8 6-16 12-22z" fill={a} />
          <path d="M36 66l-10 18h10zM64 66l10 18H64z" fill={a} />
          <circle cx="50" cy="44" r="6" fill="#5fb3ff" stroke={shade(c, -0.2)} strokeWidth="2" />
          <path d="M42 84h16l-3 6h-10z" fill="#f2a93b" />
        </g>
      );
    case "station":
      return (
        <g>
          <Stand />
          <rect x="44" y="30" width="12" height="40" rx="3" fill={c} />
          <rect x="26" y="44" width="48" height="10" rx="3" fill={shade(c, -0.1)} />
          {[8, 70].map((x) => (
            <g key={x}>
              <rect x={x} y="28" width="22" height="16" fill={a} stroke="#fff" strokeWidth=".8" />
              <rect x={x} y="54" width="22" height="16" fill={a} stroke="#fff" strokeWidth=".8" />
            </g>
          ))}
          <path d="M30 44v-0M19 44v10M81 44v10" stroke="#999" strokeWidth="2" />
        </g>
      );
    case "trophy":
      return (
        <g>
          <rect x="34" y="78" width="32" height="12" rx="2" fill="#6b4a2b" />
          <rect x="44" y="64" width="12" height="14" fill={shade(c, -0.15)} />
          <circle cx="50" cy="40" r="22" fill={c} />
          <path d="M38 34c4-3 8-2 9 1s-1 6 3 8M54 50c3 0 6 2 5 6M54 28c4 0 8 3 9 7" stroke="#b9801a" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <circle cx="42" cy="32" r="5" fill="#fff" opacity=".4" />
        </g>
      );
  }
  return <rect x="20" y="20" width="60" height="60" rx="10" fill={c} />;
}

function Stand() {
  return (
    <g>
      <rect x="44" y="66" width="12" height="16" fill="#8a6a3b" />
      <rect x="26" y="82" width="48" height="10" rx="3" fill="#6b4a2b" />
      <rect x="26" y="82" width="48" height="3" rx="1.5" fill="#8a6a3b" />
    </g>
  );
}

/** Window view for each headquarters room. */
export function RoomView({ art }: { art: string }) {
  switch (art) {
    case "city":
      return (
        <g>
          <rect width="100" height="100" fill="#2b4a7a" />
          <rect width="100" height="60" fill="url(#dusk)" />
          {[[4, 40], [16, 28], [30, 46], [42, 20], [56, 36], [70, 26], [84, 44]].map(([x, h], i) => (
            <g key={i}>
              <rect x={x} y={100 - h - 30} width="12" height={h + 30} fill={i % 2 ? "#1c2f4f" : "#243c63"} />
              {Array.from({ length: 5 }).map((_, k) => (
                <rect key={k} x={x + 3 + (k % 2) * 5} y={100 - h - 24 + k * 9} width="2.5" height="3" fill="#f7d77a" opacity={(i + k) % 3 ? 0.9 : 0.25} />
              ))}
            </g>
          ))}
        </g>
      );
    case "harbor":
      return (
        <g>
          <rect width="100" height="55" fill="#9fd3f4" />
          <rect y="55" width="100" height="45" fill="#2f7fa8" />
          <path d="M0 62h100M0 72h100" stroke="#fff" strokeOpacity=".2" />
          <rect x="20" y="46" width="40" height="9" fill="#c8372d" />
          {[22, 30, 38, 46].map((x, i) => <rect key={x} x={x} y="40" width="7" height="6" fill={["#2f80ed", "#f2b134", "#2f9e6e", "#d64545"][i]} />)}
          <path d="M72 55V20l14 35" stroke="#555" strokeWidth="2" fill="none" />
          <circle cx="82" cy="16" r="6" fill="#fff6c9" />
        </g>
      );
    case "alpine":
      return (
        <g>
          <rect width="100" height="100" fill="#bfe3ff" />
          <path d="M0 80L24 36l18 26 16-34 22 30 20-18v60H0z" fill="#6f8fa8" />
          <path d="M24 36l6 10-6-2-5 4zM58 28l7 12-7-3-6 4z" fill="#fff" />
          <path d="M0 86c20-6 40 0 60-4s30 2 40 0v18H0z" fill="#5d9c4e" />
        </g>
      );
    case "situation":
      return (
        <g>
          <rect width="100" height="100" fill="#0f1720" />
          {[0, 1, 2].map((i) => (
            <rect key={i} x={6 + i * 31} y="20" width="26" height="18" fill="#1e3a5c" stroke="#57d3c9" strokeOpacity=".5" />
          ))}
          <path d="M10 70h80" stroke="#57d3c9" strokeOpacity=".3" />
        </g>
      );
    case "embassy":
      return (
        <g>
          <rect width="100" height="100" fill="#cfe6f5" />
          <rect y="60" width="100" height="40" fill="#7fae63" />
          <path d="M20 60V36h60v24" fill="#efe9d8" />
          <path d="M16 36L50 20l34 16z" fill="#d9cfb5" />
          {[26, 38, 50, 62, 74].map((x) => <rect key={x} x={x - 2} y="40" width="4" height="20" fill="#fff" />)}
          <path d="M50 20V8" stroke="#555" />
          <path d="M50 8h10v6H50z" fill="#4b92db" />
        </g>
      );
    case "orbital":
      return (
        <g>
          <rect width="100" height="100" fill="#050816" />
          {Array.from({ length: 18 }).map((_, i) => <circle key={i} cx={(i * 37) % 100} cy={(i * 23) % 60} r={i % 3 ? 0.6 : 1} fill="#fff" />)}
          <circle cx="50" cy="130" r="80" fill="#2d86cc" />
          <path d="M8 74c10-6 22-4 30 2s20 2 26-4 20-4 30 2" stroke="#7dba67" strokeWidth="9" fill="none" strokeLinecap="round" />
          <circle cx="50" cy="130" r="80" fill="none" stroke="#9fe0ff" strokeOpacity=".6" strokeWidth="2" />
        </g>
      );
    default: // basement
      return (
        <g>
          <rect width="100" height="100" fill="#8fbbd9" />
          <rect y="64" width="100" height="36" fill="#6e8b4f" />
          <path d="M8 64c4-10 10-10 14 0M60 64c3-8 9-8 12 0" fill="#4e6d38" />
        </g>
      );
  }
}
