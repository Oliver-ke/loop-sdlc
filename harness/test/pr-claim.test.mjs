import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { taskIdFrom } from '../src/pr-claim.mjs';

const text = (headRefName, body) => `${headRefName}\n${body}`;

describe('taskIdFrom', () => {
  it('reads the canonical Task: line', () => {
    assert.equal(
      taskIdFrom(text('claude/task-20260904-1310', 'Task: tasks/0002-backlog-board.md\n\nAdds the board.')),
      '0002',
    );
  });

  it('returns null when there is no task mention', () => {
    assert.equal(taskIdFrom(text('claude/task-20260904-1310', '')), null);
  });

  it('reads the canonical line even when the branch name also carries the id', () => {
    assert.equal(
      taskIdFrom(text('claude/task-0002-board', 'Task: tasks/0002-backlog-board.md')),
      '0002',
    );
  });

  it('prefers the canonical line over an earlier loose mention of another task', () => {
    assert.equal(
      taskIdFrom(
        text(
          'claude/task-20260904-1310',
          'Follow-up: task 0005 later.\n\nTask: tasks/0002-backlog-board.md',
        ),
      ),
      '0002',
    );
  });

  it('falls back to a loose "task NNNN" mention when there is no canonical line', () => {
    assert.equal(taskIdFrom(text('claude/task-20260904-1310', 'Implements task 0002.')), '0002');
  });

  it('reads the canonical line alongside an issue reference', () => {
    assert.equal(
      taskIdFrom(text('claude/task-20260904-1310', 'Closes #1234. Task: tasks/0003-task-detail-page.md')),
      '0003',
    );
  });

  it('returns null when branch and body mention nothing task-shaped', () => {
    assert.equal(taskIdFrom(text('claude/misc', 'nothing here')), null);
  });
});
