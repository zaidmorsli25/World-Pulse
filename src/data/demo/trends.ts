/**
 * DEMO TRENDS. Fictional, illustrative trends that link the demo scenarios, so players can try the
 * trend lines and lens when live news is not connected. Always flagged `isDemo`.
 */
import type { NewsEvent } from "@/lib/types";
import type { Trend, TrendLink } from "@/lib/trends";

function link(events: Map<string, NewsEvent>, eventId: string, kind: TrendLink["kind"], label: string, note: string, at: string): TrendLink | null {
  const e = events.get(eventId);
  if (!e) return null;
  return { eventId, kind, label, note, source: { publication: "Demo", headline: e.title, url: null }, addedAt: at, eventTitle: e.title, eventDate: e.eventDate, country: e.countries[0] };
}

export function buildDemoTrends(events: NewsEvent[], now: Date): Trend[] {
  const byId = new Map(events.map((e) => [e.id, e]));
  const at = now.toISOString();
  const day = (d: number) => new Date(now.getTime() - d * 86400_000).toISOString().slice(0, 10);
  const mk = (t: Omit<Trend, "links" | "createdAt" | "lastStoryAt" | "status" | "isDemo">, links: (TrendLink | null)[]): Trend => ({
    ...t,
    status: "active",
    isDemo: true,
    createdAt: at,
    approvedAt: at,
    lastStoryAt: at,
    links: links.filter(Boolean) as TrendLink[],
  });
  return [
    mk(
      {
        id: "demo-chokepoints",
        name: "Shipping chokepoints under strain",
        color: "#00c2d1",
        cause: "A handful of narrow sea passages carry a huge share of world trade, so trouble at any one of them ripples through supply chains.",
        summary: [
          "In these demo scenarios, three of the world's key sea routes face pressure at the same time: a grounding in the Strait of Malacca, drought planning at the Panama Canal, and new traffic through the warming Arctic.",
          "Chokepoints matter because ships have few alternatives. A delay of a few days in one strait can push up shipping costs and leave factories waiting for parts on other continents.",
          "Watch for: insurance costs for ships, new routes opening as Arctic ice melts, and investment in canals and ports.",
        ],
        timeline: [
          { date: day(4), text: "Panama Canal authority approves the next phase of a reservoir to protect water supply." },
          { date: day(3), text: "Arctic states agree to share rescue ships as sea traffic grows." },
          { date: day(1), text: "Container ship runs aground in the Strait of Malacca." },
        ],
      },
      [
        link(byId, "demo-malacca-shipping", "direct", "Blocked strait", "A grounding narrowed one of the busiest trade routes on Earth.", at),
        link(byId, "demo-panama-water", "direct", "Canal water", "Droughts limit how many ships the Panama Canal can move.", at),
        link(byId, "demo-arctic-sar", "ripple", "New Arctic routes", "Melting ice is opening a new shipping route, and rescue plans follow the traffic.", at),
      ],
    ),
    mk(
      {
        id: "demo-climate-security",
        name: "Climate change as a security issue",
        color: "#ff7a1a",
        cause: "A warming climate is changing borders of ice and water, and governments now treat it as a matter of security, not just the environment.",
        summary: [
          "In these demo scenarios, rising seas, drought and melting ice each force governments to act: Pacific islands ask for help, Panama secures its water, and Arctic states plan for new traffic.",
          "The common thread is that climate effects now drive decisions about trade, migration and defence.",
        ],
        timeline: [
          { date: day(4), text: "Pacific leaders call for faster emission cuts and adaptation finance." },
          { date: day(4), text: "Panama advances a reservoir to guard against drought." },
          { date: day(3), text: "Arctic states plan joint search and rescue as ice retreats." },
        ],
      },
      [
        link(byId, "demo-pacific-forum", "direct", "Rising seas", "Low-lying islands face rising seas and ask for adaptation money.", at),
        link(byId, "demo-panama-water", "direct", "Drought", "Drought threatens the lakes that feed the canal.", at),
        link(byId, "demo-arctic-sar", "direct", "Melting ice", "Retreating sea ice brings more ships, and more risk, to the Arctic.", at),
      ],
    ),
  ];
}
