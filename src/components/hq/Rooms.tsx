"use client";
// What you can do inside each floor of the HQ building. Every room is a small, honest learning activity.
import { useMemo, useState } from "react";
import { CATALOG, MAX_DISPLAY, RARITY_STYLE, SLOT_LABEL } from "@/lib/game/catalog";
import { sound } from "@/lib/client/sound";
import { COUNTRIES, type CountryInfo } from "@/lib/client/world";
import { connectQuizOpen, trendPages } from "@/lib/game/engine";
import type { ClaimKind, NewsEvent, Slot } from "@/lib/types";
import { REGIONS } from "@/lib/types";
import { CLAIM_KIND } from "../briefing/BriefingModal";
import { useGame } from "../game/GameProvider";
import { FollowButton } from "../trends/TrendBook";
import { HQScene, ItemThumb } from "./HQScene";
import type { RoomId } from "./Building";

export const ROOM_INFO: Record<RoomId, { name: string; item?: string; learn: string }> = {
  office: { name: "Office", learn: "Your desk, your style. Decorate it with things from the shop." },
  library: { name: "Library", learn: "Follow trends and fill their books: every briefing you read adds a page." },
  briefing: { name: "Briefing Room", item: "room-briefing", learn: "Practise telling confirmed facts from allegations, opinions and outlooks." },
  situation: { name: "Situation Room", item: "room-situation", learn: "See where the news is happening, and which parts of the world you have missed." },
  rooftop: { name: "Rooftop", item: "room-rooftop", learn: "Scan the skyline for capitals. How many can you name?" },
};

