import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseTaskFile, setStatus, TaskFileError } from '../src/index.mjs';

const SAMPLE = `# Add login form UI

Status: open          # open | in-progress | done
Priority: high        # high | medium | low
Feature: user-login
Depends on: none       # task filenames that must be merged first

## Goal
A login page at /login with email + password fields and a submit button.

## Done when
- [ ] /login renders the form
- [x] Empty fields show an inline error
`;

describe('parseTaskFile', () => {
  it('reads the title from the first heading', () => {
    assert.equal(parseTaskFile(SAMPLE, '0001').title, 'Add login form UI');
  });

  it('reads fields and strips trailing comments', () => {
    const task = parseTaskFile(SAMPLE, '0001');
    assert.equal(task.status, 'open');
    assert.equal(task.priority, 'high');
    assert.equal(task.feature, 'user-login');
  });

  it('normalises "none" dependencies to an empty array', () => {
    assert.deepEqual(parseTaskFile(SAMPLE, '0001').dependsOn, []);
  });

  it('normalises dependency filenames and bare ids to ids', () => {
    const text = SAMPLE.replace(
      'Depends on: none',
      'Depends on: 0002-backlog-board.md, 0003',
    );
    assert.deepEqual(parseTaskFile(text, '0004').dependsOn, ['0002', '0003']);
  });

  it('reads the goal paragraph', () => {
    assert.match(parseTaskFile(SAMPLE, '0001').goal, /^A login page at \/login/);
  });

  it('reads the done-when checklist with checked state', () => {
    assert.deepEqual(parseTaskFile(SAMPLE, '0001').doneWhen, [
      { text: '/login renders the form', checked: false },
      { text: 'Empty fields show an inline error', checked: true },
    ]);
  });

  it('rejects an unknown status', () => {
    const text = SAMPLE.replace('Status: open', 'Status: shipped');
    assert.throws(() => parseTaskFile(text, '0001'), (err) => {
      assert.ok(err instanceof TaskFileError);
      assert.equal(err.field, 'Status');
      return true;
    });
  });

  it('rejects a missing required field', () => {
    const text = SAMPLE.replace(/^Priority:.*$/m, '');
    assert.throws(() => parseTaskFile(text, '0001'), (err) => {
      assert.equal(err.field, 'Priority');
      return true;
    });
  });

  it('rejects a task that depends on itself', () => {
    const text = SAMPLE.replace('Depends on: none', 'Depends on: 0001');
    assert.throws(() => parseTaskFile(text, '0001'), (err) => {
      assert.equal(err.field, 'Depends on');
      return true;
    });
  });
});

describe('setStatus', () => {
  it('rewrites the status and keeps the trailing comment', () => {
    const out = setStatus(SAMPLE, 'done');
    assert.match(out, /^Status: done {10}# open \| in-progress \| done$/m);
    assert.equal(parseTaskFile(out, '0001').status, 'done');
  });

  it('leaves the rest of the file byte-identical', () => {
    const out = setStatus(SAMPLE, 'in-progress');
    const strip = (s) => s.replace(/^Status:.*$/m, '');
    assert.equal(strip(out), strip(SAMPLE));
  });

  it('rejects an unknown status', () => {
    assert.throws(() => setStatus(SAMPLE, 'nope'), TaskFileError);
  });
});
