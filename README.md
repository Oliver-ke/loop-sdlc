# loop-sdlc

An agent that runs on CI, does one small task per run, and opens a pull request.

## Layout
| Path | What it is |
|---|---|
| `app/` | The Loop Control Room — a Next.js app that shows the backlog and run history |
| `harness/` | `@loop/harness`: task file parser, selection rules, PR guardrails, agent prompt |
| `tasks/` | The backlog. One markdown file per task |
| `infra/` | Terraform for the sandbox AWS account. Plan-only; a human applies |

## Commands
| Command | What it does |
|---|---|
| `npm run verify` | typecheck, lint, test, build — the definition of done |
| `npm run tasks:validate` | every task file parses, ids unique, dependencies resolve |
| `npm run tasks:next` | prints the task the next loop run would pick, and why it skipped the rest |
| `npm run tasks:status -- open tasks/0006-*.md` | flips a task's status (this is how you approve a proposed task) |
| `npm run pr:check -- --author <login>` | runs the PR guardrails against the current branch |

## The loop
`.github/workflows/loop.yml` runs on a schedule and on manual dispatch. Each run picks one
eligible task, implements it, and opens a pull request. A human merges. Nothing merges
without `verify` and `pr-rules` green.

## Reviewing an agent pull request
Read the diff, then confirm the boxes it ticked are actually true. Two specific traps:

- **A pull request showing *no* checks at all is itself the red flag.** `.github/` is protected
  by the `pr-rules` check, but a change that breaks the workflow file's YAML stops the workflow
  parsing, so no check runs get posted at all. Required checks then stay pending and the merge
  button is blocked — unless someone reaches for the admin override. Never admin-merge a pull
  request with missing or pending checks; that override exists only so a solo maintainer can
  merge their own reviewed work.
- **`verify` cannot see a weakened test.** The agent may write unit tests under `app/src/`, so
  it can also weaken its own. Only `app/tests/acceptance/` is beyond its reach. Until those
  acceptance tests exist, human review is the only thing catching a deleted assertion.

## Stopping it
```bash
gh workflow disable loop.yml     # stops all future runs
gh run cancel <run-id>           # stops the run in flight
gh secret delete ANTHROPIC_API_KEY   # revokes the credential; runs then fail closed
```
Any one of these is sufficient. Deleting the secret is the hardest stop: the API key is
scoped to its own Anthropic Console workspace, so revoking it there kills spend even if a
workflow file survives somewhere.

## Where the caps are
| Cap | Where it lives |
|---|---|
| Turns per run | `--max-turns` in `loop.yml` |
| Wall clock per run | `timeout-minutes` on the `loop` job |
| One run at a time | `concurrency` in `loop.yml` |
| Dollars per month | Anthropic Console → the `loop-sdlc` workspace's spend limit |
| Runner minutes | GitHub billing → Actions spending limit |

## What the agent may not change
`.github/`, `infra/`, `harness/`, `app/tests/acceptance/`, `CLAUDE.md`, `CODEOWNERS`,
`app/CLAUDE.md`, `app/AGENTS.md`, `package.json`, `package-lock.json`, `app/package.json`,
and the Vitest config. The list lives in `harness/src/protected.mjs` and is enforced by the
required `pr-rules` check — not only by CODEOWNERS review.
