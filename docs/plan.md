# Dota Watchbuddy — Staged Build Plan

**Status legend**: ✅ done · 🔄 in progress · ⬜ not started

Detailed dated history of what was built, verified, revised, and why lives in `docs/progress-log.md` — this doc tracks current decisions and step status only.

## Context

This is a personal project supporting a conference talk ("Using AI to Demystify Dota 2," Zenika TechnoZaure, July 31, 2026). The thesis: AI is strong at retrieval/explanation, unreliable at strategic judgment — the app demonstrates the strong half deliberately. Full requirements live in `project.md` at the repo root.

The target directory (`/Users/fknacua/Documents/Projects/dota-watchbuddy`) currently contains only `project.md` — this is a from-scratch Next.js build. Two reference assets were found elsewhere and inform this plan:
- `/Users/fknacua/Downloads/dota-decade-catchup.md` — the static "what changed since 7.00" baseline content the brief says to reuse verbatim.
- `/Users/fknacua/Documents/Projects/dota-helper/index.html` — the existing "draft explorer" companion tool. Confirmed its exact CSS custom properties, Google Fonts (Teko/Inter), and button/panel styling conventions, which this app should match for toolkit-wide visual consistency.

The user explicitly wants to work in steps: **plan → review → execute, one step at a time** — not a single monolithic build.

A separate UX pass (app shell, chat history, typing indicator, suggested prompts) is tracked in its own file, `docs/ux-improvements-plan.md`, deferred until this roadmap's steps are done. General polish/tone-consistency work is blocked on that UX pass landing first, so it isn't tracked as a step in this doc.

Deploy work (Vercel setup, env vars, deploy verification) is out of scope for this doc — current focus is local development only. It will get its own plan doc when it's time.

This doc is the implementation plan, not a running log — each step below states the current decision only. Rationale, superseded approaches, and dated findings belong in `docs/progress-log.md`, not inline here.

## Cross-cutting architectural decisions

- **Model**: `claude-sonnet-5` (current Sonnet-tier model; verified against the current model catalog). Retrieval/tool-orchestration-heavy task, doesn't need Opus-tier reasoning.
- **Tool-use loop**: a **manual loop** in the Next.js API route (`while (response.stop_reason === "tool_use")`), not the SDK's beta tool-runner. Reasons: the item-ID flow needs custom structured data returned to the frontend (candidate cards), not just text; the tool surface is small and fixed; avoids a beta SDK dependency for a demo app. Cap iterations at ~5 to prevent runaway loops.
- **OpenDota constants caching**: fetch `constants/heroes`, `constants/hero_abilities`, `constants/abilities`, `constants/items` once per warm serverless instance, cached in a module-level object with a ~1 hour TTL. Cold starts pay one fetch; warm invocations are free.
- **Strategic-judgment refusal**: implemented purely via **system prompt instruction**, not a special tool or classifier — keeps the boundary declarative and demoable, which is the point of the talk.
- **Item-ID candidate flow**: never resolves to a single guess. A small custom client-facing tool `present_item_candidates` lets Claude hand candidates to the UI in a structured way (the API route intercepts this specific tool_use block, attaches it to the response payload, and short-circuits with a synthetic tool_result so the conversation stays valid). User's click sends a follow-up message naming the chosen candidate, which triggers the OpenDota lookup tool for verified stats. In practice this case is dominated by inherently ambiguous inputs (a screenshot or a vague description like "blue sword"), so it rarely collapses to one confident match anyway — the candidate flow just describes that natural behavior rather than acting as a hard override.
- **Web search tool**: `web_search_20260209` (current Anthropic server-side tool type, verified). Primary use is image/description-based item identification (Step 4), where OpenDota has no visual data at all. General web search for other unresolvable questions (e.g. current patch/meta) is optional/deferred — see Step 4.3.
- **Visual system**: dark theme using the **Team Liquid 2026 brand guide** palette, dark-mode ramp only (no light/dark toggle — see `docs/progress-log.md` for the v1→v2 palette correction). Built on **Tailwind CSS v4 + shadcn/ui** (Radix primitives, Nova preset) rather than plain CSS custom properties, with shadcn's semantic tokens mapped as: `--background: #000b1f` (Midnight), `--primary: #001538` (Foundational Blue), `--secondary: #3bb0d4` (Ebb Cyan), `--accent: #f7c95e` (Sunrise Gold, the main CTA/interactive pop color), `--card`/`--popover: #001538`, `--border`/`--input: #113f7f` (B5), `--muted: #021e4a` (B6), `--muted-foreground: #95bef1` (B3), `--foreground`/`--card-foreground`: `#e3f1ff` (B1), `--destructive: #ed5651` (semantic red, reserved for Step 5's error-bubble styling). Chat bubbles use shadcn's official `Message`/`Bubble` components — user bubbles styled `bg-accent` (gold), assistant bubbles `bg-secondary` (cyan). Fonts are Teko 500/600/700 + Inter 400/500/600 (Kaneda Gothic considered but skipped — Adobe Fonts license not set up). 6px button radius / 10px panel radius preserved via shadcn's `--radius`. Radiant/dire tokens omitted (no match context in this app).

