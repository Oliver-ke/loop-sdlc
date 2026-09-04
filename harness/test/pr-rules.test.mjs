import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { checkPullRequest, isProtectedPath } from '../src/index.mjs';

const taskText = ({ status = 'open', done = ['- [x] it works'] } = {}) =>
  [
    '# A task',
    '',
    `Status: ${status}`,
    'Priority: high',
    'Feature: demo',
    'Depends on: none',
    '',
    '## Goal',
    'Do the thing.',
    '',
    '## Done when',
    ...done,
    '',
  ].join('\n');

const bot = (overrides) => ({
  author: 'claude[bot]',
  changedFiles: ['app/src/app/page.tsx'],
  taskChanges: [{ id: '0001', before: taskText(), after: taskText({ status: 'done' }) }],
  ...overrides,
});

describe('isProtectedPath', () => {
  it('matches directory prefixes', () => {
    assert.equal(isProtectedPath('.github/workflows/ci.yml'), true);
    assert.equal(isProtectedPath('infra/main.tf'), true);
    assert.equal(isProtectedPath('app/tests/acceptance/board.test.tsx'), true);
  });

  it('matches exact files', () => {
    assert.equal(isProtectedPath('CLAUDE.md'), true);
    assert.equal(isProtectedPath('package-lock.json'), true);
  });

  it('protects every agent instruction file, not just the root one', () => {
    assert.equal(isProtectedPath('app/CLAUDE.md'), true);
    assert.equal(isProtectedPath('app/AGENTS.md'), true);
  });

  it('leaves app source and tasks writable', () => {
    assert.equal(isProtectedPath('app/src/lib/tasks.ts'), false);
    assert.equal(isProtectedPath('app/src/lib/tasks.test.ts'), false);
    assert.equal(isProtectedPath('tasks/0007-new-task.md'), false);
  });

  it('does not match a path that merely starts with a protected name', () => {
    assert.equal(isProtectedPath('app/src/harness-notes.md'), false);
  });

  // A config the agent may ADD is a config it can use to shadow the one it may
  // not EDIT: an added `app/vitest.config.ts` overrides the protected
  // `app/vitest.config.mts` and can drop `tests/**` from `include`, so
  // `app/tests/acceptance/` never runs while `verify` stays green. Every
  // extension each tool resolves must therefore be protected, in use or not.
  it('protects every extension a tool would resolve, not just the one in use', () => {
    for (const shadow of [
      'app/vitest.config.ts',
      'app/vitest.config.cts',
      'app/vitest.config.js',
      'app/vitest.config.cjs',
      'app/vitest.config.mjs',
      'app/vitest.setup.mts',
      'app/vitest.setup.js',
      'app/vitest.setup.mjs',
      'app/tsconfig.json',
      'app/eslint.config.mjs',
      'app/eslint.config.ts',
      'app/eslint.config.js',
      'app/eslint.config.cjs',
      'app/eslint.config.mts',
      'app/eslint.config.cts',
      'app/next.config.ts',
      'app/next.config.js',
      'app/next.config.mjs',
      'app/postcss.config.mjs',
      'app/postcss.config.js',
      '.nvmrc',
    ]) {
      assert.equal(isProtectedPath(shadow), true, `${shadow} must be protected`);
    }
  });
});

