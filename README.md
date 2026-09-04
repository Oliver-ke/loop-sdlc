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
`app/tsconfig.json`, `.nvmrc`, plus every extension of `app/vitest.config.*`,
`app/vitest.setup.*`, `app/eslint.config.*`, `app/next.config.*` and
`app/postcss.config.*` (`.ts`, `.mts`, `.cts`, `.js`, `.mjs`, `.cjs` as each tool
resolves them). **`harness/src/protected.mjs` is the authoritative list**; this
paragraph and `CODEOWNERS` mirror it. Enforced by the required `pr-rules` check — not by
CODEOWNERS review, which zero required approvals makes advisory. `app/CLAUDE.md` and
`app/AGENTS.md` are on it because `create-next-app` generates them and Claude Code reads
them every run alongside the root `CLAUDE.md`: any instruction file the agent can edit is
one it can weaken.

Three properties of that enforcement are easy to lose in a refactor and worth knowing:

- **Extensions that do not exist yet are protected too.** Protecting only
  `app/vitest.config.mts` would let the agent *add* an `app/vitest.config.ts` that drops
  `tests/**` from `include`, so `app/tests/acceptance/` never runs and `verify` stays
  green forever. A config the agent may add is a config it can use to shadow the one it
  may not edit. Same for the ESLint, tsconfig and Next configs, and `.nvmrc` picks the
  Node version both CI jobs run on.
- **Renames and deletions count.** `check-pr.mjs` diffs with `--no-renames`, because with
  git's default rename detection a `git mv CLAUDE.md tasks/notes.md` reports only the
  destination and reads as an unrelated addition. Deleting a task file is a violation too:
  otherwise the agent could clear the human approval queue, or satisfy "every run must
  record what it did" by deleting an unrelated task.
- **The checker comes from the base branch.** On a `pull_request` event the checkout is
  the PR's merge ref, so running the checked-out `check-pr.mjs` would let a pull request
  judge itself with its own rewritten `PROTECTED_PATHS`. The `pr-rules` job extracts
  `harness/` from `origin/$BASE_REF` with `git archive` and runs that copy instead. One
  consequence: a pull request is always judged by the rules on `main`, so a change to the
  rules themselves only takes effect for pull requests opened after it merges.
- **Still open, and not fixable in-repo:** a pull request can edit `.github/workflows/ci.yml`
  itself — keep the YAML valid, keep the job named `pr-rules`, replace the step with
  `exit 0` — and the required check goes green. For a `pull_request` event the workflow
  definition comes from the pull request, so no in-repository check can close this. It has
  to be closed outside the repo, by restricting what the loop's token may push.
