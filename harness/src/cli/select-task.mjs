#!/usr/bin/env node
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { selectTask, TASK_ID_PATTERN } from '../index.mjs';
import { taskIdFrom } from '../pr-claim.mjs';
import { loadTasks } from './validate-tasks.mjs';

const { values } = parseArgs({
  options: {
    tasks: { type: 'string', default: 'tasks' },
    'open-prs': { type: 'string' },
  },
});

const dir = resolve(values.tasks);

/** Read `gh pr list --json number,body,headRefName` output and extract task ids. */
function readOpenPullRequests(file) {
  if (!file) return [];
  const raw = JSON.parse(readFileSync(file, 'utf8'));
  return raw.map((pr) => ({
    number: pr.number,
    taskId: taskIdFrom(`${pr.headRefName ?? ''}\n${pr.body ?? ''}`),
  }));
}

let tasks;
try {
  tasks = loadTasks(dir);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const { task, reasons } = selectTask(tasks, readOpenPullRequests(values['open-prs']));

for (const [id, reason] of Object.entries(reasons)) {
  console.error(`skip ${id}: ${reason}`);
}

if (!task) {
  console.log('task_id=none');
  process.exit(0);
}

const file = readdirSync(dir).find((name) => TASK_ID_PATTERN.exec(name)?.[1] === task.id);
console.log(`task_id=${task.id}`);
console.log(`task_file=${join(values.tasks, file)}`);
console.log(`task_title=${task.title}`);
