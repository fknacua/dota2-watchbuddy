# Dota Watchbuddy — Performance Upgrades Plan

**Status legend**: ✅ done · 🔄 in progress · ⬜ not started

Detailed dated history of what was built, verified, revised, and why lives in `docs/progress-log.md` — this doc tracks current decisions and step status only.

## Context

This is a separate staged sub-plan from `docs/plan.md` (the main OpenDota-grounding build plan) and `docs/ux-improvements-plan.md` (the app-shell/history UX pass). It covers reply-latency work: replies currently take ~10s, mostly because `app/api/chat/route.ts` makes a full non-streaming `anthropic.messages.create` call — including a tool-use loop of up to 5 iterations across `lookup_dota_entity`, `lookup_hero_kit`, and `web_search` — before returning the complete JSON reply, and `ChatWindow.tsx` does a single `fetch` and waits for that entire response body.

This doc doesn't touch routing/chat-history/sidebar work (`ux-improvements-plan.md` Step 4) or grounding/tool logic (`plan.md` Step 3/4) — it can proceed independently of both, in parallel or after either.

## Cross-cutting architectural decisions

- **Streaming transport**: use the Anthropic SDK's native streaming (`anthropic.messages.stream(...)` or `stream: true`) piped through as Server-Sent Events from the Next.js route to the browser, rather than a custom WebSocket or polling scheme — lowest-complexity option that fits the existing single-request-per-turn shape.
- **What gets streamed**: only the final, non-`tool_use` assistant turn is streamed token-by-token to the client. Intermediate tool-use turns (deciding to call a lookup tool, receiving its result) stay server-side exactly as today — there's no useful partial output to show the user during those, and streaming them would mean exposing raw tool-call JSON mid-flight for no UX benefit.

---

## ⬜ Step 1 — Stream the final reply over SSE

**Goal**: cut perceived latency by rendering the assistant's reply as it's generated instead of waiting for the full ~10s round-trip to resolve before anything appears. Total backend time is roughly unchanged — this is entirely about when the user starts seeing output.

### Step 1.1 — Streaming API route ⬜
- `app/api/chat/route.ts` — keep the existing manual tool-use loop unchanged for intermediate turns (still uses non-streaming `messages.create`, since tool-use turns aren't shown to the user); once `stop_reason` is no longer `tool_use`, make the final call with streaming enabled and pipe text deltas out as an SSE response instead of building one JSON payload

### Step 1.2 — Client-side stream consumption ⬜
- `components/ChatWindow.tsx` — replace the single `await res.json()` in `handleSend` with a reader over the SSE/stream response, appending text deltas to a live-updating assistant message bubble as they arrive
- Keep `TypingIndicator` shown until the first text delta arrives, then swap it for the streaming bubble

**Done looks like**: sending a message shows the assistant's reply appearing incrementally (word-by-word or chunk-by-chunk), starting well under 10s after send, rather than the full reply popping in all at once at the end.

**Verify manually**:
1. Send a question that doesn't require any tool call → reply text visibly streams in incrementally, not all at once.
2. Send a question that requires a tool lookup (e.g. a hero question) → typing indicator holds through the tool-use round-trip, then the final answer streams in once the model starts producing it.
3. Compare perceived start-of-response time before/after → streamed version shows the first word noticeably sooner than the old full-wait behavior.
4. Refresh mid-stream (interrupt a response) → no console errors, app recovers cleanly on reload.
5. Send a message that ends up hitting the `MAX_TOOL_ITERATIONS` cap → still resolves to a visible (streamed or fallback) message, no hang.

---

## ⬜ Step 2 — Parallelize sequential tool-use calls *(optional)*

**Note for plan execution**: deliberately deferred — smaller win than Step 1, and only matters for turns where the model calls multiple tools at once. Skip unless explicitly requested.

**Goal**: when a single assistant turn contains more than one `tool_use` block, execute them concurrently instead of one at a time, since `lookup_dota_entity`/`lookup_hero_kit` calls are independent of each other.

- `app/api/chat/route.ts` — replace the sequential `for...of` loop over `response.content` (building `toolResults`) with a `Promise.all` over the tool_use blocks

**Done looks like**: a question that triggers multiple simultaneous tool calls (e.g. comparing two heroes) resolves in roughly the time of the slowest single lookup, not the sum of all of them.

**Verify manually**:
1. Ask a question likely to trigger two or more tool calls in the same turn (e.g. "compare Pudge and Axe's abilities") → response time doesn't scale linearly with the number of tool calls.
2. Ask a normal single-lookup question → no regression in behavior or correctness.

---

## ⬜ Step 3 — Reconsider model choice per turn type *(optional)*

**Note for plan execution**: deliberately deferred — needs a decision on whether splitting models is worth the added complexity. Skip unless explicitly requested.

**Goal**: evaluate whether the tool-deciding turns (which just need to pick a tool and arguments) could use a faster/cheaper model than the final answer-composing turn, without hurting grounding accuracy.

- `lib/anthropic.ts` — evaluate a second model constant (e.g. Haiku-tier) for tool-selection turns, keeping the current model for the final answer turn
- `app/api/chat/route.ts` — if adopted, use the faster model for the tool-use loop's intermediate calls only

**Done looks like**: a decision is recorded (either adopted with a measured latency improvement, or explicitly rejected with the reason) in `docs/progress-log.md`.

**Verify manually**:
1. If adopted: ask several grounded questions (hero/ability/item lookups) → answers remain accurate, no regression from the current model's tool-selection quality.
2. If adopted: compare end-to-end latency before/after on the same set of questions.

---

## Sequencing notes

- Step 1 (streaming) is the highest-value step — it's the one actually driving the ~10s-feels-slow complaint, since perceived latency is what's being reported, not necessarily total compute time.
- Steps 2-3 are optional, smaller, and independent of Step 1 and each other — pick up only if Step 1 doesn't fully resolve the complaint or time permits.
- This doc doesn't block or get blocked by `docs/ux-improvements-plan.md` Step 4 (routing/shell) — no shared files.
