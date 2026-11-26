/* eslint-disable @typescript-eslint/no-explicit-any -- one-off build script over untyped third-party JSON */
/**
 * Builds the map + country reference data from openly licensed sources:
 *  - world-atlas (Natural Earth 1:50m, public domain) for country shapes
 *  - world-countries (mledoze/countries, ODbL) for names, capitals, regions, languages, currencies
 *
 * Output:
 *  - public/geo/world-50m.json   TopoJSON with feature ids rewritten to ISO 3166-1 alpha-3 codes
 *  - src/data/generated/countries.json   compact reference records keyed by the same ids
 *
 * Run with: npm run geo
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const topo = JSON.parse(fs.readFileSync(require.resolve("world-atlas/countries-50m.json"), "utf8"));
const wc: any[] = require("world-countries");

// Areas that Natural Earth draws separately but that have no undisputed ISO code.
// Described neutrally; WorldPulse takes no position on sovereignty.
const SPECIAL: Record<string, { id: string; name: string; note: string; parent?: string }> = {
  Somaliland: { id: "SOL", name: "Somaliland", note: "Self-declared state; internationally recognized as part of Somalia by most governments.", parent: "SOM" },
  Kosovo: { id: "XKX", name: "Kosovo", note: "Declared independence from Serbia in 2008; recognized by many but not all UN members." },
  "N. Cyprus": { id: "CYN", name: "Northern Cyprus", note: "Recognized only by Türkiye; most governments regard it as part of Cyprus.", parent: "CYP" },
  "Indian Ocean Ter.": { id: "IOA", name: "Australian Indian Ocean Territories", note: "Christmas Island and the Cocos (Keeling) Islands, external territories of Australia.", parent: "AUS" },
  "Ashmore and Cartier Is.": { id: "ACI", name: "Ashmore and Cartier Islands", note: "Uninhabited external territory of Australia.", parent: "AUS" },
  "Siachen Glacier": { id: "SIA", name: "Siachen Glacier", note: "Contested area in the Karakoram claimed by India and Pakistan.", },
};
const DISPUTED_NOTES: Record<string, string> = {
  ESH: "Status disputed: claimed by Morocco and by the Sahrawi Arab Democratic Republic (Polisario Front); listed by the UN as a non-self-governing territory.",
  TWN: "Governed by the Republic of China (Taiwan); the People's Republic of China claims it. Recognized diplomatically by a small number of states.",
  PSE: "The State of Palestine is a UN non-member observer state recognized by most UN members; its territory is partly under Israeli occupation and control.",
  XKX: SPECIAL.Kosovo.note,
};

const flag = (cca2: string) =>
  cca2 && cca2.length === 2 && /^[A-Z]{2}$/.test(cca2)
    ? String.fromCodePoint(...[...cca2].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
    : "🏳️";

const byNum = new Map<string, any>();
for (const c of wc) if (c.ccn3) byNum.set(c.ccn3, c);
const byIso3 = new Map<string, any>(wc.map((c) => [c.cca3, c]));

const records: any[] = [];
const seen = new Set<string>();
for (const g of topo.objects.countries.geometries) {
  const name: string = g.properties?.name ?? "";
  let id: string;
  let c: any;
  const special = SPECIAL[name];
  if (special) {
    id = special.id;
    c = name === "Kosovo" ? byIso3.get("UNK") : undefined;
  } else {
    c = byNum.get(String(g.id));
    if (!c) throw new Error(`No reference record for ${g.id} ${name}`);
    id = c.cca3;
  }
  if (seen.has(id)) id = `${id}-${records.length}`;
  seen.add(id);
  g.id = id;
  g.properties = { name: special?.name ?? c?.name?.common ?? name };
  records.push({
    id,
    iso2: c?.cca2 ?? null,
    name: special?.name ?? c?.name?.common ?? name,
    official: c?.name?.official ?? special?.name ?? name,
    flag: c ? flag(c.cca2 === "XK" ? "XK" : c.cca2) : "🏳️",
    capital: c?.capital?.[0] ?? null,
    region: c?.region ?? (special?.parent ? byIso3.get(special.parent)?.region : null) ?? (id === "SIA" ? "Asia" : null),
    subregion: c?.subregion ?? (special?.parent ? byIso3.get(special.parent)?.subregion : null) ?? (id === "SIA" ? "Southern Asia" : null),
    areaKm2: c?.area ?? null,
    languages: c ? Object.values(c.languages ?? {}) : [],
    currencies: c ? Object.entries(c.currencies ?? {}).map(([code, v]: any) => `${v.name} (${code})`) : [],
    latlng: c?.latlng ?? null,
    borders: c?.borders ?? [],
    unMember: !!c?.unMember,
    independent: !!c?.independent,
    note: DISPUTED_NOTES[id] ?? special?.note ?? null,
    disputed: ["ESH", "TWN", "PSE", "XKX", "SOL", "CYN", "SIA"].includes(id),
    parent: special?.parent ?? null,
  });
}

fs.mkdirSync("public/geo", { recursive: true });
fs.writeFileSync("public/geo/world-50m.json", JSON.stringify(topo));
records.sort((a, b) => a.name.localeCompare(b.name));
fs.writeFileSync(path.join("src/data/generated/countries.json"), JSON.stringify(records, null, 1));
console.log(`Wrote ${records.length} map features and country records.`);
