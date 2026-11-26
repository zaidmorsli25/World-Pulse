/**
 * Lightweight, deterministic classification used before (and as a fallback to) AI summarization:
 * relevance filtering, category detection and country / figure entity matching.
 */
import countries from "@/data/generated/countries.json";
import { FIGURES } from "@/data/figures";
import type { Category } from "../types";

type CountryRec = { id: string; name: string; official: string; capital: string | null };

const ALIASES: Record<string, string[]> = {
  USA: ["united states", "u.s.", "us", "america", "american", "americans", "washington", "white house", "pentagon"],
  GBR: ["britain", "british", "uk", "u.k.", "england", "scotland", "wales", "london", "downing street"],
  RUS: ["russia", "russian", "russians", "kremlin", "moscow"],
  CHN: ["china", "chinese", "beijing"],
  UKR: ["ukraine", "ukrainian", "ukrainians", "kyiv"],
  ISR: ["israel", "israeli", "israelis"],
  PSE: ["palestinian", "palestinians", "gaza", "west bank"],
  IRN: ["iran", "iranian", "tehran"],
  IND: ["india", "indian", "new delhi"],
  PAK: ["pakistan", "pakistani", "islamabad"],
  JPN: ["japan", "japanese", "tokyo"],
  KOR: ["south korea", "south korean", "seoul"],
  PRK: ["north korea", "north korean", "pyongyang"],
  TWN: ["taiwan", "taiwanese", "taipei"],
  DEU: ["germany", "german", "berlin"],
  FRA: ["france", "french", "paris"],
  ITA: ["italy", "italian", "rome"],
  ESP: ["spain", "spanish", "madrid"],
  POL: ["poland", "polish", "warsaw"],
  TUR: ["turkey", "türkiye", "turkiye", "turkish", "ankara"],
  SAU: ["saudi", "saudi arabia", "riyadh"],
  ARE: ["uae", "emirates", "emirati", "abu dhabi", "dubai"],
  EGY: ["egypt", "egyptian", "cairo"],
  SYR: ["syria", "syrian", "damascus"],
  LBN: ["lebanon", "lebanese", "beirut", "hezbollah"],
  YEM: ["yemen", "yemeni", "houthi", "houthis"],
  SDN: ["sudan", "sudanese", "khartoum", "darfur"],
  NGA: ["nigeria", "nigerian", "abuja"],
  ZAF: ["south africa", "south african", "pretoria"],
  MEX: ["mexico", "mexican"],
  CAN: ["canada", "canadian", "ottawa"],
  BRA: ["brazil", "brazilian", "brasilia"],
  ARG: ["argentina", "argentine", "buenos aires"],
  VEN: ["venezuela", "venezuelan", "caracas"],
  AUS: ["australia", "australian", "canberra"],
  COD: ["congo", "drc", "kinshasa"],
  AFG: ["afghanistan", "afghan", "taliban", "kabul"],
};

const STOP_ALIAS = new Set(["us"]); // too ambiguous in lowercase prose; only matched as "U.S." / "US " in original case

interface Matcher {
  id: string;
  re: RegExp;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const COUNTRY_MATCHERS: Matcher[] = (countries as CountryRec[]).map((c) => {
  const names = new Set([c.name.toLowerCase(), ...(ALIASES[c.id] ?? []).filter((a) => !STOP_ALIAS.has(a))]);
  if (c.capital && c.capital.length > 4) names.add(c.capital.toLowerCase());
  return { id: c.id, re: new RegExp(`\\b(${[...names].map(esc).join("|")})\\b`, "i") };
});

const FIGURE_MATCHERS: Matcher[] = FIGURES.map((f) => {
  const parts = f.name.replace(/^(King|Queen)\s+/, "").split(" ");
  const last = parts[parts.length - 1];
  const variants = [f.name, parts.length > 1 && last.length > 3 ? `${parts[0]} ${last}` : null].filter(Boolean) as string[];
  return { id: f.id, re: new RegExp(`\\b(${variants.map(esc).join("|")})\\b`, "i") };
});

export function detectCountries(text: string): string[] {
  const found = COUNTRY_MATCHERS.filter((m) => m.re.test(text)).map((m) => m.id);
  if (/\bU\.?S\.?\b(?![a-z])/.test(text) && !found.includes("USA")) found.push("USA");
  return found;
}

export function detectFigures(text: string): string[] {
  return FIGURE_MATCHERS.filter((m) => m.re.test(text)).map((m) => m.id);
}

const CATEGORY_KEYWORDS: [Category, RegExp][] = [
  ["conflict", /\b(war|strike[sd]?|missile|drone|troops|offensive|ceasefire|shelling|killed|attack|militants?|frontline|invasion|airstrikes?)\b/i],
  ["election", /\b(election|elections|vote|voters|ballot|polls|campaign|referendum|runoff|electoral)\b/i],
  ["sanctions", /\b(sanction|sanctions|embargo|export controls?|blacklist)\b/i],
  ["trade", /\b(tariff|tariffs|trade deal|trade war|exports?|imports?|shipping|supply chain|customs|wto)\b/i],
  ["energy", /\b(oil|gas|opec|lng|pipeline|energy|nuclear power|electricity|crude|renewable)\b/i],
  ["economy", /\b(inflation|interest rates?|central bank|gdp|recession|economy|economic|debt|imf|budget|currency|markets?)\b/i],
  ["humanitarian", /\b(famine|refugees?|humanitarian|aid|displaced|earthquake|flood|cyclone|cholera|hunger|evacuat)\w*\b/i],
  ["organizations", /\b(united nations|u\.n\.|security council|nato|european union|african union|asean|g7|g20|world health organization|world bank|brics)\b/i],
  ["diplomacy", /\b(summit|talks|diplomat|diplomatic|envoy|negotiat\w*|treaty|accord|foreign minister|state visit|peace deal)\b/i],
  ["technology", /\b(ai|artificial intelligence|semiconductor|chips?|cyber|satellite|tech|technology|5g|quantum)\b/i],
  ["security", /\b(military|defen[cs]e|security|nuclear weapons?|espionage|spy|coast guard|navy|army)\b/i],
  ["leadership", /\b(prime minister|president|resign\w*|cabinet|coalition|parliament|impeach\w*|coup|sworn in|successor)\b/i],
];

const EXCLUDE = /\b(celebrity|oscars?|grammys?|box office|recipe|fashion week|premier league|nfl|nba|world cup squad|transfer window|horoscope|royal baby|reality tv|album|movie review|tv review)\b/i;

/** Very cheap geopolitical relevance score (0..1) used to drop off-topic items before clustering. */
export function relevance(text: string): number {
  if (EXCLUDE.test(text)) return 0;
  let hits = 0;
  for (const [, re] of CATEGORY_KEYWORDS) if (re.test(text)) hits++;
  const geo = detectCountries(text).length > 0 ? 1 : 0;
  return Math.min(1, hits * 0.25 + geo * 0.35);
}

export function categorize(text: string): Category {
  let best: Category = "diplomacy";
  let bestHits = 0;
  for (const [cat, re] of CATEGORY_KEYWORDS) {
    const m = text.match(new RegExp(re.source, "gi"));
    const n = m ? m.length : 0;
    if (n > bestHits) {
      best = cat;
      bestHits = n;
    }
  }
  return best;
}