/** localStorage can be missing (private mode, previews), so every touch is guarded. */
function readBest(key: string): number {
  try {
    return Number(window.localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}
function writeBest(key: string, v: number) {
  try {
    window.localStorage.setItem(key, String(v));
  } catch {
    /* ignore */
  }
}

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-3xl border-2 border-parchment-200 bg-white p-4 sm:p-5 ${className}`}>{children}</div>;
}

// ------------------------------------------------------------------------------------------------ Office

const SLOTS: Slot[] = ["background", "desk", "wallmap", "monitor", "bookshelf", "flag", "globe", "display", "outfit", "headwear", "accessory"];
const OPTIONAL: Slot[] = ["headwear", "accessory", "wallmap", "monitor", "bookshelf", "flag", "globe"];

export function OfficeRoom() {
  const { player, backend, run, go } = useGame();
  const [slot, setSlot] = useState<Slot>("background");
  const [busy, setBusy] = useState(false);
  const owned = CATALOG.filter((i) => i.slot === slot && player.inventory.includes(i.id));
  const shelf = player.equipped.display ?? [];
  const current = slot === "display" ? null : (player.equipped as Record<string, string | undefined>)[slot];

  const equip = async (id: string | null) => {
    if (busy) return;
    setBusy(true);
    const r = await run(backend.equip(slot, id));
    if (r) sound.play("click");
    setBusy(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <HQScene player={player} />
      <div>
        <h3 className="mb-2 font-display text-lg font-bold text-navy-900">Decorate</h3>
        <div className="mb-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Item slot">
          {SLOTS.map((s) => (
            <button key={s} role="tab" aria-selected={slot === s} onClick={() => setSlot(s)} className={`rounded-xl px-2.5 py-1 text-sm font-semibold transition ${slot === s ? "bg-navy-800 text-white" : "bg-parchment-100 text-navy-700 hover:bg-parchment-200"}`}>
              {SLOT_LABEL[s]}
            </button>
          ))}
        </div>
        {slot === "display" && (
          <p className="mb-2 text-sm text-navy-700/80">
            Display shelf: {shelf.length} of {MAX_DISPLAY} spaces used.
          </p>
        )}
        {owned.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-parchment-200 p-6 text-center text-sm text-navy-700/80">
            You don&apos;t own any {SLOT_LABEL[slot].toLowerCase()} yet.{" "}
            <button className="font-semibold text-ocean-700 hover:underline" onClick={() => go("shop")}>
              Browse the shop
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {owned.map((it) => {
              const on = slot === "display" ? shelf.includes(it.id) : current === it.id;
              return (
                <button
                  key={it.id}
                  disabled={busy}
                  onClick={() => equip(slot === "display" ? it.id : on && OPTIONAL.includes(slot) ? null : it.id)}
                  aria-pressed={on}
                  className={`relative flex flex-col items-center rounded-2xl border-2 bg-white p-2 text-center transition hover:-translate-y-0.5 ${on ? "border-gold-400 shadow-pop" : "border-parchment-200"}`}
                  style={{ boxShadow: on ? `0 0 0 3px ${RARITY_STYLE[it.rarity].glow}` : undefined }}
                >
                  <ItemThumb item={it} size={72} avatar={player.avatar} />
                  <span className="mt-1 text-xs font-semibold leading-tight text-navy-900">{it.name}</span>
                  {on && <span className="absolute right-1.5 top-1.5 rounded-full bg-gold-400 px-1.5 text-[10px] font-bold text-navy-900">{slot === "display" ? "ON SHELF" : "IN USE"}</span>}
                </button>
              );
            })}
          </div>
        )}
        {current && OPTIONAL.includes(slot) && (
          <button className="mt-3 text-sm font-semibold text-ocean-700 hover:underline" disabled={busy} onClick={() => equip(null)}>
            Remove {SLOT_LABEL[slot].toLowerCase()} from HQ
          </button>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ Library

export function LibraryRoom() {
  const { player, trends, openBook, openBigPicture } = useGame();
  const books = player.trendBooks ?? {};
  const shelf = trends.filter((t) => books[t.id]?.following);
  const others = trends.filter((t) => t.status === "active" && !books[t.id]?.following);

  return (
    <div className="grid gap-5">
      <Card className="bg-gradient-to-b from-[#f6ecd9] to-white">
        <h3 className="font-display text-lg font-bold text-navy-900">Your bookshelf</h3>
        <p className="mb-4 text-sm text-navy-700/80">Every trend you follow gets a book. Each briefing you read in it adds a page, and full books unlock a connect-the-dots quiz.</p>
        {shelf.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed border-parchment-200 p-5 text-center text-sm text-navy-700/80">Your shelf is empty. Follow a trend below to put its book here.</p>
        ) : (
          <div className="flex flex-wrap items-end gap-3 border-b-8 border-[#8a5a32] px-2 pb-0.5">
            {shelf.map((t, i) => {
              const pages = trendPages(player, t).length;
              const total = new Set(t.links.map((l) => l.eventId)).size;
              const quiz = books[t.id]?.quiz;
              const ready = connectQuizOpen(player, t) && !quiz;
              const h = 128 + ((i * 17) % 28);
              return (
                <button key={t.id} onClick={() => openBook(t.id)} className="group relative flex w-[4.25rem] flex-col items-center justify-between rounded-t-md px-1.5 pb-2 pt-3 text-center text-white shadow-[inset_-6px_0_0_rgba(0,0,0,.18),inset_4px_0_0_rgba(255,255,255,.18)] transition hover:-translate-y-2 focus-visible:-translate-y-2" style={{ background: t.color, height: h }} aria-label={`Open the book for ${t.name}: ${pages} of ${total} pages`}>
                  <span className="line-clamp-4 text-[11px] font-extrabold leading-tight [text-shadow:0_1px_0_rgba(0,0,0,.3)]">{t.name}</span>
                  <span className="rounded-full bg-black/25 px-1.5 text-[10px] font-bold">
                    {pages}/{total}
                  </span>
                  {ready && <span className="absolute -right-2 -top-2 rounded-full bg-gold-400 px-1.5 text-[10px] font-extrabold text-navy-900 shadow">Quiz!</span>}
                  {quiz && <span className="absolute -right-2 -top-2 rounded-full bg-land-500 px-1.5 text-[10px] font-extrabold text-white shadow">{quiz.correct}/{quiz.total}</span>}
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <h3 className="font-display text-lg font-bold text-navy-900">Trends you could follow</h3>
        <p className="mb-3 text-sm text-navy-700/80">A trend links several stories with one cause. The more trends you follow, the bigger the bonus on every book reward.</p>
        {others.length === 0 ? (
          <p className="text-sm text-navy-700/80">{trends.length === 0 ? "No trends are running right now. New ones appear when the news connects." : "You follow every trend that is running. Nice work."}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {others.map((t) => (
              <li key={t.id} className="flex flex-col gap-2 rounded-2xl border-2 border-parchment-200 p-3" style={{ borderLeft: `6px solid ${t.color}` }}>
                <div className="font-bold text-navy-900">{t.name}</div>
                <p className="line-clamp-3 text-sm text-navy-700/85">{t.cause}</p>
                <div className="mt-auto flex flex-wrap gap-2">
                  <FollowButton t={t} />
                  <button className="btn btn-ghost !py-1.5 text-sm" onClick={() => openBigPicture(t.id)}>
                    The big picture
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ Situation Room

export function SituationRoom() {
  const { news, player, openEvent } = useGame();
  const events = news?.events ?? [];
  const read = new Set(player.briefingsRead);
  const [region, setRegion] = useState<string | null>(null);
  const rows = REGIONS.map((r) => {
    const list = events.filter((e) => e.region === r);
    return { region: r, total: list.length, read: list.filter((e) => read.has(e.id)).length };
  }).filter((r) => r.total > 0);
  const max = Math.max(1, ...rows.map((r) => r.total));
  const blind = rows.filter((r) => r.read < r.total).sort((a, b) => a.read / a.total - b.read / b.total)[0];
  const list = events
    .filter((e) => !region || e.region === region)
    .sort((a, b) => b.importance.score - a.importance.score)
    .slice(0, 6);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <Card className="!border-[#22324a] bg-gradient-to-b from-[#14202e] to-[#1c2c42] text-white">
        <h3 className="font-display text-lg font-bold">Where the news is</h3>
        <p className="mb-4 text-sm text-white/70">Stories on the map right now, by region. The bright part of each bar is what you have read.</p>
        {rows.length === 0 ? (
          <p className="text-sm text-white/70">No stories loaded yet.</p>
        ) : (
          <ul className="grid gap-2.5">
            {rows.map((r) => (
              <li key={r.region}>
                <button className={`w-full rounded-xl p-2 text-left transition hover:bg-white/10 ${region === r.region ? "bg-white/10 ring-2 ring-[#5eead4]" : ""}`} onClick={() => setRegion(region === r.region ? null : r.region)} aria-pressed={region === r.region}>
                  <div className="mb-1 flex justify-between text-sm font-bold">
                    <span>{r.region}</span>
                    <span className="text-white/70">
                      {r.read} of {r.total} read
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-white/10" style={{ width: `${(r.total / max) * 100}%` }}>
                    <div className="h-full rounded-full bg-[#5eead4]" style={{ width: `${(r.read / r.total) * 100}%` }} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
        {blind && (
          <p className="mt-4 rounded-2xl bg-white/10 p-3 text-sm">
            <span className="font-bold text-[#fde68a]">Blind spot:</span> you have read {blind.read} of {blind.total} stories from {blind.region}. Reading across regions helps you see how events connect.
          </p>
        )}
      </Card>
      <Card>
        <h3 className="font-display text-lg font-bold text-navy-900">{region ? `Top stories in ${region}` : "Top stories worldwide"}</h3>
        <p className="mb-3 text-sm text-navy-700/80">Ranked by importance: how widely it is covered and how far its effects reach.</p>
        <ul className="grid gap-2">
          {list.map((e) => (
            <StoryRow key={e.id} e={e} read={read.has(e.id)} onOpen={() => openEvent(e.id)} />
          ))}
        </ul>
      </Card>
    </div>
  );
}

function StoryRow({ e, read, onOpen }: { e: NewsEvent; read: boolean; onOpen: () => void }) {
  return (
    <li>
      <button onClick={onOpen} className="flex w-full items-center gap-3 rounded-2xl border-2 border-parchment-200 p-2.5 text-left transition hover:-translate-y-0.5 hover:border-ocean-400">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy-800 text-sm font-extrabold text-white">{e.importance.score}</span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm font-bold text-navy-900">{e.title}</span>
          <span className="text-xs text-navy-700/70">{e.region}</span>
        </span>
        {read ? <span className="chip bg-land-500/15 text-land-600">Read</span> : <span className="chip bg-gold-400/30 text-navy-900">New</span>}
      </button>
    </li>
  );
}

// ------------------------------------------------------------------------------------------------ Briefing Room

const SORT_KINDS: ClaimKind[] = ["fact", "allegation", "disputed", "opinion", "prediction"];
const ROUND = 8;

interface ClaimCard {
  text: string;
  kind: ClaimKind;
  eventId: string;
  title: string;
}

function dealClaims(events: NewsEvent[]): ClaimCard[] {
  const all: ClaimCard[] = [];
  for (const e of events) {
    const b = e.briefing;
    for (const c of [...b.whatHappened, ...b.background, ...b.whyItMatters, ...b.whatNext]) {
      if (c.text.length > 30 && c.text.length < 320) all.push({ text: c.text, kind: c.kind, eventId: e.id, title: e.title });
    }
  }
  // mostly facts appear in the news; keep the round varied so every label gets practice
  const facts = shuffle(all.filter((c) => c.kind === "fact"));
  const rest = shuffle(all.filter((c) => c.kind !== "fact"));
  const pick = [...rest.slice(0, Math.ceil(ROUND * 0.6)), ...facts].slice(0, ROUND);
  return shuffle(pick.length < ROUND ? [...pick, ...rest.slice(Math.ceil(ROUND * 0.6))].slice(0, ROUND) : pick);
}

export function BriefingRoom() {
  const { news, openEvent } = useGame();
  const events = useMemo(() => news?.events ?? [], [news]);
  const [deck, setDeck] = useState<ClaimCard[]>(() => dealClaims(events));
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<ClaimKind | null>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => readBest("wp-hq-claims-best"));
  const done = i >= deck.length;
  const card = deck[i];

  const pick = (k: ClaimKind) => {
    if (picked) return;
    setPicked(k);
    const ok = k === card.kind;
    sound.play(ok ? "correct" : "wrong");
    if (ok) setScore((s) => s + 1);
  };
  const next = () => {
    const end = i + 1 >= deck.length;
    if (end) {
      const final = score;
      if (final > best) {
        setBest(final);
        writeBest("wp-hq-claims-best", final);
      }
    }
    setPicked(null);
    setI(i + 1);
  };
  const again = () => {
    setDeck(dealClaims(events));
    setI(0);
    setScore(0);
    setPicked(null);
  };

  if (deck.length === 0) return <Card>No briefings are loaded yet, so there is nothing to sort. Come back once the map has stories.</Card>;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <Card className="bg-gradient-to-b from-[#e8eefb] to-white">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-display text-lg font-bold text-navy-900">Fact or opinion?</h3>
          <span className="chip bg-navy-800 text-white">{done ? "Finished" : `${i + 1} of ${deck.length}`}</span>
        </div>
        {done ? (
          <div className="text-center">
            <p className="font-display text-4xl font-bold text-navy-900">
              {score} of {deck.length}
            </p>
            <p className="mt-1 text-sm text-navy-700/80">Your best: {Math.max(best, score)} of {deck.length}</p>
            <p className="mx-auto mt-3 max-w-md text-sm text-navy-700/85">Good reporters label how sure they are. When you read any news, ask: is this confirmed, claimed by one side, argued over, someone&apos;s view, or a guess about the future?</p>
            <button className="btn btn-primary mt-4" onClick={again}>
              Deal new statements
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs font-bold uppercase tracking-wider text-navy-700/60">From: {card.title}</p>
            <blockquote className="my-3 rounded-2xl bg-white p-4 text-base font-semibold leading-snug text-navy-900 shadow-sm">&ldquo;{card.text}&rdquo;</blockquote>
            <p className="mb-2 text-sm font-semibold text-navy-800">How sure is the reporting about this statement?</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {SORT_KINDS.map((k) => {
                const isAnswer = picked && k === card.kind;
                const isWrong = picked === k && k !== card.kind;
                return (
                  <button key={k} disabled={!!picked} onClick={() => pick(k)} className={`flex flex-col rounded-2xl border-2 p-2.5 text-left transition ${isAnswer ? "border-land-500 bg-land-500/10" : isWrong ? "border-[#e5484d] bg-[#e5484d]/10" : "border-parchment-200 bg-white hover:border-ocean-400"} ${picked && !isAnswer && !isWrong ? "opacity-60" : ""}`}>
                    <span className={`chip w-fit ${CLAIM_KIND[k].cls}`}>{CLAIM_KIND[k].label}</span>
                    <span className="mt-1 text-xs text-navy-700/80">{CLAIM_KIND[k].tip}</span>
                  </button>
                );
              })}
            </div>
            {picked && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-parchment-100 p-3 text-sm">
                <span>
                  {picked === card.kind ? "Right. " : "Not quite. "}
                  The briefing labels this <b>{CLAIM_KIND[card.kind].label}</b>.
                  <button className="ml-1 font-semibold text-ocean-700 hover:underline" onClick={() => openEvent(card.eventId)}>
                    Read the briefing
                  </button>
                </span>
                <button className="btn btn-primary !py-1.5 text-sm" onClick={next}>
                  {i + 1 >= deck.length ? "See my score" : "Next statement"}
                </button>
              </div>
            )}
          </>
        )}
      </Card>
      <Card>
        <h3 className="mb-2 font-display text-lg font-bold text-navy-900">The five labels</h3>
        <ul className="grid gap-2 text-sm">
          {SORT_KINDS.map((k) => (
            <li key={k} className="flex items-start gap-2">
              <span className={`chip shrink-0 ${CLAIM_KIND[k].cls}`}>{CLAIM_KIND[k].label}</span>
              <span className="text-navy-700/85">{LABEL_HELP[k]}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-navy-700/70">Every statement comes from a real WorldPulse briefing, with the label our reporting gave it. This is practice: it has no coins, so play as often as you like.</p>
      </Card>
    </div>
  );
}

const LABEL_HELP: Record<ClaimKind, string> = {
  fact: "Several reliable outlets confirm it happened. Look for numbers, dates and official records.",
  allegation: "One side says it; nobody has independently checked yet. Watch for words like “said” or “accused”.",
  disputed: "The sides tell different stories and the facts are not settled.",
  opinion: "Someone's judgement or analysis. Reasonable people could disagree.",
  prediction: "What might happen next. Useful, but it has not happened yet.",
};

// ------------------------------------------------------------------------------------------------ Rooftop

const ROOF_ROUND = 10;
interface CapQ {
  c: CountryInfo;
  choices: string[];
}

const CAPITAL_POOL = COUNTRIES.filter((c) => c.capital && c.independent && c.unMember && c.region);

function dealCapitals(region: string | null): CapQ[] {
  const pool = CAPITAL_POOL.filter((c) => !region || c.region === region);
  return shuffle(pool)
    .slice(0, ROOF_ROUND)
    .map((c) => {
      // wrong answers come from the same region, so the round teaches geography, not guessing by continent
      const near = shuffle(CAPITAL_POOL.filter((x) => x.id !== c.id && x.region === c.region && x.capital !== c.capital)).slice(0, 3);
      return { c, choices: shuffle([c.capital!, ...near.map((x) => x.capital!)]) };
    });
}

const ROOF_REGIONS = ["Africa", "Americas", "Asia", "Europe", "Oceania"];

export function RooftopRoom() {
  const { flyToCountry, go } = useGame();
  const [region, setRegion] = useState<string | null>(null);
  const [qs, setQs] = useState<CapQ[]>(() => dealCapitals(null));
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const bestKey = `wp-hq-capitals-best-${region ?? "world"}`;
  const [best, setBest] = useState(() => readBest("wp-hq-capitals-best-world"));
  const done = i >= qs.length;
  const q = qs[i];

  const start = (r: string | null) => {
    setRegion(r);
    setQs(dealCapitals(r));
    setI(0);
    setScore(0);
    setPicked(null);
    setBest(readBest(`wp-hq-capitals-best-${r ?? "world"}`));
  };
  const pick = (cap: string) => {
    if (picked) return;
    setPicked(cap);
    const ok = cap === q.c.capital;
    sound.play(ok ? "correct" : "wrong");
    if (ok) setScore((s) => s + 1);
  };
  const next = () => {
    if (i + 1 >= qs.length && score > best) {
      setBest(score);
      writeBest(bestKey, score);
    }
    setPicked(null);
    setI(i + 1);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <Card className="bg-gradient-to-b from-[#1d3557] to-[#2d86cc] text-white">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-lg font-bold">Capital spotter</h3>
          <span className="chip bg-white/20 text-white">{done ? "Finished" : `${i + 1} of ${qs.length}`}</span>
        </div>
        <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Region">
          {[null, ...ROOF_REGIONS].map((r) => (
            <button key={r ?? "world"} onClick={() => start(r)} aria-pressed={region === r} className={`rounded-xl px-2.5 py-1 text-sm font-semibold transition ${region === r ? "bg-gold-400 text-navy-900" : "bg-white/15 hover:bg-white/25"}`}>
              {r ?? "Whole world"}
            </button>
          ))}
        </div>
        {done ? (
          <div className="text-center">
            <p className="font-display text-4xl font-bold">
              {score} of {qs.length}
            </p>
            <p className="mt-1 text-sm text-white/80">
              Your best{region ? ` in ${region}` : ""}: {Math.max(best, score)} of {qs.length}
            </p>
            <button className="btn btn-primary mt-4" onClick={() => start(region)}>
              New skyline
            </button>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-3">
              <span className="text-5xl leading-none" aria-hidden>
                {q.c.flag}
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-white/70">What is the capital of</p>
                <p className="font-display text-2xl font-bold leading-tight">{q.c.name}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {q.choices.map((cap) => {
                const right = picked && cap === q.c.capital;
                const wrong = picked === cap && cap !== q.c.capital;
                return (
                  <button key={cap} disabled={!!picked} onClick={() => pick(cap)} className={`rounded-2xl border-2 p-3 text-left font-bold transition ${right ? "border-land-500 bg-land-500 text-white" : wrong ? "border-[#e5484d] bg-[#e5484d] text-white" : "border-white/30 bg-white/10 hover:bg-white/20"} ${picked && !right && !wrong ? "opacity-60" : ""}`}>
                    {cap}
                  </button>
                );
              })}
            </div>
            {picked && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white/15 p-3 text-sm">
                <span>
                  {picked === q.c.capital ? "Spotted it. " : `It's ${q.c.capital}. `}
                  {q.c.subregion ? `${q.c.name} is in ${q.c.subregion}.` : ""}
                  <button
                    className="ml-1 font-semibold text-gold-300 underline-offset-2 hover:underline"
                    onClick={() => {
                      go("map");
                      flyToCountry(q.c.id);
                    }}
                  >
                    Show on the map
                  </button>
                </span>
                <button className="btn btn-primary !py-1.5 text-sm" onClick={next}>
                  {i + 1 >= qs.length ? "See my score" : "Next country"}
                </button>
              </div>
            )}
          </>
        )}
      </Card>
      <Card>
        <h3 className="mb-2 font-display text-lg font-bold text-navy-900">Why capitals?</h3>
        <p className="text-sm text-navy-700/85">News reports often use a capital as shorthand for a government: &ldquo;Beijing responded&rdquo; or &ldquo;talks in Brussels&rdquo;. Knowing the capitals makes those headlines easier to follow.</p>
        <p className="mt-3 text-xs text-navy-700/70">The wrong answers are capitals from the same region, so you can&apos;t guess by continent. This is practice, so it has no coins.</p>
      </Card>
    </div>
  );
}
