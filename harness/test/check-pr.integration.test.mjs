import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// This suite drives the real check-pr.mjs CLI against a throwaway git
// repository, because the bug it guards against (git's quoted-path encoding
// of non-ASCII filenames) lives in the seam between git's real output format
// and the pure checkPullRequest() logic — unit tests that hand in already-clean
// `changedFiles` strings can never exercise that seam.

const here = path.dirname(fileURLToPath(import.meta.url));
const checkPrScript = path.join(here, '..', 'src', 'cli', 'check-pr.mjs');

// Do not inherit the host machine's git config: in particular this must not
// pick up a `core.quotePath=false` that would mask the bug this suite exists
// to catch.
const gitEnv = {
  ...process.env,
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_SYSTEM: '/dev/null',
};

const openTask = [
  '# A task',
  '',
  'Status: open',
  'Priority: high',
  'Feature: demo',
  'Depends on: none',
  '',
  '## Goal',
  'Do the thing.',
  '',
  '## Done when',
  '- [ ] the criterion',
  '',
].join('\n');

const doneTask = openTask.replace('Status: open', 'Status: done').replace('- [ ]', '- [x]');

describe('check-pr.mjs against a real git repository', () => {
  let repoDir;

  function git(args) {
    return execFileSync('git', args, { cwd: repoDir, env: gitEnv, encoding: 'utf8' });
  }

  function runCheckPr(author) {
    return spawnSync(process.execPath, [checkPrScript, '--base', 'main', '--author', author], {
      cwd: repoDir,
      env: gitEnv,
      encoding: 'utf8',
    });
  }

  before(() => {
    repoDir = mkdtempSync(path.join(tmpdir(), 'pr-rules-integration-'));

    git(['init', '-b', 'main']);
    git(['config', 'user.email', 't@t']);
    git(['config', 'user.name', 't']);

    // Baseline commit on main: one valid, unchecked open task.
    mkdirSync(path.join(repoDir, 'tasks'), { recursive: true });
    writeFileSync(path.join(repoDir, 'tasks', '0001-demo.md'), openTask);
    git(['add', '-A']);
    git(['commit', '-m', 'baseline']);

    // A bot-authored branch that legitimately marks the task done, AND
    // sneaks in a protected-path change whose filename contains a
    // non-ASCII byte — the kind of path `git diff --name-only` (without
    // -z) would wrap in C-style quotes with octal escapes.
    git(['checkout', '-b', 'bot-branch']);
    writeFileSync(path.join(repoDir, 'tasks', '0001-demo.md'), doneTask);
    mkdirSync(path.join(repoDir, '.github', 'workflows'), { recursive: true });
    writeFileSync(
      path.join(repoDir, '.github', 'workflows', 'ëvil.yml'),
      'on: pull_request\njobs:\n  pwn:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo pwned\n',
    );
    git(['add', '-A']);
    git(['commit', '-m', 'bot change: mark task done and add a workflow']);
  });

  after(() => {
    rmSync(repoDir, { recursive: true, force: true });
  });

  it('catches a protected path hidden behind a non-ASCII filename', () => {
    const result = runCheckPr('claude[bot]');
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /\[protected-path\]/);
    // This exact, unescaped path only appears in stderr when the CLI reads
    // git's raw (-z) output. If `-z` were reverted, git would instead emit
    // the quoted form `".github/workflows/\303\253vil.yml"`, isProtectedPath
    // would not recognise it, and this assertion would fail.
    assert.match(result.stderr, /\.github\/workflows\/ëvil\.yml/);
  });

  it('exits 0 for a human author without enforcing anything', () => {
    const result = runCheckPr('Oliver-ke');
    assert.equal(result.status, 0);
    assert.match(result.stdout, /human — rules not enforced/);
  });
});
