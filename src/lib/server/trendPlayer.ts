import "server-only";
import { HttpError } from "./http";
import { getPublicTrends } from "./trends";

/** The approved trend a player action is about (drafts are never visible to players). */
export async function findPublicTrend(id: string) {
  const all = await getPublicTrends();
  const t = all.find((x) => x.id === id);
  if (!t) throw new HttpError(404, "That trend does not exist.", "not_found");
  return { t, all };
}
