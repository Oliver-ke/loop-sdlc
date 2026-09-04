#!/usr/bin/env node
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseTaskFile, TASK_ID_PATTERN } from '../index.mjs';

/**
 * Read and parse every task file in `dir`.
 * @param {string} dir
 * @returns {import('../../index.d.ts').Task[]}
 */
export function loadTasks(dir) {
  const problems = [];
  const tasks = [];
  const seen = new Map();

  const files = readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .sort();

  for (const file of files) {
    const match = TASK_ID_PATTERN.exec(file);
    if (!match) {
      problems.push(`${file}: filename must match NNNN-kebab-case.md`);
      continue;
    }
    const id = match[1];
    if (seen.has(id)) {
      problems.push(`${file}: duplicate task id ${id} (also ${seen.get(id)})`);
      continue;
    }
    seen.set(id, file);
    try {
      tasks.push(parseTaskFile(readFileSync(join(dir, file), 'utf8'), id));
    } catch (error) {
      problems.push(`${file}: ${error.message}`);
    }
  }

  for (const task of tasks) {
    if (task.doneWhen.length === 0) {
      problems.push(
        `${seen.get(task.id)}: no "## Done when" items — every task needs a checkable done condition`,
      );
    }
    for (const dep of task.dependsOn) {
      if (!seen.has(dep)) {
        problems.push(`${seen.get(task.id)}: depends on unknown task ${dep}`);
      }
    }
  }

  if (problems.length > 0) {
    const error = new Error(`invalid task files:\n  ${problems.join('\n  ')}`);
    error.problems = problems;
    throw error;
  }
  return tasks;
}

function main() {
  const dir = resolve(process.argv[2] ?? 'tasks');
  let tasks;
  try {
    tasks = loadTasks(dir);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
  for (const task of tasks) {
    const deps = task.dependsOn.length > 0 ? task.dependsOn.join(',') : '-';
    console.log(
      `${task.id}  ${task.status.padEnd(11)} ${task.priority.padEnd(6)} deps=${deps.padEnd(9)} ${task.title}`,
    );
  }
  console.log(`${tasks.length} task file(s) OK`);
}

if (import.meta.filename === process.argv[1]) main();