---

## ✅ Step 1 — Scaffold + static chat UI (no AI, no grounding)

**Goal**: Prove the visual/UX shell works before any LLM integration. Demoable: type a message, see a canned response echoed back with correct styling.

### Step 1.1 — Next.js scaffold + Tailwind/shadcn config ✅
- Next.js (App Router) + TypeScript scaffold: `package.json`, `next.config.js`, `tsconfig.json`
- `postcss.config.mjs`, `components.json`, `lib/utils.ts` — Tailwind/shadcn config and the `cn()` helper (added by the shadcn CLI)
- `components/ui/*` — shadcn-generated primitives (`button`, `message`, `bubble`, `avatar`)

### Step 1.2 — Theme tokens, fonts, layout ✅
- `app/layout.tsx` — root layout, Google Fonts (Teko, Inter) via next/font, dark theme applied
- `app/globals.css` — Tailwind v4 import + shadcn semantic CSS custom properties (Team Liquid palette, per Cross-cutting decisions above) + base resets

### Step 1.3 — Chat components + stub API ✅
- `app/page.tsx` — renders the chat page
- `components/ChatWindow.tsx` — message thread container, scroll-to-bottom on new message
- `components/ChatMessage.tsx` — built on shadcn's `Message`/`MessageContent`/`Bubble`/`BubbleContent`; user right-aligned/gold, assistant left-aligned/cyan
- `components/ChatInput.tsx` — text input + shadcn `Button` send button (Teko font, gold accent, 6px radius)
- `lib/types.ts` — `Message` type (`role`, `content`, and placeholder optional fields `candidates`/`table` for later steps)
- Local React state only (`useState<Message[]>`); a stubbed `app/api/chat/route.ts` that echoes the input after a short simulated delay (no real API calls yet)

**Done looks like**: `npm run dev` shows a dark-themed chat interface matching dota-helper's visual language. Sending a message adds a right-aligned user bubble, then after a short delay a left-aligned canned assistant bubble appears.

**Verify manually**:
1. Run `npm run dev`, open the app → dark-themed chat interface loads, no console errors.
2. Look at headers/buttons → Teko font renders (condensed style).
3. Look at message/body text → Inter font renders.
4. Inspect background/accent elements in DevTools → hex values match tokens (`#000b1f` background, `#f7c95e` accent gold, `#3bb0d4` secondary cyan).
5. Send a message → right-aligned gold user bubble appears immediately.
6. Wait for the stub delay → left-aligned cyan assistant bubble (canned echo) appears.
7. Send enough messages to overflow the visible area → view auto-scrolls to the bottom on each new message.
8. Resize the browser to mobile width → layout stays usable, no horizontal overflow or broken bubbles.

---

## ✅ Step 2 — Real Claude wiring, no grounding yet (naive chat)

**Goal**: Replace the stub with a real Anthropic API call — persona/tone applied via system prompt, no tools yet. Isolates prompt engineering from tool-use complexity.

### Step 2.1 — Anthropic client + system prompt ✅
- `lib/anthropic.ts` — module-level `Anthropic` client singleton
- `lib/systemPrompt.ts` — persona (SumaiL-inspired energy), tone (short-then-detail), and the strategic-judgment refusal instruction, written in full now
- `.env.local` (gitignored) — `ANTHROPIC_API_KEY`

### Step 2.2 — Wire real API route + frontend ✅
- `app/api/chat/route.ts` — real POST route handler, reads `ANTHROPIC_API_KEY` server-side only, calls `client.messages.create({model: "claude-sonnet-5", system, messages})`, returns `{reply}`
- Update `ChatWindow.tsx` to POST real messages and render the real reply

**Done looks like**: a casual question gets a SumaiL-toned answer; a "is Pudge a good pick right now" question gets a plain refusal that this is non-deterministic judgment territory an LLM isn't reliable for — proving the refusal works even before any tools exist.

