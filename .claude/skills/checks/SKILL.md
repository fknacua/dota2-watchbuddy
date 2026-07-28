---
name: checks
description: Run this project's static checks — typecheck, lint, build — using fixed, known-good commands, nothing else. Use whenever asked to typecheck, lint, build, or run "the checks"/"static checks", or when another skill (e.g. plan-executor) needs automated verification of a code change. Do NOT use for running the app, testing UI, or any manual/runtime verification — that's out of scope for this skill.
---

# Checks

Runs exactly three commands, in this order, from the repo root
(`/Users/fknacua/Documents/Projects/Personal/dota-watchbuddy`). Do not
substitute, add, or discover alternative commands — these are fixed and
known to work in this project:

1. Typecheck: `npx tsc --noEmit`
2. Lint: `npm run lint`
3. Build: `npm run build`

## Rules

- Run all three even if an earlier one fails, so the report covers all
  three areas in one pass — don't stop at the first failure.
- Don't run `npm install`, clear caches, delete `.next`/`tsconfig.tsbuildinfo`,
  or otherwise "fix the environment" first. If a command fails for
  environment reasons (not a code issue), report that plainly and stop —
  don't improvise workarounds or additional diagnostic commands.
- Don't run tests — there is no test script in this project.
- Don't run `next dev`/`next start` or otherwise launch the app — that's
  runtime verification, not a static check, and out of scope here.

## Report

For each of the three, state pass/fail in one line. On failure, include the
relevant error output (trimmed to the useful part, not the full log) so it's
actionable without re-running anything.
