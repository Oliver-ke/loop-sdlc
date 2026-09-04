#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { STATUSES, setStatus } from '../index.mjs';

const [status, ...files] = process.argv.slice(2);

if (!status || files.length === 0 || !STATUSES.includes(status)) {
  console.error(`usage: set-status.mjs <${STATUSES.join('|')}> <file...>`);
  process.exit(2);
}

for (const file of files) {
  writeFileSync(file, setStatus(readFileSync(file, 'utf8'), status));
  console.log(`${file} -> ${status}`);
}