**Verify manually**:
1. Send a casual question ("what does Pudge's hook do?") → confident, short SumaiL-toned answer.
2. Send "what's changed since patch 7.00?" → a hedge admitting no live/grounded data yet, not a confident guess.
3. Send "is Pudge a good pick right now?" → explicit refusal citing non-deterministic judgment, no soft opinion.
4. Open DevTools → Network tab, inspect the `/api/chat` request and response → `ANTHROPIC_API_KEY` never appears.
5. View-source / search the client bundle for the API key string → no match found.

---

## ✅ Step 3 — OpenDota API tooling

**Goal**: Wire hero/ability/item grounding into Claude's tool-use loop — the core "don't trust the model's memory" demo — and give the model a way to fill gaps the live OpenDota API can't cover.

### Step 3.1 — Constants fetch/cache + matching ✅
- `lib/opendota.ts` — fetch + cache logic for the four OpenDota constants endpoints; exported `findHeroByName` / `findAbilityByName` / `findItemByName` that do case-insensitive `dname` matching across the full fetched list (never guess internal keys from display names — confirmed gotcha from the brief)

### Step 3.2 — Lookup tool + manual tool-use loop ✅
- `lib/tools/lookupTool.ts` — tool definition + executor calling into `lib/opendota.ts`, returning matched record(s) or an explicit "no match found" string
- Update `app/api/chat/route.ts` — implement the manual tool-use loop (execute tool_use blocks, append tool_result, loop, cap iterations)

### Step 3.3 — System prompt + tool-grounded data rendering ✅
- Update `lib/systemPrompt.ts` — never answer hero/ability/item questions from memory, always call the lookup tool first; always lead with the entity's exact display name
- Add `react-markdown` + `remark-gfm` for general prose rendering in `ChatMessage.tsx` (headings, lists, links, web-search-grounded content)
- **Superseded 2026-07-31**: multi-stat answers originally rendered as Claude-authored markdown tables; replaced with backend-formatted `ContentBlock`s (`lib/tools/blockFormatters.ts`) that Claude references via `[[block:N]]` placeholders rather than writing itself — recurring malformed-table bugs made the markdown-authoring approach structurally unreliable for multi-sentence ability text. See `docs/ux-improvements-plan.md` Step 9 and `docs/progress-log.md`'s 2026-07-31 entry for the full history.

### Step 3.4 — Supplementary data-source capability ✅
Give the model a way to answer questions the live OpenDota API can't cover at all (e.g. Aghanim's Scepter/Shard text isn't present in `constants/abilities`), by pulling in additional structured resources — mirroring what OpenDota's own web frontend does rather than relying on the live API alone. Framed as a general capability (any API gap → supplementary source), not a one-off facets/Aghs/Shard feature.

