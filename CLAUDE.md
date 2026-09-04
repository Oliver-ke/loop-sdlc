# Rules for every run

You are running unattended in CI. One run does one task, opens one pull request, and exits.

## Scope
- Do exactly one task from `/tasks`. Never start a second one.
- Before writing code, search the repo to confirm the thing isn't already built.
- If the task turns out too big for one run, do **not** partially implement it. Create
  smaller follow-up task files with `Status: proposed`, mark nothing done, and stop.

## Never touch
`.github/`, `infra/`, `harness/`, `app/tests/acceptance/`, `CLAUDE.md`, `CODEOWNERS`,
`app/CLAUDE.md`, `app/AGENTS.md`, `package.json`, `package-lock.json`,
`app/package.json`, `app/vitest.config.mts`, `app/vitest.setup.ts`. CI fails your
pull request if you do. If a task seems to need one of these changed, file a
follow-up task and stop.

If you need a new dependency, you cannot add one. File a follow-up task and stop.

## Definition of done
`npm run verify` passes — typecheck, lint, tests, build — with no test skipped, no
`@ts-expect-error` added, and no assertion weakened. Fix the code, never the check.
A task is done only when every `Done when` box is genuinely true; then check the boxes
and set `Status: done` in that task's file, in the same pull request.

## Workflow
- Branch off `main`. Never commit to `main`.
- Write the test first, watch it fail, then make it pass.
- Open one pull request. Body must contain `Task: tasks/NNNN-<slug>.md` and a one-line
  summary of what changed and how you verified it.
- Report honestly. If you could not finish, say so in the pull request body and leave
  the status as it was. An honest unfinished run is a good run; a false "done" is not.

## Conventions
- App code: TypeScript, Next.js App Router, files under `app/src/`. Unit tests colocated
  as `*.test.ts(x)`.
- Never use `runtime = 'edge'`. The app reads the filesystem.
- Import shared task logic from `@loop/harness`; do not reimplement the task file parser.
