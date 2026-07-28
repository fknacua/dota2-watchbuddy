---
name: plan-writer
description: Create or restructure a staged implementation plan doc (like docs/plan.md) using this project's Step N / Step N.M convention. Use when the user wants to write a new staged plan, reorganize/split an existing one, add/remove steps, or otherwise edit the plan doc's structure. Triggers on "restructure the plan", "write a plan for X", "add a step to the plan", "split this stage up". Do NOT use for executing a stage's work (use plan-executor) or for one-off task planning (use Plan Mode).
---

# Plan Writer

Writes and restructures staged implementation plan docs in this project's
established format. Companion to `plan-executor` (which runs a stage's work
but explicitly won't edit the plan's structure, and separately owns
appending dated progress-log entries after execution) — this skill owns the
authoring/reorganizing side of the plan doc itself.

## Format conventions

**Top-level unit is `Step N`, not "Stage" or "Phase".** Each Step gets its
own `##` heading with a status marker prefix: `✅` done, `🔄` in progress,
`⬜` not started.

**Sub-steps are `Step N.M`**, as `###` headings, each with its own status
marker. Sub-steps are the granular file-list/task breakdown of a Step — use
them once a Step's file list is doing more than one logically distinct
thing (e.g. "data layer" vs "service + controller", or "fetch/cache" vs
"tool wiring" vs "system prompt"). A small Step with one cohesive chunk of
work doesn't need sub-steps at all.

**Per Step (not per sub-step), include:**
- `**Goal**` — one or two sentences, why this step exists / what it proves
- Sub-step bodies as terse bullet lists of files/actions — no prose
  paragraphs inside a sub-step, just what to create/change
- `**Done looks like**` — one or two sentences, the observable end state
- `**Verify manually**` — numbered checklist the user (or plan-executor) runs

Do not add a "time to run the app" or similar inline checkpoint marker
between steps — verification lives entirely in the "Verify manually" list.

**Optional/deferred sub-steps**: mark with the status emoji plus an explicit
inline flag, e.g. `⬜ *(optional — on hold)*`, and add a one-line "Note for
plan execution" immediately under the sub-step heading stating it's
deliberately deferred and should be skipped unless explicitly requested.
This is the signal `plan-executor` (and anyone skimming the doc) uses to
know a sub-step isn't required for the parent Step to count as done.

**The plan doc states current decisions only.** Don't write dated
"Revision (date)" narrative or superseded-approach writeups inline in a
Step body — that belongs in the project's progress-log doc, which
`plan-executor` maintains as it executes steps. If restructuring an
existing plan that has this kind of narrative inline, move it out rather
than duplicating it.

## Other sections worth keeping (project-agnostic, adapt as needed)

- **Context** — background the reader needs that isn't obvious from the
  repo: what the project is for, where reference material lives, related
  docs it hands off to (e.g. a separate UX-pass plan), what's explicitly
  out of scope for this doc (e.g. deploy tracked elsewhere).
- **Cross-cutting architectural decisions** — decisions that apply across
  multiple steps (model choice, a shared tool-use pattern, a shared visual
  system) rather than repeating them per step.
- **Sequencing notes** — a short closing section on priority/ordering if
  the steps aren't strictly sequential in importance, and pointers to
  what's intentionally out of this doc's scope.

## Workflow

1. **Locate or confirm the target doc.** If restructuring, read the whole
   existing file first — don't guess at content from a summary.
2. **Discuss structure before writing**, if the user is mid-conversation
   working through the split (grouping into Steps, sub-step boundaries,
   what's optional, what's out of scope) — this is usually an iterative
   design conversation, not a one-shot write. Don't jump straight to
   editing the file until the user says the structure is ready.
3. **Preserve existing status and content fidelity** when restructuring:
   a step already marked done stays done; don't invent new "done looks
   like" or "verify" criteria for completed work — carry forward what's
   already there, just reorganized.
4. **Write the file.**
5. **Summarize what changed** — which steps were split/merged/reworded,
   what's flagged optional — so the user can spot anything that drifted
   from what they asked for.
