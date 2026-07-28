---
name: plan-executor
description: Execute the next (or a named) stage of a staged implementation plan doc, one stage at a time, with a pre-work check-in and a plan-doc status/progress-log update afterward. Use when implementing a feature, or making any non-trivial code change, that is tracked in a staged plan document (status markers like ✅/🔄/⬜, checkboxes, or "Phase N" headings, each with something like a file list, "done looks like", or "verify" section). Triggers on "/plan-executor", "execute the next stage", "implement stage N", "work through the plan", "continue the plan". Do NOT use for one-off changes with no plan doc, or for writing/editing the plan itself.
---

# Plan Executor

Executes exactly one stage of an existing staged plan document, then stops for
review. Never cascades into later stages, even if the user's phrasing sounds
open-ended ("implement the plan") — the whole point of this skill is the
plan → review → execute rhythm, one stage per run.

## Inputs

Optional arguments, in either order: a path to the plan file, and/or a stage
identifier (name, number, or heading text). Examples:
- `/plan-executor` — auto-detect plan file and next stage
- `/plan-executor docs/plan.md` — explicit plan file, auto-detect stage
- `/plan-executor "stage 3"` — explicit stage, auto-detect plan file

## Step 1 — Locate the plan doc

If a path was given, use it. Otherwise search the project for a staged plan
doc: likely spots are `docs/plan.md`, `PLAN.md`, `docs/*plan*.md`, or a file
recently discussed in conversation. If more than one plausible candidate
exists and it isn't obvious from context, ask the user which one.

Note plan docs sometimes hand off to a sibling file mid-document (as
`docs/plan.md` does to `docs/ux-improvements-plan.md` in this repo) — follow
that handoff if the auto-detected "current" stage lives in the other file.

## Step 2 — Parse stage status generically

Don't assume one status convention. Recognize any of, in the plan doc's own
style:
- Emoji markers: `✅` / `🔄` / `⬜` (or similar done/in-progress/todo glyphs)
- Checkbox lists: `- [x]` / `- [ ]`
- Prose markers: "DONE", "IN PROGRESS", "TODO", "NOT STARTED" near a stage heading
- Ordering: stages are almost always in doc order — the target is the first
  not-fully-done stage, unless the user named one explicitly

If a stage identifier was given explicitly and it's *not* the first
incomplete stage, flag that it skips ahead of unfinished earlier work and
confirm the user actually wants that (don't just silently comply — plans are
usually sequential for a reason).

Before doing any work, mark the stage as in-progress (or equivalent) in the plan doc, so that if the process is interrupted, the user can see that it was started but not finished.

## Step 3 — Check in before writing code

Plan docs drift out of date between when they were written and when they're
executed (dependencies change, earlier stages shifted scope, etc.). Before
touching any files:
- Summarize the target stage in a few lines: its goal, the files it lists,
  and its "done looks like" criteria if present.
- Note anything that looks stale or inconsistent with the current repo state
  (e.g. a file the stage says to create already exists with different
  content, or a prior stage's decision the plan references seems to have
  changed).
- Get a go-ahead before implementing. This can be quick — it's a sanity
  check, not a full re-plan.

## Step 4 — Implement, scoped to this stage only

Use TodoWrite to track the stage's sub-steps. Implement only what this
stage's file list / description covers. If while working you notice the
plan requires groundwork that isn't explicitly listed (e.g. a missing config
file), use judgment to include it — but don't pull in work that belongs to a
*later* stage just because it's adjacent or convenient.

Follow the project's existing conventions (found by reading nearby code),
not the plan doc's prose, when the two are ambiguous about implementation
details — the plan describes intent, the codebase is the source of truth for
style.

## Step 5 — Verify

Invoke the `checks` skill to run the project's static checks (typecheck,
lint, build). Don't run those commands manually or introduce new tooling —
`checks` already knows the right fixed commands for this project. Don't run
or launch the app yourself (not even via the `run` skill) — that's the
user's job, covered below.

Surface the plan's own "verify manually" / "done looks like" bullets (if
present) as a checklist and hand it to the user to run themselves — this
includes anything requiring running/using the app (UI changes, a running
service), not just items explicitly labeled "manual". Don't attempt to
simulate or guess the outcome. Stop here and wait for the user to report
back. Be explicit about what you did check automatically (typecheck/lint/
build) vs. what you're now waiting on them for.

## Step 6 — Confirm before marking done

Do not flip the stage's status marker to done until the user confirms the
manual checklist passed. If they report failures or partial results:
- Treat it as normal follow-up work — fix what's broken, then re-offer the
  relevant checklist items rather than the whole list.
- Leave the stage's status as in-progress in the meantime.

If there was nothing to manually verify (automated checks fully covered the
stage), you can proceed straight to Step 7 without waiting.

## Step 7 — Update the plan doc

Once verification (automated, or automated + user-confirmed manual) is
complete:
- Flip the stage's status marker to done (or in-progress, if only partially
  complete — be honest about partial completion rather than marking done).
- Append a dated progress-log entry (use today's date) to the sibling
  progress-log file (e.g. `docs/plan.md` → `docs/progress-log.md`) — look at
  how prior entries in that file are written and match that voice and level
  of detail, rather than introducing a new format.
- Don't rewrite or reorganize unrelated parts of the plan doc yourself — if
  the plan doc's *structure* needs editing (splitting/merging stages,
  reformatting), invoke the `plan-writer` skill for that instead.

## Step 8 — Stop

End with a short summary: what was built, what verification passed
(automated and user-confirmed), and which stage is next. Do not proceed to
the next stage automatically, even if it looks small or obviously scoped.
Do not create a git commit — leave changes staged for the user to review
and commit themselves.
