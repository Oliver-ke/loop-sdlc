# Backlog board on the home page

Status: open          # proposed | open | in-progress | done
Priority: high        # high | medium | low
Feature: control-room
Depends on: 0001       # task ids or task filenames that must be merged first

## Goal
The home page renders four columns — Proposed, Open, In progress, Done — each listing
the tasks in that status as cards showing id, title, priority and feature. Column
headers show the count. An empty column says so rather than rendering nothing.

## Done when
- [ ] / renders four column headings with counts
- [ ] Each task appears as a card in exactly one column
- [ ] An empty column renders the text "Nothing here"
- [ ] Tests pass, build is green
