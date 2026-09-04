import { PRIORITIES } from './task-file.mjs';

/**
 * Pick the one task this run should do.
 * @param {import('../index.d.ts').Task[]} tasks
 * @param {import('../index.d.ts').OpenPullRequest[]} [openPullRequests]
 * @returns {import('../index.d.ts').SelectionResult}
 */
export function selectTask(tasks, openPullRequests = []) {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const reasons = {};
  const eligible = [];

  for (const task of tasks) {
    const reason = ineligibleBecause(task, byId, openPullRequests);
    if (reason) reasons[task.id] = reason;
    else eligible.push(task);
  }

  eligible.sort(
    (a, b) =>
      PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority) ||
      a.id.localeCompare(b.id),
  );

  return { task: eligible[0] ?? null, reasons };
}

function ineligibleBecause(task, byId, openPullRequests) {
  if (task.status === 'done') return 'already done';
  if (task.status === 'proposed') {
    return 'awaiting human approval (status: proposed)';
  }
  if (task.status === 'in-progress') {
    const claim = openPullRequests.find((pr) => pr.taskId === task.id);
    if (claim) return `claimed by open pull request #${claim.number}`;
  }
  for (const dep of task.dependsOn) {
    const dependency = byId.get(dep);
    if (!dependency) return `depends on unknown task ${dep}`;
    if (dependency.status !== 'done') return `dependency ${dep} is not done`;
  }
  return null;
}
