# Serve the backlog as JSON

Status: open          # proposed | open | in-progress | done
Priority: high        # high | medium | low
Feature: control-room
Depends on: none       # task ids or task filenames that must be merged first

## Goal
A route handler at GET /api/tasks that reads every file in /tasks, parses it with
parseTaskFile from @loop/harness, and returns `{ tasks: Task[] }` sorted by id.
Malformed task files must produce a 500 with the offending filename in the body,
never a silently truncated list.

## Done when
- [ ] app/src/lib/tasks.ts exports `loadTasks()` reading from `process.env.TASKS_DIR` or ../tasks
- [ ] GET /api/tasks returns 200 with `{ tasks: [...] }` sorted by id
- [ ] A malformed fixture makes loadTasks throw with the filename in the message
- [ ] Tests cover the happy path and the malformed case using app/tests/fixtures/tasks
- [ ] Tests pass, build is green
