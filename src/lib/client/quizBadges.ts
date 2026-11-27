// Placement of answer letters on map quiz questions.

export type Cand = { id: string; d: string; c: [number, number]; b: [[number, number], [number, number]] } | null;

/**
 * Where each answer letter goes. Big countries get the letter on top of them. Small ones (like
 * Kuwait or Lebanon) would be hidden under it, so their letter moves out to the side, away from
 * the other candidates, and a line points back to the country.
 */
export function placeBadges(cands: Cand[], W: number, H: number) {
  const ok = cands.filter(Boolean) as NonNullable<Cand>[];
  const mid = ok.length ? [ok.reduce((a, c) => a + c.c[0], 0) / ok.length, ok.reduce((a, c) => a + c.c[1], 0) / ok.length] : [W / 2, H / 2];
  const placed: [number, number][] = [];
  return cands.map((c) => {
    if (!c) return null;
    const w = c.b[1][0] - c.b[0][0];
    const h = c.b[1][1] - c.b[0][1];
    const small = Math.min(w, h) < 30 || w * h < 1400;
    let badge: [number, number] = [c.c[0], c.c[1]];
    if (small) {
      let ax = c.c[0] - mid[0];
      let ay = c.c[1] - mid[1];
      const len = Math.hypot(ax, ay);
      if (len < 8) [ax, ay] = [0.7, -0.7];
      else [ax, ay] = [ax / len, ay / len];
      const dist = Math.max(w, h) / 2 + 30;
      // Try 8 directions. Avoid landing on any other answer country; among the clear spots,
      // prefer pointing away from the group, and stay inside the map.
      let best = Infinity;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const dx = Math.cos(a);
        const dy = Math.sin(a);
        const p: [number, number] = [c.c[0] + dx * dist, c.c[1] + dy * dist];
        const overlaps = ok.filter((o) => o !== c && p[0] > o.b[0][0] - 10 && p[0] < o.b[1][0] + 10 && p[1] > o.b[0][1] - 10 && p[1] < o.b[1][1] + 10).length;
        const outside = p[0] < 14 || p[1] < 14 || p[0] > W - 14 || p[1] > H - 14 ? 1 : 0;
        const score = overlaps * 100 + outside * 50 - (dx * ax + dy * ay) * 10;
        if (score < best) {
          best = score;
          badge = p;
        }
      }
    }
    // keep clear of the edges and of letters already placed
    for (let tries = 0; tries < 8; tries++) {
      badge = [Math.min(W - 14, Math.max(14, badge[0])), Math.min(H - 14, Math.max(14, badge[1]))];
      const hit = placed.find((q) => Math.hypot(q[0] - badge[0], q[1] - badge[1]) < 26);
      if (!hit) break;
      badge = [badge[0] + (badge[0] >= hit[0] ? 16 : -16), badge[1] + (badge[1] >= hit[1] ? 16 : -16)];
    }
    placed.push(badge);
    return { ...c, small, badge };
  });
}

