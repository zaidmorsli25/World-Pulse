import "server-only";
import { FIGURES } from "@/data/figures";
import { getStore } from "./store";

export interface Portrait {
  url: string;
  credit: string;
  license: string;
  /** the Wikimedia Commons file page, which has the full license details */
  source: string;
}

const META_KEY = "figure-portraits-v1";
const MAX_AGE_MS = 7 * 24 * 3600_000;
const UA = "WorldPulse/1.0 (educational news game; https://world-pulse-ivory.vercel.app)";

/** Only freely licensed photos: public domain, CC0, or Creative Commons Attribution (incl. ShareAlike). */
export function isFreeLicense(name: string): boolean {
  const n = name.trim().toLowerCase();
  if (!n) return false;
  if (/\bnc\b|non-?commercial|\bnd\b|no ?deriv|fair use|non-free/.test(n)) return false;
  return /public domain|^pd\b|^pd-|cc0|^cc[ -]by\b|creative commons attribution|^ogl|open government licen[cs]e|^attribution$|kremlin\.ru|gfdl|godl/.test(n);
}

/** Plain text from the HTML snippets Commons returns for authors and credits. */
export function plainText(html: string, max = 90): string {
  const t = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

async function api<T>(base: string, params: Record<string, string>): Promise<T> {
  const url = `${base}?${new URLSearchParams({ format: "json", formatversion: "2", origin: "*", ...params })}`;
  const res = await fetch(url, { headers: { "User-Agent": UA, "Api-User-Agent": UA }, cache: "no-store" });
  if (!res.ok) throw new Error(`${new URL(base).host} answered ${res.status}`);
  return (await res.json()) as T;
}

interface PagesReply {
  query?: {
    normalized?: { from: string; to: string }[];
    redirects?: { from: string; to: string }[];
    pages?: { title: string; missing?: boolean; pageimage?: string; thumbnail?: { source: string } }[];
  };
}
interface ImageReply {
  query?: {
    normalized?: { from: string; to: string }[];
    pages?: { title: string; imageinfo?: { thumburl?: string; descriptionurl?: string; extmetadata?: Record<string, { value: string }> }[] }[];
  };
}

/** Looks up each figure's Wikipedia lead photo and keeps only freely licensed ones. */
export async function resolvePortraits(): Promise<Record<string, Portrait>> {
  const titleOf = new Map(FIGURES.map((f) => [f.id, f.wiki ?? f.name]));
  const titles = [...new Set(titleOf.values())];
  const fileForTitle = new Map<string, string>();
  for (let i = 0; i < titles.length; i += 40) {
    const batch = titles.slice(i, i + 40);
    const r = await api<PagesReply>("https://en.wikipedia.org/w/api.php", { action: "query", redirects: "1", prop: "pageimages", piprop: "name", titles: batch.join("|") });
    const follow = new Map<string, string>();
    for (const n of [...(r.query?.normalized ?? []), ...(r.query?.redirects ?? [])]) follow.set(n.from, n.to);
    const files = new Map((r.query?.pages ?? []).filter((p) => p.pageimage).map((p) => [p.title, p.pageimage!]));
    for (const t of batch) {
      let cur = t;
      for (let k = 0; k < 3 && follow.has(cur); k++) cur = follow.get(cur)!;
      const file = files.get(cur);
      if (file) fileForTitle.set(t, file);
    }
  }
  const infoForFile = new Map<string, Portrait>();
  const fileNames = [...new Set(fileForTitle.values())];
  for (let i = 0; i < fileNames.length; i += 25) {
    const batch = fileNames.slice(i, i + 25).map((f) => `File:${f}`);
    const r = await api<ImageReply>("https://commons.wikimedia.org/w/api.php", { action: "query", prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "320", titles: batch.join("|") });
    const back = new Map((r.query?.normalized ?? []).map((n) => [n.to, n.from]));
    for (const p of r.query?.pages ?? []) {
      const ii = p.imageinfo?.[0];
      const meta = ii?.extmetadata ?? {};
      const license = plainText(meta.LicenseShortName?.value ?? "", 40);
      if (!ii?.thumburl || !isFreeLicense(license)) continue;
      const artist = plainText(meta.Artist?.value ?? "") || plainText(meta.Credit?.value ?? "") || "Wikimedia Commons";
      const name = (back.get(p.title) ?? p.title).replace(/^File:/, "");
      infoForFile.set(name.replace(/ /g, "_"), { url: ii.thumburl, credit: artist, license, source: ii.descriptionurl ?? `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}` });
    }
  }
  const out: Record<string, Portrait> = {};
  for (const [id, title] of titleOf) {
    const file = fileForTitle.get(title);
    const info = file ? infoForFile.get(file.replace(/ /g, "_")) : undefined;
    if (info) out[id] = info;
  }
  return out;
}

let memo: { at: number; data: Record<string, Portrait> } | null = null;

/** Cached portraits: refreshed weekly, or sooner when the directory gains people. */
export async function getPortraits(): Promise<Record<string, Portrait>> {
  if (memo && Date.now() - memo.at < 3600_000) return memo.data;
  const store = getStore();
  const saved = await store.getMeta<{ at: string; ids: string[]; data: Record<string, Portrait> }>(META_KEY).catch(() => null);
  const ids = FIGURES.map((f) => f.id).sort();
  const fresh = saved && Date.now() - Date.parse(saved.at) < MAX_AGE_MS && saved.ids.join() === ids.join();
  if (fresh) {
    memo = { at: Date.now(), data: saved.data };
    return saved.data;
  }
  try {
    const data = await resolvePortraits();
    await store.setMeta(META_KEY, { at: new Date().toISOString(), ids, data }).catch(() => undefined);
    memo = { at: Date.now(), data };
    return data;
  } catch (e) {
    console.error("[portraits] lookup failed", e);
    const data = saved?.data ?? {};
    memo = { at: Date.now() - 3600_000 + 10 * 60_000, data }; // retry in 10 minutes
    return data;
  }
}
