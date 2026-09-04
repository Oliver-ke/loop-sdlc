# Task detail page

Status: open          # proposed | open | in-progress | done
Priority: medium      # high | medium | low
Feature: control-room
Depends on: 0001       # task ids or task filenames that must be merged first

## Goal
A page at /tasks/[id] showing one task's title, status, priority, feature, goal text,
and its "Done when" checklist rendered as checkboxes reflecting the file's state.
An unknown id renders the Next.js 404.

## Done when
- [ ] /tasks/0001 renders the title and the goal text
- [ ] The checklist renders one item per "Done when" line with the right checked state
- [ ] An unknown id returns 404
- [ ] Tests pass, build is green