- Add `dotaconstants` as a dependency (confirmed source for Aghs/Shard data — see `docs/progress-log.md` for why the live API can't cover this)
- `lib/opendota.ts` — add `getHeroTalents(heroName)` and `getHeroFacets(heroName)`, joining the live API's `constants/hero_abilities` (talent keys, facet title/description) against `constants/abilities` (talent `dname`)
- `lib/opendota.ts` — add `getHeroAghs(heroName)`, reading `dotaconstants`'s `aghs_desc.json` for scepter/shard name + description
- Expose the new lookups as tool(s) the model can call — extend `lib/tools/lookupTool.ts` or add `lib/tools/heroKitTool.ts`
- Update `lib/systemPrompt.ts` to call the new tool(s) for talent/facet/Aghs/Shard questions

**Files**: `lib/opendota.ts`, `lib/tools/lookupTool.ts` (or new `lib/tools/heroKitTool.ts`), `lib/systemPrompt.ts`, `package.json` (`dotaconstants` dependency).

**Done looks like**: asking about a real hero/ability/item returns current OpenDota-sourced data in table form; asking about a made-up entity returns an honest "not found"; asking about a hero's talent tree, facets, or Aghanim's Scepter/Shard returns accurate data instead of a guess or generic refusal.

**Verify manually**:
1. Ask about a hero (e.g. "tell me about Nature's Prophet") → current OpenDota-sourced stats returned as a markdown table.
2. Ask about a hero/ability/item whose internal key doesn't match its display name → still resolves correctly (matched by `dname`, not key).
3. Ask about a made-up, nonexistent item → an honest "not found" message, no hallucinated guess.
4. Restart the dev server, ask one lookup question → constants fetch happens on this cold-start request (confirm via log/timing); a second question immediately after serves from warm cache.
5. Ask about a hero's talent tree → accurate leveled talent list with real effect text, not guessed.
6. Ask about a hero's facets → accurate facet titles/descriptions.
7. Ask about a hero's Aghanim's Scepter/Shard effect → accurate `dotaconstants`-sourced answer, not a "don't have that" refusal.

---

## ⬜ Step 4 — Web search & image identification

**Goal**: Handle the case OpenDota has no data for at all — an item the user can't name, only describe or screenshot. Primary focus is image-upload item identification; general web search for other question types is optional and on hold (see 4.3).

### Step 4.1 — Image upload UI + candidate picker ⬜
- `components/ImageUpload.tsx` — file input for screenshot attachment
- `components/CandidatePicker.tsx` — renders candidate cards (icon + name), click sends a follow-up message naming the choice
- Update `lib/types.ts` — `Message.candidates?: {name, imageUrl}[]`

### Step 4.2 — Web search tool + image-identification flow ⬜
- `lib/tools/webSearchTool.ts` — `web_search_20260209` tool declaration
- Update `app/api/chat/route.ts` — support image input in user messages (base64 for screenshots); add the `present_item_candidates` client-facing tool described in Cross-cutting decisions above
- Update `lib/systemPrompt.ts` — never assert one confident item guess from an image/description, surface candidates for user selection whenever the search doesn't cleanly resolve to one item (in practice, most image/vague-description cases); if a previous guess was told wrong, go straight to multi-candidate search
- Likely needs a dedicated **skill** for the image-identification process itself, so it's repeatable/dependable rather than re-derived ad hoc each time — revisit once this sub-step is scoped in detail

### Step 4.3 — General web search for other questions ⬜ *(optional — on hold)*
**Note for plan execution**: this sub-step is deliberately deferred and not required for Step 4 to be considered done. Skip unless explicitly requested.

- Extend `lib/systemPrompt.ts` to invoke web search for current-patch/meta questions too, not just image identification

**Done looks like**: uploading/describing an unfamiliar item produces candidate cards, clicking one returns verified OpenDota stats; a too-vague description prompts for more detail instead of guessing.

**Verify manually**:
1. Upload/describe a screenshot of an unfamiliar item → candidate cards (icon + name) render, no single confident guess.
2. Click one candidate card → a follow-up message naming that choice is sent, and verified OpenDota stats for it come back.
3. Describe an item too vaguely (e.g. "the purple one") → assistant asks for more detail instead of guessing or searching.

---

## ⬜ Step 5 — Error handling

**Goal**: Harden failure paths so tool/API failures surface honestly instead of silently guessing or hanging. (General polish/tone-consistency work is deferred until `docs/ux-improvements-plan.md` lands; deploy work is tracked separately.)

### Step 5.1 — Tool-level error handling ⬜
- Wrap all OpenDota/tool fetches in try/catch, returning `is_error: true` tool_results on failure rather than throwing or silently falling back to guessing (per the brief's explicit requirement)

### Step 5.2 — Route-level handling + error UI ⬜
- Top-level try/catch + iteration cap fallback message in `app/api/chat/route.ts`; basic input validation
- `components/ErrorBanner.tsx` — distinct error-bubble styling in the chat thread

**Done looks like**: a forced OpenDota failure shows a visible "lookup failed" message, never a silent hang or a guess; a runaway tool loop is stopped by the iteration cap with a visible fallback message.

**Verify manually**:
1. Temporarily point `lib/opendota.ts` at an invalid URL, ask a lookup question → a visible "lookup failed" error bubble, not a silent hang or a guess. Revert the change after.
2. Ask a question likely to loop (or otherwise force the iteration cap) → the cap stops the loop with a visible fallback message, not an infinite hang.

---

## Sequencing notes

- Steps 1-2 are the fastest path to something demoable.
- Step 3 is the highest-value step relative to the talk's thesis — prioritize it if time is tight before July 31. Sub-step 3.4's scope is still open pending more manual testing.
- Step 4 is the most complex UI-wise (candidate picker, image upload, possibly a dedicated skill) — budget the most review time here. Sub-step 4.3 is optional/on hold.
- Step 5 is compressible if time runs short; consider pulling its error-handling wrapper forward into Step 3 once the lookup tool exists.
- The UX improvements pass (`docs/ux-improvements-plan.md`) and deploy work are intentionally out of scope for this doc right now — local dev functionality comes first.
