import "server-only";
import { newPlayer, touchDaily, type EngineResult } from "@/lib/game/engine";
import type { GameEvents, PlayerState, QuizAttempt } from "@/lib/types";
import { getStore } from "./store";
import { ConflictError } from "./store/types";
import { HttpError } from "./http";

const noEvents = (): GameEvents => ({ achievements: [], coins: 0, xp: 0 });

function mergeEvents(a: GameEvents, b: GameEvents): GameEvents {
  return {
    achievements: [...a.achievements, ...b.achievements],
    coins: a.coins + b.coins,
    xp: a.xp + b.xp,
    levelUp: a.levelUp && b.levelUp ? { from: a.levelUp.from, to: b.levelUp.to } : (b.levelUp ?? a.levelUp),
    rankUp: a.rankUp && b.rankUp ? { from: a.rankUp.from, to: b.rankUp.to } : (b.rankUp ?? a.rankUp),
  };
}

/**
 * Loads the player, applies the daily roll-over, runs `mutate` (a pure engine function) and
 * saves the result with optimistic concurrency, retrying on conflicts. All currency maths
 * happens here on the server.
 */
export async function withPlayer<T extends EngineResult & { attempt?: QuizAttempt }>(
  userId: string,
  mutate?: (p: PlayerState, now: Date) => T,
): Promise<{ state: PlayerState; events: GameEvents; result?: T }> {
  const store = getStore();
  for (let attempt = 0; attempt < 3; attempt++) {
    const now = new Date();
    let loaded = await store.loadPlayer(userId);
    let expected = loaded?.version ?? -1;
    let ledger = [] as EngineResult["ledger"];
    if (!loaded) {
      const user = await store.getUser(userId);
      if (!user) throw new HttpError(401, "Account not found. Please log in again.", "unauthenticated");
      const created = newPlayer(userId, user.username, now);
      loaded = created.state;
      ledger = created.ledger;
      expected = -1;
    }
    const daily = touchDaily(loaded, now);
    let state = daily.state;
    let events = daily.events;
    ledger = [...ledger, ...daily.ledger];
    let result: T | undefined;
    if (mutate) {
      result = mutate(state, now);
      state = result.state;
      events = mergeEvents(events, result.events);
      ledger = [...ledger, ...result.ledger];
    }
    if (state === loaded && expected !== -1) return { state, events: noEvents(), result };
    if (state.version <= expected) state = { ...state, version: expected + 1 };
    try {
      await store.savePlayer(state, expected, ledger, result?.attempt);
      return { state, events, result };
    } catch (e) {
      if (!(e instanceof ConflictError) || attempt === 2) throw e;
    }
  }
  throw new ConflictError();
}
