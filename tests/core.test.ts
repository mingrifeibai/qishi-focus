import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  createState,
  reduce,
  newTask,
  parseBackup,
  dayMs,
  localDate,
  stateSchema,
  toCSV,
  type AppState,
} from '../src/core';
import { Storage } from '../electron/storage';
import { nextRepeatDate, parseQuickInput, shiftDay } from '../src/core';

test('v1.0 backups migrate without losing tasks or preferences', () => {
  const s = createState();
  s.tasks.push(newTask('原来的任务'));
  s.settings.focusMinutes = 35;
  const raw = JSON.parse(JSON.stringify(s));
  for (const key of ['style', 'motion', 'ambient', 'ambientVolume', 'companion'])
    delete raw.settings[key];
  delete raw.tasks[0].repeat;
  delete raw.tasks[0].repeatNextId;
  const restored = parseBackup(JSON.stringify(raw));
  assert.equal(restored.tasks[0].title, '原来的任务');
  assert.equal(restored.tasks[0].repeat, 'none');
  assert.equal(restored.settings.focusMinutes, 35);
  assert.equal(restored.settings.style, 'sage');
  assert.equal(restored.settings.ambient, 'off');
});
test('recurrence skips weekends and missed occurrences without duplicates', () => {
  const friday = new Date('2026-10-30T18:00:00').getTime();
  let s = createState();
  const t = newTask('每日阅读', 'learn', '2026-10-20');
  t.repeat = 'weekdays';
  t.subtasks = [{ id: 'step', title: '记录心得', done: true }];
  s.tasks.push(t);
  assert.equal(nextRepeatDate(t, friday), '2026-11-02');
  s = reduce(s, { type: 'task-toggle', id: t.id }, friday);
  assert.equal(s.tasks.length, 2);
  assert.equal(s.tasks[1].dueDate, '2026-11-02');
  assert.equal(s.tasks[1].subtasks[0].done, false);
  assert.notEqual(s.tasks[1].subtasks[0].id, 'step');
  s = reduce(s, { type: 'task-toggle', id: t.id }, friday);
  s = reduce(s, { type: 'task-toggle', id: t.id }, friday);
  assert.equal(s.tasks.length, 2);
  stateSchema.parse(s);
});
test('weekly and daily recurrence preserve local dates over a year boundary', () => {
  const at = new Date('2026-12-31T23:00:00').getTime();
  const t = newTask('计划');
  t.repeat = 'daily';
  t.dueDate = '2026-12-31';
  assert.equal(nextRepeatDate(t, at), '2027-01-01');
  t.repeat = 'weekly';
  assert.equal(nextRepeatDate(t, at), '2027-01-07');
});
test('quick input recognizes separated date category and priority tokens', () => {
  const now = new Date('2026-10-29T20:00:00').getTime();
  const p = parseQuickInput('明天 阅读 20 页 #学习 !重要', createState().projects, now);
  assert.deepEqual(p, {
    title: '阅读 20 页',
    dueDate: '2026-10-30',
    projectId: 'learn',
    priority: 'high',
  });
  assert.equal(parseQuickInput('为明天做准备 #未知', [], now).title, '为明天做准备 #未知');
  assert.equal(parseQuickInput('收集箱 一个想法', [], now).dueDate, null);
  assert.equal(parseQuickInput('明天 #学习 !重要', createState().projects, now).title, '');
});
test('batch scheduling and completion are atomic and do not duplicate recurrence', () => {
  let s = createState();
  const a = newTask('a'),
    b = newTask('b');
  a.repeat = 'daily';
  s.tasks = [a, b];
  s = reduce(s, {
    type: 'task-batch',
    ids: [a.id, b.id],
    operation: 'schedule',
    dueDate: shiftDay(1),
  });
  assert.equal(s.tasks[0].dueDate, shiftDay(1));
  assert.equal(s.tasks[1].dueDate, shiftDay(1));
  s = reduce(s, { type: 'task-batch', ids: [a.id, b.id, a.id], operation: 'complete' });
  assert.equal(s.tasks.length, 3);
  assert.equal(s.tasks.filter((x) => x.completed).length, 2);
  s = reduce(s, { type: 'task-batch', ids: [a.id, b.id], operation: 'complete' });
  assert.equal(s.tasks.length, 3);
  assert.throws(() =>
    reduce(s, { type: 'task-batch', ids: [a.id], operation: 'schedule', dueDate: '2026-02-30' }),
  );
});
test('changing theme or ambience preserves a custom timer preset and running elapsed time', () => {
  let s = reduce(createState(), { type: 'duration', minutes: 15 }, base);
  s = reduce(
    s,
    { type: 'settings', settings: { ...s.settings, style: 'cyber', ambient: 'rain' } },
    base,
  );
  assert.equal(s.timer.durationMs, 900000);
  s = reduce(s, { type: 'start' }, base);
  s = reduce(s, { type: 'settings', settings: { ...s.settings, style: 'pixel' } }, base + 2000);
  assert.equal(s.timer.elapsedMs, 2000);
  assert.equal(s.timer.durationMs, 900000);
  assert.throws(() => reduce(s, { type: 'duration', minutes: 30 }, base + 2000));
});
test('reflection survives backup and is safely included in CSV', () => {
  let s = reduce(createState(), { type: 'start' }, base);
  s = reduce(s, { type: 'finish' }, base + 2000);
  s = reduce(
    s,
    { type: 'session-note', id: s.sessions[0].id, note: '下一步：整理笔记' },
    base + 2000,
  );
  const restored = parseBackup(JSON.stringify(s));
  assert.equal(restored.sessions[0].note, '下一步：整理笔记');
  assert.ok(toCSV(s).includes('下一步：整理笔记'));
  assert.throws(() => reduce(s, { type: 'session-note', id: 'missing', note: 'test' }));
});

