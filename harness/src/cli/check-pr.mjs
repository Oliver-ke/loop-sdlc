#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { checkPullRequest, TASK_ID_PATTERN } from '../index.mjs';

const { values } = parseArgs({
  options: {
    base: { type: 'string', default: 'origin/main' },
    author: { type: 'string' },
  },
});

if (!values.author) {
  console.error('usage: check-pr.mjs --author <login> [--base <ref>]');
  process.exit(2);
}

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' });

/** True when `path` exists at `ref`. Throws if git itself fails. */
function existsAt(ref, path) {
  return git('ls-tree', '--name-only', '-z', ref, '--', path)
    .split('\0')
    .some(Boolean);
}

/** File content at a ref, or null when the file genuinely does not exist there. */
function showOrNull(ref, path) {
  if (!existsAt(ref, path)) return null;
  return git('show', `${ref}:${path}`);
}

try {
  const mergeBase = git('merge-base', values.base, 'HEAD').trim();
  const changedFiles = git('diff', '--name-only', '-z', `${mergeBase}..HEAD`)
    .split('\0')
    .map((line) => line.trim())
    .filter(Boolean);

  const taskChanges = changedFiles
    .filter((file) => file.startsWith('tasks/'))
    .flatMap((file) => {
      const id = TASK_ID_PATTERN.exec(file.slice('tasks/'.length))?.[1];
      if (!id) return [];
      return [{ id, before: showOrNull(mergeBase, file), after: showOrNull('HEAD', file) }];
    });

  const { enforced, violations } = checkPullRequest({
    author: values.author,
    changedFiles,
    taskChanges,
  });

  if (!enforced) {
    console.log(`pr-rules: author ${values.author} is human — rules not enforced`);
    process.exit(0);
  }

  if (violations.length === 0) {
    console.log(`pr-rules: ${changedFiles.length} changed file(s), no violations`);
    process.exit(0);
  }

  console.error(`pr-rules: ${violations.length} violation(s) for author ${values.author}`);
  for (const violation of violations) {
    console.error(`  [${violation.rule}] ${violation.message}`);
  }
  process.exit(1);
} catch (error) {
  console.error(`pr-rules: git error: ${error.message}`);
  process.exit(1);
}
