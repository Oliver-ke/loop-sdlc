# Run history page

Status: open          # proposed | open | in-progress | done
Priority: low         # high | medium | low
Feature: observability
Depends on: none       # task ids or task filenames that must be merged first

## Goal
A page at /runs listing recent loop runs newest-first from a JSON file at
app/src/data/runs.json — each row showing started time, the task id it worked on,
the outcome (success | failure | no-eligible-task), and duration in seconds.
Reading real runs from the GitHub API is a later task; this one renders the fixture.

## Done when
- [ ] /runs renders one row per entry in runs.json, newest first
- [ ] Each row shows started time, task id, outcome and duration
- [ ] An empty runs.json renders "No runs yet"
- [ ] Tests pass, build is green