const base = new Date('2026-10-29T10:00:00').getTime();
function tickFor(s: AppState, start: number, milliseconds: number) {
  for (let n = 1000; n <= milliseconds; n += 1000) s = reduce(s, { type: 'tick' }, start + n);
  return s;
}
test('countdown finishes exactly once and does not complete the task automatically', () => {
  let s = createState();
  const task = newTask('写作');
  s = reduce(s, { type: 'task-save', task }, base);
  s = reduce(s, { type: 'settings', settings: { ...s.settings, focusMinutes: 1 } }, base);
  s = reduce(s, { type: 'select-task', id: task.id }, base);
  s = reduce(s, { type: 'start' }, base);
  s = tickFor(s, base, 65000);
  assert.equal(s.sessions.length, 1);
  assert.equal(s.sessions[0].durationMs, 60000);
  assert.equal(s.sessions[0].endedAt, base + 60000);
  assert.equal(s.timer.status, 'idle');
  assert.equal(s.tasks[0].completed, false);
  assert.equal(s.summary?.completed, true);
  stateSchema.parse(s);
});
test('pause excludes paused time, resume starts a fresh segment', () => {
  let s = reduce(createState(), { type: 'start' }, base);
  s = reduce(s, { type: 'pause' }, base + 4000);
  s = reduce(s, { type: 'tick' }, base + 600000);
  assert.equal(s.timer.elapsedMs, 4000);
  s = reduce(s, { type: 'start' }, base + 600000);
  s = reduce(s, { type: 'finish' }, base + 604000);
  assert.equal(s.sessions[0].durationMs, 8000);
  assert.equal(s.sessions[0].segments.length, 2);
  stateSchema.parse(s);
});
test('suspend gap and a clock adjustment pause without inflating totals', () => {
  let s = reduce(createState(), { type: 'start' }, base);
  s = reduce(s, { type: 'tick' }, base + 2000);
  const future = reduce(s, { type: 'tick' }, base + 3600000);
  assert.equal(future.timer.status, 'paused');
  assert.equal(future.timer.elapsedMs, 2000);
  const past = reduce(s, { type: 'tick' }, base - 1000);
  assert.equal(past.timer.status, 'paused');
  assert.equal(past.timer.elapsedMs, 2000);
});
test('backup recovery never counts offline time', () => {
  let s = reduce(createState(), { type: 'start' }, base);
  s = reduce(s, { type: 'tick' }, base + 3000);
  const recovered = parseBackup(JSON.stringify(s));
  assert.equal(recovered.timer.status, 'paused');
  assert.equal(recovered.timer.elapsedMs, 3000);
  assert.equal(recovered.timer.lastTickAt, null);
});
test('cross-midnight statistics split actual segments, excluding pauses', () => {
  const at = new Date('2026-10-29T23:59:55').getTime();
  let s = reduce(createState(), { type: 'start' }, at);
  s = tickFor(s, at, 10000);
  s = reduce(s, { type: 'finish' }, at + 10000);
  assert.equal(dayMs(s.sessions, '2026-10-29'), 5000);
  assert.equal(dayMs(s.sessions, '2026-10-30'), 5000);
});
test('break time never enters focus statistics; long rest follows completed rounds', () => {
  let s = createState();
  s.completedRounds = 4;
  s = reduce(s, { type: 'break' }, base);
  assert.equal(s.timer.durationMs, 15 * 60000);
  s = tickFor(s, base, 15 * 60000);
  assert.equal(s.sessions.length, 0);
  assert.equal(s.summary?.phase, 'break');
  assert.equal(s.timer.phase, 'focus');
});
test('stopwatch tracks elapsed time and ends as a partial session', () => {
  let s = reduce(createState(), { type: 'mode', mode: 'stopwatch' }, base);
  s = reduce(s, { type: 'start' }, base);
  s = tickFor(s, base, 100000);
  s = reduce(s, { type: 'finish' }, base + 100000);
  assert.equal(s.sessions[0].durationMs, 100000);
  assert.equal(s.sessions[0].outcome, 'ended');
});
test('discard and sub-second sessions do not create misleading records', () => {
  let s = reduce(createState(), { type: 'start' }, base);
  s = reduce(s, { type: 'discard' }, base + 4000);
  assert.equal(s.sessions.length, 0);
  s = reduce(s, { type: 'start' }, base + 5000);
  s = reduce(s, { type: 'finish' }, base + 5500);
  assert.equal(s.sessions.length, 0);
});
test('active task and duration cannot be switched mid-round; settings apply next round', () => {
  let s = createState();
  const task = newTask('阅读');
  s = reduce(s, { type: 'task-save', task }, base);
  s = reduce(s, { type: 'select-task', id: task.id }, base);
  s = reduce(s, { type: 'start' }, base);
  assert.throws(() => reduce(s, { type: 'mode', mode: 'deep' }, base));
  assert.throws(() => reduce(s, { type: 'select-task', id: null }, base));
  assert.throws(() => reduce(s, { type: 'task-delete', id: task.id }, base));
  s = reduce(s, { type: 'settings', settings: { ...s.settings, focusMinutes: 45 } }, base);
  assert.equal(s.timer.durationMs, 25 * 60000);
  s = reduce(s, { type: 'discard' }, base);
  assert.equal(s.timer.durationMs, 45 * 60000);
});
test('deleting a task preserves historical focus; deleting a project removes references', () => {
  let s = createState();
  const task = newTask('草稿', 'work');
  s = reduce(s, { type: 'task-save', task }, base);
  s = reduce(s, { type: 'select-task', id: task.id }, base);
  s = reduce(s, { type: 'start' }, base);
  s = reduce(s, { type: 'finish' }, base + 4000);
  s = reduce(s, { type: 'task-delete', id: task.id }, base + 4000);
  assert.equal(s.sessions.length, 1);
  assert.equal(s.timer.taskId, null);
  s = reduce(s, { type: 'project-delete', id: 'work' }, base + 4000);
  assert.equal(s.sessions[0].projectId, null);
  stateSchema.parse(s);
});
test('invalid backups, duplicate IDs, invalid dates and inconsistent segments are rejected', () => {
  assert.throws(() => parseBackup('{bad}'));
  const s = createState();
  s.version = 2 as 1;
  assert.throws(() => parseBackup(JSON.stringify(s)));
  const a = createState();
  a.tasks = [newTask('a')];
  a.tasks.push(a.tasks[0]);
  assert.throws(() => parseBackup(JSON.stringify(a)));
  const b = createState();
  b.tasks = [newTask('b')];
  b.tasks[0].dueDate = '2026-02-30';
  assert.throws(() => parseBackup(JSON.stringify(b)));
  const c = createState();
  c.timer.elapsedMs = 5000;
  assert.throws(() => parseBackup(JSON.stringify(c)));
});
test('CSV escapes formulas, commas, quotes, and non-ASCII task names', () => {
  let s = createState();
  const task = newTask('=SUM(1,2) "中文"');
  s = reduce(s, { type: 'task-save', task }, base);
  s = reduce(s, { type: 'select-task', id: task.id }, base);
  s = reduce(s, { type: 'start' }, base);
  s = reduce(s, { type: 'finish' }, base + 4000);
  const csv = toCSV(s);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"\'=SUM(1,2) ""中文"""'));
});
test('atomic storage recovers previous valid version and preserves corrupt file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qishi-storage-test-'));
  try {
    const storage = new Storage(dir);
    const s = createState();
    storage.save(s);
    s.tasks.push(newTask('新的任务'));
    storage.save(s);
    assert.equal(storage.load().tasks.length, 1);
    fs.writeFileSync(storage.file, 'corrupt');
    const restored = new Storage(dir);
    assert.equal(restored.load().tasks.length, 0);
    assert.ok(restored.notice.includes('自动备份'));
    assert.ok(fs.readdirSync(dir).some((f) => f.includes('.damaged-')));
  } finally {
    assert.ok(
      path.resolve(dir).startsWith(path.resolve(os.tmpdir()) + path.sep + 'qishi-storage-test-'),
    );
    fs.rmSync(dir, { recursive: true });
  }
});
test('duplicate task names are allowed, duplicate project names are rejected', () => {
  let s = createState();
  s = reduce(s, { type: 'task-save', task: newTask('相同名称') });
  s = reduce(s, { type: 'task-save', task: newTask('相同名称') });
  assert.equal(s.tasks.length, 2);
  assert.throws(() =>
    reduce(s, { type: 'project-save', project: { id: 'other', name: '工作', color: 'sage' } }),
  );
});
test('completed task selection is rejected; resuming completed active task becomes free focus', () => {
  let s = createState();
  const task = newTask('收尾');
  s = reduce(s, { type: 'task-save', task });
  s = reduce(s, { type: 'select-task', id: task.id });
  s = reduce(s, { type: 'task-toggle', id: task.id });
  assert.throws(() => reduce(s, { type: 'select-task', id: task.id }));
  s = reduce(s, { type: 'start' }, base);
  assert.equal(s.timer.taskId, null);
});

test('failed atomic replacement leaves the last saved data intact', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qishi-storage-test-'));
  const storage = new Storage(dir);
  try {
    const state = createState();
    storage.save(state);
    state.tasks.push(newTask('只在内存中的更改'));
    const mocked = mock.method(fs, 'renameSync', () => {
      throw new Error('模拟磁盘写入失败');
    });
    try {
      assert.throws(() => storage.save(state));
    } finally {
      mocked.mock.restore();
    }
    assert.equal(parseBackup(fs.readFileSync(storage.file, 'utf8')).tasks.length, 0);
    storage.save(state);
    assert.equal(storage.load().tasks.length, 1);
  } finally {
    assert.ok(
      path.resolve(dir).startsWith(path.resolve(os.tmpdir()) + path.sep + 'qishi-storage-test-'),
    );
    fs.rmSync(dir, { recursive: true });
  }
});