describe('checkPullRequest', () => {
  it('does not enforce anything for a human author', () => {
    const result = checkPullRequest({
      author: 'Oliver-ke',
      changedFiles: ['.github/workflows/ci.yml', 'harness/src/select.mjs'],
      taskChanges: [],
    });
    assert.equal(result.enforced, false);
    assert.deepEqual(result.violations, []);
  });

  it('enforces the rules for an unrecognised [bot] author', () => {
    const result = checkPullRequest(
      bot({ author: 'someother[bot]', changedFiles: ['harness/src/pr-rules.mjs'] }),
    );
    assert.equal(result.enforced, true);
    assert.deepEqual(
      result.violations.map((v) => v.rule),
      ['protected-path'],
    );
  });

  it('does not enforce anything for a human login that is not in the bot list', () => {
    const result = checkPullRequest(
      bot({ author: 'some-contributor', changedFiles: ['harness/src/pr-rules.mjs'] }),
    );
    assert.equal(result.enforced, false);
    assert.deepEqual(result.violations, []);
  });

  it('rejects a bot pull request that deletes a task file', () => {
    const result = checkPullRequest(
      bot({
        changedFiles: ['tasks/0007-someone-elses-idea.md'],
        taskChanges: [
          { id: '0007', before: taskText({ status: 'proposed' }), after: null },
        ],
      }),
    );
    assert.equal(result.enforced, true);
    assert.deepEqual(
      result.violations.map((v) => v.rule),
      ['task-status'],
    );
    assert.match(result.violations[0].message, /tasks\/0007: a task file may not be deleted/);
  });

  it('passes a clean bot pull request', () => {
    const result = checkPullRequest(bot());
    assert.equal(result.enforced, true);
    assert.deepEqual(result.violations, []);
  });

  it('rejects a bot pull request touching a protected path', () => {
    const result = checkPullRequest(
      bot({ changedFiles: ['app/src/app/page.tsx', '.github/workflows/loop.yml'] }),
    );
    assert.deepEqual(
      result.violations.map((v) => v.rule),
      ['protected-path'],
    );
    assert.match(result.violations[0].message, /\.github\/workflows\/loop\.yml/);
  });

  it('rejects a bot pull request approving its own proposed task', () => {
    const result = checkPullRequest(
      bot({
        taskChanges: [
          {
            id: '0007',
            before: taskText({ status: 'proposed' }),
            after: taskText({ status: 'open' }),
          },
        ],
      }),
    );
    assert.deepEqual(
      result.violations.map((v) => v.rule),
      ['unapproved-task'],
    );
  });

  it('rejects a bot pull request that changes no task file', () => {
    const result = checkPullRequest(bot({ taskChanges: [] }));
    assert.deepEqual(
      result.violations.map((v) => v.rule),
      ['task-status'],
    );
    assert.match(result.violations[0].message, /no task file/);
  });

  it('rejects marking two tasks done in one pull request', () => {
    const result = checkPullRequest(
      bot({
        taskChanges: [
          { id: '0001', before: taskText(), after: taskText({ status: 'done' }) },
          { id: '0002', before: taskText(), after: taskText({ status: 'done' }) },
        ],
      }),
    );
    assert.match(result.violations[0].message, /more than one task/);
  });

  it('rejects marking a task done with an unchecked done-when box', () => {
    const result = checkPullRequest(
      bot({
        taskChanges: [
          {
            id: '0001',
            before: taskText(),
            after: taskText({ status: 'done', done: ['- [x] a', '- [ ] b'] }),
          },
        ],
      }),
    );
    assert.match(result.violations[0].message, /unchecked "Done when"/);
  });

  it('rejects marking a task done with an empty done-when list', () => {
    const result = checkPullRequest(
      bot({
        taskChanges: [
          {
            id: '0001',
            before: taskText(),
            after: taskText({ status: 'done', done: [] }),
          },
        ],
      }),
    );
    assert.match(result.violations[0].message, /empty "Done when" list/);
  });

  it('accepts the follow-up path: new proposed tasks and nothing marked done', () => {
    const result = checkPullRequest(
      bot({
        changedFiles: ['tasks/0007-split-a.md', 'tasks/0008-split-b.md'],
        taskChanges: [
          { id: '0007', before: null, after: taskText({ status: 'proposed' }) },
          { id: '0008', before: null, after: taskText({ status: 'proposed' }) },
        ],
      }),
    );
    assert.deepEqual(result.violations, []);
  });

  it('rejects a new task file that is not proposed', () => {
    const result = checkPullRequest(
      bot({
        changedFiles: ['tasks/0007-split-a.md'],
        taskChanges: [{ id: '0007', before: null, after: taskText({ status: 'open' }) }],
      }),
    );
    assert.match(result.violations[0].message, /new task 0007 must be created with/);
  });

  it('reports an unparseable task file as a task-status violation', () => {
    const result = checkPullRequest(
      bot({ taskChanges: [{ id: '0001', before: taskText(), after: '# broken\n' }] }),
    );
    assert.match(result.violations[0].message, /could not be parsed/);
  });

  it('rejects marking a task done after rewriting the "Done when" items in the same pull request', () => {
    const result = checkPullRequest(
      bot({
        taskChanges: [
          {
            id: '0001',
            before: taskText({ done: ['- [ ] the original criterion'] }),
            after: taskText({ status: 'done', done: ['- [x] a much easier criterion'] }),
          },
        ],
      }),
    );
    assert.match(result.violations[0].message, /"Done when" items were rewritten/);
  });
});
