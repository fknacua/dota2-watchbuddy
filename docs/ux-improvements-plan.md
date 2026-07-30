# Dota Watchbuddy — UX Improvements Plan

**Status legend**: ✅ done · 🔄 in progress · ⬜ not started

Detailed dated history of what was built, verified, revised, and why lives in `docs/progress-log.md` — this doc tracks current decisions and step status only.

## Context

This is a separate staged sub-plan from `docs/plan.md` (the main OpenDota-grounding build plan). It covers a UX pass requested on top of the already-built Step 1-2 chat shell from `plan.md`: a typing indicator, suggested first-message prompts, and a real app shell (header, chat-history drawer, new-chat mechanism). Same workflow as the main plan: **plan → review → execute, one step at a time.**

Once all required steps here are done, resume `docs/plan.md` at its Step 3 (OpenDota tool grounding) as originally planned — no interleaving needed, since these steps don't touch `lib/systemPrompt.ts`, `lib/opendota.ts`, or the tool-use loop.

**Decision**: chat history persistence starts with browser `localStorage`, no backend database, to get the UX shipped fast. All chat/message storage access goes through one hook/context interface (`ChatHistoryApi`) from the start, so that if a later migration to a real database happens, it only replaces that interface's internals, not every component that reads chat data. Whether that migration happens at all is still undecided — see Step 5.

---

## ✅ Step 1 — localStorage-backed chat history foundation

**Goal**: chats and messages persist across refreshes, entirely client-side (no backend DB — see Step 5 for whether that ever changes), with the existing flat chat UI actually reading/writing through this layer — not just the interface exi/plansting in isolation.

### Step 1.1 — Storage layer + context API ✅
- `lib/chatStore.ts` — localStorage read/write layer, single key holding all chats+messages
- `lib/useChatHistory.ts` + `components/ChatHistoryProvider.tsx` — React context exposing a stable `ChatHistoryApi` (`chats`, `getMessages`, `createChat`, `addMessages`, `patchTitle`) — the seam a future DB migration would replace without touching any consuming component
- `lib/generateChatTitle.ts` + `app/api/chat/title/route.ts` — cheap `claude-haiku-4-5` call generating a 3-6 word title after a chat's first exchange

