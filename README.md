# Dota 2 WatchBuddy

A Dota 2 Q&A chat app that helps lapsed players catch up on years of patches, using Claude tool-use grounded in the OpenDota API.

Built for players whose knowledge is frozen at some old patch (this one targets 7.00, Dec 2016) and want straight answers about heroes, abilities, and items — current stats, not the model's stale training data.

## What it does

- Answers hero/ability/item questions by calling the [OpenDota](https://www.opendota.com/) public API rather than guessing from memory.
- Helps identify unknown items from a screenshot or vague description by surfacing real candidates for the user to pick from, then verifying stats via OpenDota.
- Flags anything introduced after the user's patch baseline (Neutral Items, Outposts, Aghanim's Shard, Facets, Innate Abilities, Talents beyond the original set, etc.) as new.
- Deliberately stays out of strategic judgment — no draft/pick analysis, no live match context. If a question needs that kind of judgment call, it says so instead of guessing.

See [project.md](project.md) for the full build brief.

## Tech stack

- **Framework**: Next.js 15 (App Router), React 19
- **Model**: Claude (Anthropic API) via tool use
- **Data grounding**: OpenDota public API (no key required)
- **Rate limiting**: Upstash Redis
- **Styling**: Tailwind CSS, Radix UI

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Create a `.env.local` with:

```
ANTHROPIC_API_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
RATE_LIMIT_ENABLED=
```

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — lint the project
