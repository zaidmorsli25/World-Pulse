import { handler, json } from "@/lib/server/http";
import { getPortraits } from "@/lib/server/portraits";

export const maxDuration = 60;

/** Freely licensed portraits for the political figures directory, with author and license. */
export const GET = handler({ limit: 60 }, async () => {
  const portraits = await getPortraits();
  return json({ portraits }, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" } });
});
