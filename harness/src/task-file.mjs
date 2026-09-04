export const STATUSES = ['proposed', 'open', 'in-progress', 'done'];
export const PRIORITIES = ['high', 'medium', 'low'];
export const TASK_ID_PATTERN = /^(\d{4})-[a-z0-9-]+\.md$/;

export class TaskFileError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'TaskFileError';
    this.field = field;
  }
}

const FIELD_LINE = /^(Status|Priority|Feature|Depends on):[ \t]*(.*)$/;

/** Drop a trailing `# ...` comment and surrounding whitespace. */
function fieldValue(raw) {
  const hash = raw.indexOf('#');
  return (hash === -1 ? raw : raw.slice(0, hash)).trim();
}

function readFields(lines) {
  const found = new Map();
  for (const line of lines) {
    const match = FIELD_LINE.exec(line);
    if (match && !found.has(match[1])) found.set(match[1], fieldValue(match[2]));
  }
  return found;
}

function require_(fields, name) {
  const value = fields.get(name);
  if (value === undefined || value === '') {
    throw new TaskFileError(`missing required field "${name}"`, name);
  }
  return value;
}

function parseDependsOn(raw, selfId) {
  if (raw.toLowerCase() === 'none') return [];
  const ids = raw
    .split(/[,\s]+/)
    .filter(Boolean)
    .map((entry) => {
      const match = /^(\d{4})(?:-[a-z0-9-]+\.md)?$/.exec(entry);
      if (!match) {
        throw new TaskFileError(
          `dependency "${entry}" is not a task id or task filename`,
          'Depends on',
        );
      }
      return match[1];
    });
  if (ids.includes(selfId)) {
    throw new TaskFileError(`task ${selfId} depends on itself`, 'Depends on');
  }
  return [...new Set(ids)];
}

/** Text between `## <heading>` and the next `## `, trimmed. */
function section(lines, heading) {
  const start = lines.findIndex(
    (line) => line.trim().toLowerCase() === `## ${heading.toLowerCase()}`,
  );
  if (start === -1) return [];
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('## '));
  return end === -1 ? rest : rest.slice(0, end);
}

function parseChecklist(lines) {
  const items = [];
  for (const line of lines) {
    const match = /^- \[([ xX])\][ \t]+(.*\S)[ \t]*$/.exec(line);
    if (match) items.push({ text: match[2], checked: match[1] !== ' ' });
  }
  return items;
}

/**
 * @param {string} text raw markdown of one task file
 * @param {string} id the 4-digit task id (the filename prefix)
 */
export function parseTaskFile(text, id) {
  if (!/^\d{4}$/.test(id)) {
    throw new TaskFileError(`task id "${id}" must be four digits`, 'id');
  }
  const lines = text.split('\n');

  const titleLine = lines.find((line) => line.startsWith('# '));
  if (!titleLine) throw new TaskFileError('missing "# Title" heading', 'title');

  const fields = readFields(lines);

  const status = require_(fields, 'Status');
  if (!STATUSES.includes(status)) {
    throw new TaskFileError(
      `status "${status}" must be one of ${STATUSES.join(', ')}`,
      'Status',
    );
  }

  const priority = require_(fields, 'Priority');
  if (!PRIORITIES.includes(priority)) {
    throw new TaskFileError(
      `priority "${priority}" must be one of ${PRIORITIES.join(', ')}`,
      'Priority',
    );
  }

  return {
    id,
    title: titleLine.slice(2).trim(),
    status,
    priority,
    feature: require_(fields, 'Feature'),
    dependsOn: parseDependsOn(require_(fields, 'Depends on'), id),
    goal: section(lines, 'Goal').join('\n').trim(),
    doneWhen: parseChecklist(section(lines, 'Done when')),
  };
}

/** Rewrite the `Status:` line, preserving alignment padding and any comment. */
export function setStatus(text, status) {
  if (!STATUSES.includes(status)) {
    throw new TaskFileError(
      `status "${status}" must be one of ${STATUSES.join(', ')}`,
      'Status',
    );
  }
  let replaced = false;
  const lines = text.split('\n').map((line) => {
    if (replaced) return line;
    const match = /^Status:([ \t]*)([^#\n]*?)([ \t]*)(#.*)?$/.exec(line);
    if (!match) return line;
    replaced = true;
    const [, lead, oldValue, trail, comment] = match;
    // Keep the comment in the same column by absorbing the length delta.
    const pad = comment
      ? ' '.repeat(Math.max(1, trail.length + oldValue.length - status.length))
      : '';
    return `Status:${lead}${status}${comment ? pad + comment : ''}`;
  });
  if (!replaced) throw new TaskFileError('no "Status:" line to rewrite', 'Status');
  return lines.join('\n');
}
