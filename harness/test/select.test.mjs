import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { selectTask } from '../src/index.mjs';

const task = (id, overrides = {}) => ({
  id,
  title: `task ${id}`,
  status: 'open',
  priority: 'medium',
  feature: 'demo',
  dependsOn: [],
  goal: '',
  doneWhen: [],
  ...overrides,
});

describe('selectTask', () => {
  it('returns null for an empty backlog', () => {
    assert.equal(selectTask([]).task, null);
  });

  it('prefers high priority over medium and low', () => {
    const chosen = selectTask([
      task('0001', { priority: 'low' }),
      task('0002', { priority: 'high' }),
      task('0003', { priority: 'medium' }),
    ]).task;
    assert.equal(chosen.id, '0002');
  });

  it('breaks priority ties by ascending id', () => {
    const chosen = selectTask([
      task('0009', { priority: 'high' }),
      task('0002', { priority: 'high' }),
    ]).task;
    assert.equal(chosen.id, '0002');
  });

  it('skips a task whose dependency is not done', () => {
    const result = selectTask([
      task('0001', { status: 'open' }),
      task('0002', { priority: 'high', dependsOn: ['0001'] }),
    ]);
    assert.equal(result.task.id, '0001');
    assert.match(result.reasons['0002'], /0001 is not done/);
  });

  it('takes a task once every dependency is done', () => {
    const chosen = selectTask([
      task('0001', { status: 'done' }),
      task('0002', { dependsOn: ['0001'] }),
    ]).task;
    assert.equal(chosen.id, '0002');
  });

  it('never selects a done task', () => {
    const result = selectTask([task('0001', { status: 'done' })]);
    assert.equal(result.task, null);
    assert.match(result.reasons['0001'], /already done/);
  });

  it('never selects a proposed task', () => {
    const result = selectTask([task('0001', { status: 'proposed' })]);
    assert.equal(result.task, null);
    assert.match(result.reasons['0001'], /awaiting human approval/);
  });

  it('skips an in-progress task that has an open pull request', () => {
    const result = selectTask([task('0001', { status: 'in-progress' })], [
      { number: 7, taskId: '0001' },
    ]);
    assert.equal(result.task, null);
    assert.match(result.reasons['0001'], /open pull request #7/);
  });

  it('reclaims an in-progress task with no open pull request', () => {
    const chosen = selectTask([task('0001', { status: 'in-progress' })], []).task;
    assert.equal(chosen.id, '0001');
  });

  it('treats a missing dependency as blocking, not as satisfied', () => {
    const result = selectTask([task('0001', { dependsOn: ['9999'] })]);
    assert.equal(result.task, null);
    assert.match(result.reasons['0001'], /unknown task 9999/);
  });

  it('blocks an in-progress task with an unfinished dependency even with no claiming pull request', () => {
    const result = selectTask(
      [
        task('0001', { status: 'open' }),
        task('0002', { status: 'in-progress', dependsOn: ['0001'] }),
      ],
      [],
    );
    assert.equal(result.task.id, '0001');
    assert.match(result.reasons['0002'], /0001 is not done/);
  });
});
