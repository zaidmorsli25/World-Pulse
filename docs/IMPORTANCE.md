# How WorldPulse ranks news

Every event on the map gets an importance score from 0 to 100. The score sets the marker size and tier, and it is shown, with its full breakdown, in each briefing under "Why is this ranked here?".

## Formula

```
score = 100 × (0.35·coverage + 0.20·prominence + 0.20·consequences + 0.15·recency + 0.10·significance)
```

| Signal | Weight | How it is measured (each is 0 to 1) |
|---|---|---|
| Coverage | 35% | Distinct approved outlets that reported the story independently, divided by 6. |
| Prominence | 20% | `1 − e^(−(articles + 2 × top stories) / 6)`. Repeated and front-page coverage counts, with diminishing returns. |
| International consequences | 20% | Estimated by the AI summarizer from the reporting: does this affect other countries, markets, security or alliances? |
| Recency | 15% | Exponential decay with a 36-hour half-life. |
| Significance | 10% | Economic, humanitarian, diplomatic or political significance, estimated by the summarizer. |

Code: `src/lib/news/importance.ts`. Weights are in `src/lib/config.ts` and can be overridden with `WP_W_*` environment variables.

## Tiers

| Tier | Score | Marker size |
|---|---|---|
| Minor | 0–29 | 30 px |
| Notable | 30–47 | 36 px |
| Significant | 48–63 | 44 px |
| Major | 64–79 | 52 px |
| Global | 80–100 | 62 px |

## Fairness safeguards

- **Syndication is not coverage.** A wire story republished by another outlet (for example a Reuters story on NPR) is detected and is not counted as independent coverage.
- **Humanitarian floor.** Coverage is an imperfect proxy for importance, and humanitarian crises in some regions get less of it. A humanitarian event with significance of 0.7 or more never scores below 40 (Notable).
- **Consequences and significance are judged on substance**, separately from how many outlets covered the story.
- **Transparency.** Players can see each signal's contribution in every briefing.

## Limitations

The AI-estimated signals (consequences and significance) are judgments, not measurements. They are constrained to the supplied reporting and checked by a second verification pass, but they can still be wrong. Feed placement is only a rough stand-in for editorial prominence.
