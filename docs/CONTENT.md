# Content, sources and accuracy

## News sources

WorldPulse uses only six publications: **Bloomberg, BBC News, The Wall Street Journal, Reuters, NPR and The New York Times**. The allow-list is enforced in code (`src/lib/types.ts`, `src/lib/news/sources.ts`). Article links are accepted only when the URL is on that publication's own domain.

| Publication | Default access | Notes |
|---|---|---|
| BBC News | Public RSS | |
| NPR | Public RSS | |
| The New York Times | Public RSS | |
| The Wall Street Journal | Public RSS (Dow Jones) | Articles are usually paywalled. WorldPulse links to them and never bypasses the paywall. |
| Bloomberg | Public RSS | Articles are usually paywalled, as above. |
| Reuters | **Off by default** | Reuters has no free public feed. Set `REUTERS_FEED_URL` only if you hold a licence. |

Check each publisher's terms before commercial use. Some require a licence to display headlines in a product. Licensed APIs (NYT APIs, Dow Jones Factiva, Bloomberg Enterprise and others) can be added through `WP_FEEDS`.

## What WorldPulse stores and shows

- From feeds: headline, link, publication, date, and the feed's short summary. Full article text is never fetched or republished.
- Briefings are original summaries generated from those headlines and summaries, and every briefing lists and links its sources.

## How briefings are made (`src/lib/news/`)

1. **Fetch** (`rss.ts`): approved feeds only, 12-second timeout, generic user agent.
2. **Clean and dedupe**: markup stripped, duplicate URLs and near-identical headlines removed, wire syndication detected.
3. **Filter and cluster** (`classify.ts`, `cluster.ts`): geopolitical relevance filter (sport, celebrity and similar are excluded), then headline-similarity clustering within 48 hours, boosted when stories share countries.
4. **Detect entities**: countries (with aliases) and known political figures.
5. **Rank**: preliminary importance score; the top clusters are summarized.
6. **Summarize** (`summarize.ts`): Claude writes the briefing (What happened, Background, Who is involved, Why it matters, What happens next) and a 3 to 5 question quiz. Every claim is labelled fact, allegation, disputed, opinion or prediction, and cites the source article it came from.
7. **Verify**: a second pass checks each claim against the source summaries. Unsupported claims and invalid questions are removed.
8. **Validate** (`validate.ts`): code-level checks. Each question's answer must be supported by a phrase in the briefing, choices must be distinct, country and figure ids must exist, and every "What happened" claim must cite an article from its cluster.
9. **Publish**: only events that pass every step appear on the map.

### Untrusted input

Feed text is treated as data, never as instructions. It is escaped and wrapped in a delimited block, and the system prompt tells the model to ignore any instructions inside it. Structured outputs are validated with schemas, and nothing from a feed can change the app's behaviour.

## Demo mode

When live news is unavailable (no ingestion run yet, no API key, or `WP_NEWS_MODE=demo`), WorldPulse shows 12 **fictional scenarios** (`src/data/demo/events.ts`). They are labelled as demo content on the map, on every marker, in every briefing and in the HUD. They cite no real outlet and contain no real URLs or quotations. Background facts in them are general knowledge.

## Country and leader data

- **Map shapes**: Natural Earth via `world-atlas` (public domain). Regenerate with `npm run geo`.
- **Country facts** (capital, languages, currencies, borders): `world-countries` (ODbL).
- **Curated profiles** (population, government, GDP, relationships) for about 38 countries: `src/data/countryProfiles.ts`. Approximate figures, for learning.
- **Political figures**: `src/data/figures.ts`, verified as of the date in `VERIFIED_AS_OF`. Officeholders change: review this file regularly, especially entries with a `watch` note. Leaders whose status could not be confidently verified were left out rather than guessed.
- **Portraits**: initials badges are used until properly licensed photographs are added (for example from Wikimedia Commons with attribution).
- **Disputed territories** are described neutrally. Showing a border or name does not imply endorsement of any claim.