### Step 1.2 — Wire ChatWindow to the provider ✅
- `app/layout.tsx` — mount `ChatHistoryProvider` around the app
- `components/ChatWindow.tsx` — replace the local `useState<Message[]>` with `useChatHistory()`; lazily create a single implicit chat on first send (no sidebar/chat-switching yet — that's Step 4), load its messages on mount, call `addMessages`/`patchTitle` as the conversation progresses

**Done looks like**: sending messages in the running app persists them to localStorage and survives a refresh — this is now true end-to-end in the app, not just in an isolated test harness.

**Verify manually**:
1. Send a few messages in the app, reload the browser → the same conversation reloads unchanged.
2. Open DevTools → Application → Local Storage → one key holds the chat+messages, structured correctly.
3. After the first exchange → a generated title is attached to the chat entry in storage (not yet visible in the UI — that's Step 4's sidebar).
4. Clear localStorage, reload → app starts with an empty chat again, no console errors.

---

## ✅ Step 2 — Typing indicator

**Goal**: animated "typing" bubble while waiting for a reply — pure UX polish, no data-layer changes. Lands on the current flat chat UI; Step 4's routing/shell work carries it forward unchanged.

- `components/TypingIndicator.tsx` — animated three-dot bubble on the existing `Message`/`Bubble` primitives
- `components/ChatWindow.tsx` — conditional render on `isSending`, scroll-effect dependency update

**Done looks like**: sending a message shows an animated dots bubble immediately, replaced by the real reply when it arrives.

**Verify manually**:
1. Temporarily add an artificial delay to `/api/chat`, send a message → an animated three-dot typing bubble appears immediately while waiting.
2. Wait for the delayed response → the typing bubble is replaced by the real assistant reply.
3. Remove the artificial delay, send another message → typing indicator still appears briefly then is replaced normally (no regression).

---

## ✅ Step 3 — Suggested prompts

**Goal**: 4 clickable suggestion chips on a fresh empty chat. Lands on the current flat chat UI; Step 4's routing/shell work carries it forward unchanged.

- `components/SuggestedPrompts.tsx` — 4 chips: "What can you do?", "I want to ask about an item or ability", "What's changed in Dota since patch 7.00?", "What patch are we on right now?" — click sends immediately via `handleSend`
- `components/ChatWindow.tsx` — swap empty-state placeholder for the chip grid

**Done looks like**: fresh chat page shows 4 chips; clicking one sends immediately and produces an on-topic reply, chat gets titled/added to history afterward.

**Verify manually**:
1. Open a fresh new chat (empty state) → 4 suggestion chips are visible.
2. Click "What can you do?" → sends immediately, returns an on-topic reply.
3. Start another fresh chat, click "I want to ask about an item or ability" → sends immediately, returns an on-topic reply.
4. Start another fresh chat, click "What's changed in Dota since patch 7.00?" → sends immediately, returns an on-topic reply.
5. Start another fresh chat, click "What patch are we on right now?" → sends immediately, returns an on-topic reply.
6. After any chip click → the chat gets titled (per Step 1's title-gen).

---

## ✅ Step 4 — Routing + app shell (header, sidebar, new chat)

**Goal**: header, sidebar/drawer of past chats, new-chat mechanism, chat switching — built on Step 1's already-wired `ChatHistoryProvider`. Carries Step 2's typing indicator and Step 3's suggested prompts forward into the new shell routes.

- `app/chat/layout.tsx` — shell: `AppHeader` + `ChatSidebar` + children, mounted once via Next layout persistence
- `app/chat/[chatId]/page.tsx` — client component reading messages via `useChatHistory`
- `app/chat/page.tsx` — new-chat empty state, lazy chat creation on first send
- `app/page.tsx` — redirect to `/chat`
- `components/AppHeader.tsx`
- `components/ChatSidebar.tsx` — shadcn `sidebar` + `scroll-area` primitives via `npx shadcn add`
- `lib/types.ts` — add `ChatSummary`

**Done looks like**: sidebar lists chats, clicking one loads its history, "New chat" starts fresh, mobile viewport collapses sidebar to an overlay, titles update in the sidebar after each chat's first exchange.

**Verify manually**:
1. Start a new chat, send a message → a new entry appears in the sidebar with a generated title after the first exchange.
2. Start a second new chat, send a different message → sidebar now lists both chats independently.
3. Click the first chat in the sidebar → its original messages load, not mixed with the second chat's.
4. Refresh the browser → both chats and their messages still appear in the sidebar and load correctly.
5. Resize to a mobile viewport width → sidebar collapses into an overlay/drawer instead of staying pinned open.
6. Open the mobile overlay, select a chat → it loads and the overlay closes.

---

## ⬜ Step 5 — Persistence direction: stay on localStorage vs. migrate to Postgres *(optional — on hold)*

**Note for plan execution**: deliberately deferred — undecided which avenue to take. Skip unless explicitly requested; when picked up, execute the chosen avenue only (this step doesn't require both).

**Goal**: decide whether Step 1's localStorage-backed persistence is good enough long-term, or whether to migrate to durable server-side storage, once Steps 2-4 have proven the UX out.

### Step 5.1 — Avenue A: stay on localStorage ⬜
- No further work — Step 1's `ChatHistoryProvider` (localStorage-backed) remains as-is.
- Trade-off accepted: single-browser/device only, cleared if the user clears site data, no backup.

### Step 5.2 — Avenue B: migrate to Postgres (Prisma) ⬜
- `prisma/schema.prisma` — `Chat`/`Message` models, cascade delete
- `lib/prisma.ts` — singleton client w/ dev hot-reload guard
- `app/api/chats/route.ts` + `app/api/chats/[chatId]/route.ts` — list/fetch for sidebar
- `app/api/chat/route.ts` — contract becomes `{ chatId?, message }`, server-side history + inline title-gen
- `package.json` — `prisma`, `@prisma/client`, `postinstall: prisma generate`
- Provisioned via `npx prisma init --db` (Prisma Postgres, free tier)

**Done looks like**: Avenue A needs no verification (no change made). Avenue B: full regression of Steps 2-4 now backed by Postgres instead of localStorage, with no component outside `ChatHistoryProvider` needing to change.

**Verify manually** (Avenue B only):
1. Run `npx prisma studio`, open the Chat/Message tables → rows exist matching chats created in the app.
2. Start a conversation, send a few messages → corresponding rows appear in Postgres via Prisma Studio.
3. Restart the dev server mid-conversation, reload the app → no data loss, conversation history intact.
4. Re-run all Step 4 (routing + shell) verification → identical behavior, now backed by Postgres.
5. Re-run all Step 2 (typing indicator) verification → unchanged.
6. Re-run all Step 3 (suggested prompts) verification → unchanged.

---

## ✅ Step 6 — Streaming reply progress + source/grounding badges

**Goal**: replies that trigger OpenDota lookups or web search currently give no insight into what's happening beyond a static typing indicator, and nothing shows which data actually grounded an answer — both matter for a public conference-demo audience deciding whether to trust a reply.

### Step 6.1 — Stream tool-use progress from the API route ✅
- `app/api/chat/route.ts` — wrap the existing `while (stop_reason === "tool_use")` loop's body in a `ReadableStream`'s `start(controller)`, emitting line-delimited JSON events (`{type:"status", text}` before/around each tool call — "Looking up X...", "Searching the web...") as the loop progresses, ending with one `{type:"done", reply, sources}` event (sources from Step 6.3) or `{type:"error", message}` on failure.
- **Revised during implementation**: a pure web-search-only turn (no client tool call) resolves server-side within a single `messages.create()` call — there's no `stop_reason: "tool_use"` round-trip to hook a status event into, so it silently skipped the "Searching the web..." status entirely. Switched the internal Anthropic calls from `messages.create()` to `messages.stream()` (still one status stream to the client, not token-level text streaming) so a `content_block_start` event for `server_tool_use`/`web_search` can be caught and turned into a status the moment the search begins, even with no client tool involved.
- Fix a latent bug surfaced during design: today's loop unconditionally does `messages.push({role:"user", content: toolResults})` even when `toolResults` is empty (possible on a turn that's 100% server-side `web_search` with no client tool calls) — guard with `if (toolResults.length > 0)`.
- Remove the `logWebSearchBlocks` temporary debug logging while in this file.

### Step 6.2 — Client stream consumption + status-aware typing indicator ✅
- `lib/useChatHistory.ts` — add `getStatus(chatId): string | undefined` to `ChatHistoryApi`
- `components/ChatHistoryProvider.tsx` — add `statusByChatId` state; `sendMessage` reads `res.body`'s stream via a `ReadableStreamDefaultReader`, buffering/splitting on `\n` (must handle a JSON line split across two chunks — don't assume one `read()` = one line), updating `statusByChatId` on `status` events, capturing `reply`/`sources` on the `done` event, treating an `error` event like today's existing catch-block failure path. Clear the chat's status entry in `finally`.
- `components/ChatWindow.tsx` — pass `getStatus(chatId)` into `TypingIndicator`
- `components/TypingIndicator.tsx` — accept an optional `status?: string` prop, rendering it as small text alongside the existing bouncing-dots animation (keep the dots even between status updates — there can be silent gaps, e.g. final generation after the last tool result)

### Step 6.3 — Source/grounding badges on replies ✅
- `lib/types.ts` — add `MessageSource = {type:"opendota"} | {type:"web", url, title}` and an optional `sources?: MessageSource[]` field on `Message`
- `app/api/chat/route.ts` — track a simple `usedOpenDota` boolean (set true whenever `lookup_dota_entity`/`lookup_hero_kit` executes); across all tool-loop iterations, extract `{type:"web", url, title}` entries from `TextBlock.citations` (dedup by URL), fold into the `done` event's `sources` array. **Revised during implementation**: prefer cited URLs, but if a `web_search` ran this turn and produced zero citations (Claude paraphrased instead of quoting), fall back to the raw `web_search_tool_result` result URLs so the user can still see what pages were consulted — user explicitly wants "where did the model get this" even when nothing was directly quotable.
- `components/ChatMessage.tsx` — render a small pill row under assistant replies with `sources`: an "Internal Resource" pill (no link, OpenDota-backed) and a linked pill per web source (hostname as label, opens the cited/result URL in a new tab). Hand-rolled to match existing pill styling already used in `SuggestedPrompts.tsx`.
- No persistence-layer changes needed — `sources` round-trips through `chatStore.ts` automatically.

**Files**: `app/api/chat/route.ts`, `lib/useChatHistory.ts`, `components/ChatHistoryProvider.tsx`, `components/ChatWindow.tsx`, `components/TypingIndicator.tsx`, `lib/types.ts`, `components/ChatMessage.tsx`.

**Done looks like**: sending a message that triggers a lookup or web search shows real status text ("Looking up Nature's Prophet...") in the typing bubble before the reply arrives; the reply itself shows which data source(s) grounded it.

**Verify manually**:
1. Ask a hero/item question → typing indicator shows real lookup status text, then the reply shows an "OpenDota" pill.
2. Ask a current-patch/meta question that triggers web search → typing indicator shows search status text, then the reply shows pill(s) linking to the actual cited site(s).
3. Reload the page → source badges persist on prior messages.
4. Confirm via a raw request against `/api/chat` (e.g. `curl`) that the response is a stream of JSON lines, not one blocking response.

---

## ✅ Step 7 — First-time visitor inline explainer

**Goal**: conference attendees will land cold on a shared public link with no context on what this app is — the empty chat state should explain that before/alongside the suggested prompts.

- `components/SuggestedPrompts.tsx` (or a new small component) — a brief explainer of what the app is/does, shown above the suggestion chips — no modal, no dismiss-state to track
- `components/ChatWindow.tsx` — render the explainer alongside the existing chip grid in the empty state

**Done looks like**: a fresh visitor on `/chat` sees a short explanation of the app before/above the suggested-prompt chips, not just the chips alone.

**Verify manually**:
1. Open a fresh new chat (empty state) → a short explainer is visible above the suggestion chips.
2. Click a suggested prompt → behaves exactly as it does today (Step 3 unaffected).

---

## ✅ Step 8 — Chat deletion

**Goal**: there's currently no way to remove a chat from the sidebar — `lib/chatStore.ts`'s `deleteChat` already exists but is unused/unexposed anywhere.

- `lib/useChatHistory.ts` — add `deleteChat(chatId): void` to `ChatHistoryApi`
- `components/ChatHistoryProvider.tsx` — wire it to the existing `chatStore.deleteChat`, calling `refresh()` after
- `components/ChatSidebar.tsx` — add a delete affordance per chat row (e.g. shadcn `alert-dialog` for a confirm step, pulled in via `npx shadcn add alert-dialog` if not already present) — deleting the currently-open chat should redirect to `/chat`

**Done looks like**: deleting a chat from the sidebar removes it from the list and storage after a confirm step; deleting the active chat navigates back to a fresh `/chat` empty state.

**Verify manually**:
1. Delete a chat that isn't currently open → it disappears from the sidebar and storage after confirming.
2. Delete the currently-open chat → redirected to a fresh `/chat` empty state.
3. Refresh the browser → the deleted chat stays gone.

---

## ✅ Step 9 — Hero/item/ability icons in replies

**Goal**: OpenDota already ships icon images for heroes/items/abilities, but replies currently render hero/item/ability names as plain text.

- `lib/opendota.ts` — added a resolved `iconUrl` field to `HeroConstant`, `ItemConstant`, and `AbilityConstant` (resolving OpenDota's relative `icon`/`img` path against its CDN base `https://cdn.cloudflare.steamstatic.com`)
- `lib/tools/lookupTool.ts` — no code change needed; `iconUrl` rides along automatically since the tool just `JSON.stringify`s the resolved entity object
- `lib/systemPrompt.ts` — instructs the model to include the icon inline via markdown image syntax (`![](iconUrl)`) next to a hero/ability/item's name; in tables, icon+name share one cell and cell content must stay single-line (GFM tables break on multi-line cells)
- **Revised during implementation**: facets excluded entirely (removed game mechanic, per user) — `getHeroFacets()` left untouched, and the system prompt now explicitly bars mentioning facets anywhere (tool results, web search, general kit descriptions) unless the user asks about facets by name. Abilities *were* included (plan assumed no icon field existed for abilities; verified against the live OpenDota API that `/constants/abilities` does return a resolvable `img`).
- Bumped `max_tokens` in `app/api/chat/route.ts` from 1024 → 2048 — icon URLs added enough output-token cost that full hero-kit replies (multiple abilities/talents) were hitting the old cap mid-response.

**Done looks like**: asking about a hero/item/ability shows its icon inline in the reply; facets are never mentioned unless explicitly asked; table-formatted replies render cleanly with icons.

**Verified manually**:
1. Ask about a hero → icon renders inline. ✅
2. Ask about an item → icon renders inline. ✅
3. Ask about an ability → icon renders inline, no broken placeholder. ✅
4. Ask a "what's changed since 7.00" style question for a hero with a facet → no facet mentions. ✅
5. Ask for a hero's abilities in table form → table renders cleanly, icon+name in one cell, no broken columns. ✅

**Known follow-up (not yet fixed)**: tables render squished/cramped on mobile viewport widths — noted during Step 9 verification, revisit later (likely needs a horizontal-scroll wrapper or responsive table styling in `ChatMessage.tsx`'s `prose-chat` markdown rendering).

**Superseded 2026-07-31**: this step's "have Claude write a markdown table with `![](iconUrl)` inline" mechanism was replaced — recurring malformed-table bugs (GFM cells breaking on multi-sentence/multi-stat content) turned out to be structurally unfixable via prompt wording alone. Claude no longer authors table markdown or icon markdown for tool-grounded data at all; the backend now formats `lookup_dota_entity`/`lookup_hero_kit` results into typed `ContentBlock`s (icon included) and Claude just marks where each one goes with a `[[block:N]]` placeholder. See `docs/progress-log.md`'s 2026-07-31 entry for the full history, including a failed first attempt at the placeholder mechanism itself. This step's "done looks like" goals (icons render inline, tables render cleanly) still hold — the mechanism just changed. The mobile-squish follow-up above wasn't retested against the new components and likely still applies (same underlying `.prose-chat table` CSS).

---

## ✅ Step 10 — Abuse/cost protection *(Avenue B: Upstash Redis rate limiter)*

**Decision**: Avenue B (Upstash Redis) chosen over client-side-only cap — real protection against scripted/malicious API-cost abuse on the public link, not just accidental spam-clicking.

**Goal**: the public Vercel link will be shared with no auth — guard `app/api/chat/route.ts` against runaway/scripted usage with a server-enforced, per-IP rate limit.

- `package.json` — added `@upstash/ratelimit`, `@upstash/redis`
- `lib/rateLimit.ts` — Upstash Redis client + `Ratelimit.slidingWindow(30, "10 m")`; `checkRateLimit(identifier)` no-ops (allows the request) when `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` aren't set, so it's opt-in per environment (e.g. safe in CI/local without credentials)
- `app/api/chat/route.ts` — `clientIp()` reads `x-forwarded-for` (falls back to `x-real-ip`); `POST` checks the limiter before doing any work and returns a `429` whose body is a single ndjson `{type:"error", message}` line — the same shape the client already parses from mid-stream errors, so no client-side changes were needed
- `.env.local` — added `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` (also needed in Vercel env vars once deployed — not yet done, Vercel project doesn't exist yet)

**Done looks like**: hammering `/api/chat` past 30 requests/10min from one IP gets a 429 surfaced as a normal error bubble in the chat UI; normal conversational use never hits it.

**Verified manually**:
1. Rapid-fire 35 requests via curl → requests 1-30 returned `200`, requests 31-35 returned `429` with body `{"type":"error","message":"You've sent a lot of messages recently — please wait a bit and try again."}`. ✅
2. Rapid-fire through the actual chat UI → 429 surfaces as a normal error message in the chat, no silent failure or console exception. ✅

---

## Sequencing notes

- Step 1 wires persistence into the running app (single implicit chat) — Step 4 is purely the routing/shell layer (sidebar, multi-chat switching) built on top of it.
- Steps 2-3 are pure UI polish on the existing flat chat UI and don't depend on Step 1's wiring or Step 4's routing — can land in any order relative to them.
- Step 4 (routing + app shell) is the structural step the other UI work gets folded into.
- Step 5 (persistence direction) is optional and on hold: for the public-conference-demo use case (a shared Vercel link, many anonymous concurrent attendees), localStorage's per-browser isolation actually fits better than a DB migration would — no work planned here unless that changes.
- Step 6 (streaming progress + source badges) is the highest-value next step — it directly serves the same public-demo audience with real-time trust/progress signals, and doesn't depend on Steps 7-9.
- Steps 7-9 are independent polish that can land in any order relative to each other and to Step 6.
- Step 10 (abuse/cost protection) is done — Avenue B (Upstash Redis) shipped. Remember to add the two Upstash env vars to Vercel once that project exists.
- Once the required steps here are done, resume `docs/plan.md` at Step 3 (OpenDota tool grounding) — no interleaving needed.
