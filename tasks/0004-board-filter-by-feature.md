# Filter the board by feature

Status: open          # proposed | open | in-progress | done
Priority: low         # high | medium | low
Feature: control-room
Depends on: 0002-backlog-board.md       # task ids or task filenames that must be merged first

## Goal
A row of filter chips above the board, one per distinct feature plus an "All" chip.
Clicking a chip narrows every column to that feature. The active chip is visibly
marked and exposed to assistive tech with aria-pressed.

## Done when
- [ ] One chip per distinct feature, plus "All", is rendered
- [ ] Clicking a chip filters all four columns
- [ ] The active chip has aria-pressed="true"
- [ ] Tests pass, build is green
