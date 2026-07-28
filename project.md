# Build Brief: Dota 2 Q&A Companion App

Context for Claude Code: this is a personal project supporting a conference talk ("Using AI to Demystify Dota 2," Zenika TechnoZaure, July 31, 2026). The talk's thesis is that AI is strong at retrieval/explanation and unreliable at strategic judgment — this app is built to demonstrate the strong half of that, deliberately.

## What this app is

A general-purpose Dota 2 knowledge companion for a returning player (played seriously through patch 7.00, Dec 2016, stopped, now catching back up). Chat interface, text-based for v1. You ask about a hero, ability, item, or "what's changed since 7.00," and it answers using real current data rather than the model's own (possibly outdated) training knowledge.

Inspiration: Michelle "MishManners" Duke's talk on using AI voice to help play Magic: The Gathering, grounded via Scryfall's card API — same pattern, Dota data source instead.

## Explicitly out of scope for this app

- **No match/game context.** No "what's happening in this specific match," no Radiant/Dire side tracking, no live-match watchalong features. Pure general knowledge lookup only.
- **No draft/pick-ban analysis.** No strategic judgment of any kind — no "is this a good pick," no evaluating plays or decisions. If a question calls for that kind of judgment, the app should say plainly that this is a non-deterministic, no-single-right-answer kind of question an LLM isn't reliable for, rather than answering as if it has a confident take. This boundary is the whole point of the talk — do not soften or drop it.
- **No team/draft history lookup.** That's a separate existing tool (a standalone draft explorer), not part of this app.
- **No voice input/output in v1.** Text chat only for now; voice may be added later as a separate phase.

## Core knowledge baseline

- User's Dota knowledge is frozen at patch 7.00 (Dec 2016) — including Talents, which launched in 7.00, so that's NOT new to them.
- Everything after patch 7.00 should be treated as potentially unfamiliar and flagged as new when relevant: Neutral Items (7.23, 2019), Outposts (7.23, 2019), Aghanim's Shard (7.28, 2020), Facets (2024, since REMOVED in patch 7.41 ~2026), Innate Abilities, Tormentors, expanded Talent levels (7.40).
- Reuse the existing `dota-decade-catchup.md` content as the static baseline knowledge for "what changed since 7.00" — it already covers this accurately.

## Current patch awareness (hybrid approach)

- Ship a static baseline covering the general "what changed since 7.00" history (doesn't go stale, this is settled history).
- For anything current-patch-specific (exact patch number, current balance, current meta), use a live web search tool rather than trusting a hardcoded snapshot — patches update every few weeks and a static number goes stale fast.

## Grounding architecture: Claude tool use

Do NOT let Claude answer hero/ability/item questions from its own memory. Use the Anthropic API's tool-use (function calling) to give Claude real tools it can call mid-conversation:

### Tool 1: Hero/ability/named-item lookup
Fetches from OpenDota's public API (no key required):
- `https://api.opendota.com/api/constants/heroes` — hero list, `localized_name`, internal `name`, base stats
- `https://api.opendota.com/api/constants/hero_abilities` — hero → ability list mapping
- `https://api.opendota.com/api/constants/abilities` — ability details, keyed by internal ability name
- `https://api.opendota.com/api/constants/items` — item details, keyed by internal item name

**Known gotcha from earlier iteration**: never guess the internal key format from a display name (e.g. don't assume "Harpoon" → `item_harpoon`). Internal keys don't reliably follow a pattern — always search by matching the `dname` field case-insensitively across the full fetched list.

### Tool 2: Unknown item identification (screenshot or vague description)
This needed the most iteration when we built it as a Claude Skill — carry these lessons over directly:

- **OpenDota's item data has no color/shape/visual metadata field.** You cannot search or filter by "blue" or "sword-shaped" — there's no such field. Don't pretend otherwise.
- **Never assert a single confident guess for an unnamed item.** This produced repeated wrong answers in testing. Instead: look carefully at the screenshot or description, then fall back to a web/image search for visual matching (e.g. searching something like "blue sword dota 2 item" based on what's visible) to surface 2-4 real candidate items with their name and image. Present those candidates to the user and let them pick — don't resolve it yourself and assert one answer.
- **Once the user picks a candidate**, verify its exact stats/description via OpenDota (Tool 1's named-item lookup) rather than trusting whatever the web search result said — the web search is for visual narrowing only, OpenDota is the source of truth for the actual data once the item is identified.
- **If only a vague text description is given (no screenshot)**: still usable — a web/image search on the description (color, rough shape) can surface candidates the same way. If the description is too vague to search meaningfully (e.g. just "a weapon"), ask for a screenshot or one more concrete detail (approximate cost, whether it had a recipe icon) instead.
- **If a previous guess was already told to be wrong**: don't guess again the same way — go straight to running the web/image search and showing multiple candidates.

### Tool 3: Web/image search (shared capability, two distinct purposes)
One underlying search tool, used for two different jobs — don't build these as separate implementations:
1. **Visual item matching** (used by Tool 2 above) — searching for candidate items based on a visual description or screenshot detail.
2. **Current patch/meta info** — for current patch number, current balance specifics, or anything clearly about current state rather than general/historical knowledge.

Only invoke it for #2 when the question is clearly about current state — don't search by default for general knowledge questions the model or OpenDota data can already answer.

### General tool-use error handling
If a fetch or lookup fails (network error, no match found), say so plainly and tell the user it failed — never silently fall back to guessing or to web search without saying that's what happened.

## Persona and tone

- SumaiL-inspired energy: confident, a bit cocky, no patience for playing scared, occasional light trash talk about passive play. This is a stylistic vibe only — never claim to literally be SumaiL, never invent quotes or opinions attributed to him as a real person.
- Default to short, direct answers — answer the question first in a sentence or two, then optionally 2-3 sentences of supporting detail. Save longer breakdowns for when the user explicitly asks for more depth.
- When an answer includes multiple stats (health, mana, cost, regen, etc.), format as a table, not a prose paragraph — much faster to scan.
- Item/hero icon images are welcome inline where they add value (especially for the candidate-picking flow above).

## Tech stack

- **Frontend**: Next.js, chat interface (text input + message thread)
- **Backend**: Next.js API routes, holding the Anthropic API key in an environment variable (`ANTHROPIC_API_KEY`) — never exposed client-side
- **Hosting**: Vercel (Hobby/free tier is sufficient — personal, non-commercial project)
- **Data grounding**: OpenDota public API (no key required)
- **Model**: Claude (Sonnet is a reasonable default; this is a retrieval-heavy task, doesn't need the heaviest reasoning tier)

## Visual design direction

Dark theme, consistent with an existing companion tool (a draft-explorer app built earlier in this project) for visual consistency across the toolkit:
- Dark near-black background (`#0f1115`), panel surfaces slightly lighter (`#171a21`)
- Display font: 'Teko' (condensed, esports-broadcast feel) for headers; 'Inter' for body text
- Accent color: warm gold (`#d4a94e`)
- Chat bubbles: user messages right-aligned, answers left-aligned
- Stats tables should be visually clean and scannable, not cramped
- Item candidate selection (from the unknown-item tool) should show actual icon images in a way that's easy to tap/click to confirm

## Cost expectations

Rough estimate for dev + testing + demo: $2-5 total using Claude Sonnet at typical usage volumes for a project like this, based on current per-token pricing. Should not be a meaningful budget concern.