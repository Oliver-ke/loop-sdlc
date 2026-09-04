import { parseTaskFile } from './task-file.mjs';
import { isProtectedPath } from './protected.mjs';

const DEFAULT_BOT_AUTHORS = ['claude[bot]', 'github-actions[bot]'];

/**
 * @param {import('../index.d.ts').PullRequestCheckInput} input
 * @returns {{ enforced: boolean, violations: import('../index.d.ts').Violation[] }}
 */
export function checkPullRequest(input) {
  const bots = input.botAuthors ?? DEFAULT_BOT_AUTHORS;
  if (!bots.includes(input.author)) {
    return { enforced: false, violations: [] };
  }

  const violations = [];
  const add = (rule, message) => violations.push({ rule, message });

  for (const file of input.changedFiles) {
    if (isProtectedPath(file)) {
      add('protected-path', `${file} is a protected path and may not be changed by ${input.author}`);
    }
  }

  const parsed = [];
  for (const change of input.taskChanges) {
    const before = safeParse(change.before, change.id);
    const after = safeParse(change.after, change.id);
    if (change.after !== null && after === null) {
      add('task-status', `tasks/${change.id}: the new version could not be parsed as a task file`);
      continue;
    }
    parsed.push({ id: change.id, before, after });
  }

  for (const { id, before, after } of parsed) {
    if (before?.status === 'proposed' && after && after.status !== 'proposed') {
      add(
        'unapproved-task',
        `tasks/${id}: only a human may move a task off "proposed" (tried to set "${after.status}")`,
      );
    }
    if (before === null && after && after.status !== 'proposed') {
      add(
        'task-status',
        `tasks/${id}: new task ${id} must be created with status "proposed", got "${after.status}"`,
      );
    }
  }

  const markedDone = parsed.filter(
    ({ before, after }) => after?.status === 'done' && before?.status !== 'done',
  );

  if (parsed.length === 0) {
    add('task-status', 'this pull request changes no task file — every run must record what it did');
  } else if (markedDone.length > 1) {
    add(
      'task-status',
      `marks more than one task done (${markedDone.map((t) => t.id).join(', ')}) — one task per run`,
    );
  }

  for (const { id, after } of markedDone) {
    if (after.doneWhen.length === 0) {
      add(
        'task-status',
        `tasks/${id}: marked done with an empty "Done when" list — the done gate must not be vacuous`,
      );
      continue;
    }
    const unchecked = after.doneWhen.filter((item) => !item.checked);
    if (unchecked.length > 0) {
      add(
        'task-status',
        `tasks/${id}: marked done with ${unchecked.length} unchecked "Done when" item(s): ${unchecked
          .map((item) => item.text)
          .join('; ')}`,
      );
    }
  }

  for (const { id, before, after } of markedDone) {
    if (!before) continue;
    const texts = (task) => task.doneWhen.map((item) => item.text);
    const wasText = texts(before);
    const nowText = texts(after);
    if (wasText.length !== nowText.length || wasText.some((text, i) => text !== nowText[i])) {
      add(
        'task-status',
        `tasks/${id}: the "Done when" items were rewritten in the same pull request that marks the task done — only the checkboxes may change`,
      );
    }
  }

  return { enforced: true, violations };
}

function safeParse(text, id) {
  if (text === null || text === undefined) return null;
  try {
    return parseTaskFile(text, id);
  } catch {
    return null;
  }
}
