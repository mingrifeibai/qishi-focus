import { z } from 'zod';

const id = z.string().min(1).max(100);
const stamp = z.number().finite().nonnegative();
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v + 'T12:00:00');
    return !isNaN(d.getTime()) && localDate(d) === v;
  });
export const projectSchema = z.object({
  id,
  name: z.string().trim().min(1).max(30),
  color: z.enum(['sage', 'clay', 'blue', 'gold', 'purple']),
});
export const taskSchema = z.object({
  id,
  title: z.string().trim().min(1).max(160),
  projectId: id.nullable(),
  dueDate: date.nullable(),
  priority: z.enum(['normal', 'high', 'low']),
  estimatedRounds: z.number().int().min(1).max(99),
  notes: z.string().max(5000),
  completed: z.boolean(),
  completedAt: stamp.nullable(),
  createdAt: stamp,
  repeat: z.enum(['none', 'daily', 'weekdays', 'weekly']).default('none'),
  repeatNextId: id.nullable().default(null),
  subtasks: z
    .array(z.object({ id, title: z.string().trim().min(1).max(160), done: z.boolean() }))
    .max(100),
});
export const settingsSchema = z.object({
  focusMinutes: z.number().int().min(1).max(180),
  longMinutes: z.number().int().min(1).max(180),
  breakMinutes: z.number().int().min(1).max(60),
  longBreakMinutes: z.number().int().min(1).max(60),
  longBreakEvery: z.number().int().min(2).max(12),
  dailyGoalMinutes: z.number().int().min(15).max(720),
  theme: z.enum(['light', 'dark', 'system']),
  sound: z.boolean(),
  notifications: z.boolean(),
  closeToTray: z.boolean(),
  alwaysOnTopMini: z.boolean(),
  style: z.enum(['sage', 'cyber', 'blocks', 'ink', 'pixel']).default('sage'),
  motion: z.boolean().default(true),
  ambient: z.enum(['off', 'rain', 'white', 'brown']).default('off'),
  ambientVolume: z.number().int().min(0).max(100).default(30),
  companion: z.boolean().default(true),
});
const segmentSchema = z.object({ start: stamp, end: stamp }).refine((s) => s.end >= s.start);
const sessionSchema = z
  .object({
    id,
    taskId: id.nullable(),
    title: z.string().min(1).max(160),
    projectId: id.nullable(),
    startedAt: stamp,
    endedAt: stamp,
    durationMs: z.number().finite().min(0).max(86400000),
    outcome: z.enum(['completed', 'ended']),
    note: z.string().max(500).optional(),
    segments: z.array(segmentSchema).max(10000),
  })
  .refine(
    (s) =>
      s.endedAt >= s.startedAt &&
      Math.abs(s.segments.reduce((n, x) => n + x.end - x.start, 0) - s.durationMs) < 2,
  );
const timerSchema = z.object({
  status: z.enum(['idle', 'running', 'paused']),
  phase: z.enum(['focus', 'break']),
  mode: z.enum(['pomodoro', 'deep', 'stopwatch']),
  durationMs: z.number().finite().min(60000).max(86400000),
  elapsedMs: z.number().finite().nonnegative().max(86400000),
  lastTickAt: stamp.nullable(),
  startedAt: stamp.nullable(),
  taskId: id.nullable(),
  title: z.string().max(160),
  projectId: id.nullable(),
  segments: z.array(segmentSchema).max(10000),
});
export const stateSchema = z
  .object({
    version: z.literal(1),
    tasks: z.array(taskSchema).max(20000),
    projects: z.array(projectSchema).max(100),
    sessions: z.array(sessionSchema).max(100000),
    settings: settingsSchema,
    timer: timerSchema,
    completedRounds: z.number().int().nonnegative(),
    summary: z
      .object({
        phase: z.enum(['focus', 'break']),
        sessionId: id.nullable(),
        title: z.string(),
        durationMs: stamp,
        completed: z.boolean(),
      })
      .nullable(),
  })
  .superRefine((s, ctx) => {
    for (const items of [s.tasks, s.projects, s.sessions]) {
      if (new Set(items.map((x) => x.id)).size !== items.length)
        ctx.addIssue({ code: 'custom', message: '存在重复记录' });
    }
    if (
      s.timer.status !== 'idle' &&
      (s.timer.startedAt === null || (s.timer.status === 'running' && s.timer.lastTickAt === null))
    )
      ctx.addIssue({ code: 'custom', message: '计时状态无效' });
    if (Math.abs(s.timer.segments.reduce((n, x) => n + x.end - x.start, 0) - s.timer.elapsedMs) > 2)
      ctx.addIssue({ code: 'custom', message: '计时记录不一致' });
  });

export type AppState = z.infer<typeof stateSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type Timer = AppState['timer'];
export type Session = AppState['sessions'][number];
export type Action =
  | { type: 'task-save'; task: Task }
  | { type: 'task-delete'; id: string }
  | { type: 'task-toggle'; id: string }
  | {
      type: 'task-batch';
      ids: string[];
      operation: 'complete' | 'schedule';
      dueDate?: string | null;
    }
  | { type: 'duration'; minutes: number }
  | { type: 'session-note'; id: string; note: string }
  | { type: 'project-save'; project: Project }
  | { type: 'project-delete'; id: string }
  | { type: 'settings'; settings: Settings }
  | { type: 'select-task'; id: string | null }
  | { type: 'mode'; mode: Timer['mode'] }
  | {
      type:
        'start' | 'pause' | 'tick' | 'finish' | 'discard' | 'break' | 'dismiss-summary' | 'recover';
    }
  | { type: 'session-delete'; id: string };

export const uid = () => globalThis.crypto.randomUUID();
export function localDate(value: Date | number = Date.now()): string {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function createState(): AppState {
  return {
    version: 1,
    tasks: [],
    sessions: [],
    projects: [
      { id: 'work', name: '工作', color: 'sage' },
      { id: 'learn', name: '学习', color: 'blue' },
      { id: 'life', name: '生活', color: 'clay' },
    ],
    settings: {
      focusMinutes: 25,
      longMinutes: 50,
      breakMinutes: 5,
      longBreakMinutes: 15,
      longBreakEvery: 4,
      dailyGoalMinutes: 120,
      theme: 'light',
      sound: true,
      notifications: true,
      closeToTray: true,
      alwaysOnTopMini: true,
      style: 'sage',
      motion: true,
      ambient: 'off',
      ambientVolume: 30,
      companion: true,
    },
    timer: {
      status: 'idle',
      phase: 'focus',
      mode: 'pomodoro',
      durationMs: 25 * 60000,
      elapsedMs: 0,
      lastTickAt: null,
      startedAt: null,
      taskId: null,
      title: '自由专注',
      projectId: null,
      segments: [],
    },
    completedRounds: 0,
    summary: null,
  };
}
export function newTask(
  title: string,
  projectId: string | null = null,
  dueDate: string | null = localDate(),
): Task {
  return {
    id: uid(),
    title,
    projectId,
    dueDate,
    priority: 'normal',
    estimatedRounds: 1,
    notes: '',
    completed: false,
    completedAt: null,
    createdAt: Date.now(),
    subtasks: [],
    repeat: 'none',
    repeatNextId: null,
  };
}
function focusDuration(s: AppState) {
  return (
    (s.timer.mode === 'deep'
      ? s.settings.longMinutes
      : s.timer.mode === 'stopwatch'
        ? 1440
        : s.settings.focusMinutes) * 60000
  );
}
export function nextRepeatDate(task: Task, now = Date.now()): string {
  const from = task.dueDate && task.dueDate > localDate(now) ? task.dueDate : localDate(now);
  const d = new Date(from + 'T12:00:00');
  d.setDate(d.getDate() + (task.repeat === 'weekly' ? 7 : 1));
  if (task.repeat === 'weekdays')
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return localDate(d);
}
function completeTask(s: AppState, t: Task, now: number) {
  t.completed = true;
  t.completedAt = now;
  if (t.repeat !== 'none' && !t.repeatNextId) {
    if (s.tasks.length >= 20000) throw new Error('任务数量已达上限，请先整理任务');
    const next: Task = {
      ...t,
      id: uid(),
      completed: false,
      completedAt: null,
      createdAt: now,
      dueDate: nextRepeatDate(t, now),
      repeatNextId: null,
      subtasks: t.subtasks.map((x) => ({ ...x, id: uid(), done: false })),
    };
    t.repeatNextId = next.id;
    s.tasks.push(next);
  }
}
export function shiftDay(days: number, now: number | Date = Date.now()): string {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  return localDate(d);
}
export function parseQuickInput(
  input: string,
  projects: Project[],
  now = Date.now(),
): { title: string; dueDate: string | null; projectId: string | null; priority: Task['priority'] } {
  let title = input.trim();
  let dueDate: string | null = localDate(now);
  let projectId: string | null = null;
  let priority: Task['priority'] = 'normal';
  title = title.replace(/(^|\s)(今天|明天|后天|收集箱)(?=\s|$)/g, (_all, space, tag) => {
    dueDate = tag === '收集箱' ? null : shiftDay(tag === '明天' ? 1 : tag === '后天' ? 2 : 0, now);
    return space;
  });
  title = title.replace(/(^|\s)#([^\s#]+)/g, (all, space, tag) => {
    const p = projects.find((x) => x.name === tag);
    if (!p) return all;
    projectId = p.id;
    return space;
  });
  title = title.replace(/(^|\s)[!！]重要(?=\s|$)/g, (_all, space) => {
    priority = 'high';
    return space;
  });
  return { title: title.replace(/\s+/g, ' ').trim(), dueDate, projectId, priority };
}
function resetTimer(s: AppState) {
  Object.assign(s.timer, {
    status: 'idle',
    phase: 'focus',
    durationMs: focusDuration(s),
    elapsedMs: 0,
    lastTickAt: null,
    startedAt: null,
    segments: [],
  });
}
function finish(s: AppState, now: number, completed: boolean) {
  const t = s.timer;
  let sessionId: string | null = null;
  if (t.phase === 'focus' && t.elapsedMs >= 1000) {
    sessionId = uid();
    s.sessions.push({
      id: sessionId,
      taskId: t.taskId,
      title: t.title || '自由专注',
      projectId: t.projectId,
      startedAt: t.startedAt ?? now,
      endedAt: now,
      durationMs: t.elapsedMs,
      segments: [...t.segments],
      outcome: completed ? 'completed' : 'ended',
    });
    if (completed) s.completedRounds++;
  }
  s.summary = { phase: t.phase, sessionId, title: t.title, durationMs: t.elapsedMs, completed };
  resetTimer(s);
}
function advance(s: AppState, now: number) {
  const t = s.timer;
  if (t.status !== 'running' || t.lastTickAt === null) return;
  const diff = now - t.lastTickAt;
  // A suspended machine or adjusted clock must never inflate focused time.
  if (diff < 0 || diff > 10000) {
    t.status = 'paused';
    t.lastTickAt = null;
    return;
  }
  const add = Math.min(diff, t.durationMs - t.elapsedMs);
  const end = t.lastTickAt + add;
  if (add > 0) {
    const last = t.segments.at(-1);
    if (last && last.end === t.lastTickAt) last.end = end;
    else t.segments.push({ start: t.lastTickAt, end });
    t.elapsedMs += add;
  }
  t.lastTickAt = now;
  if (t.elapsedMs >= t.durationMs) finish(s, end, true);
}
export function reduce(state: AppState, action: Action, now = Date.now()): AppState {
  const s = structuredClone(state);
  if (action.type !== 'recover') advance(s, now);
  switch (action.type) {
    case 'tick':
      break;
    case 'recover':
      if (s.timer.status === 'running') {
        s.timer.status = 'paused';
        s.timer.lastTickAt = null;
      }
      break;
    case 'task-save': {
      const task = taskSchema.parse(action.task);
      if (task.projectId && !s.projects.some((p) => p.id === task.projectId))
        throw new Error('分类不存在，请重新选择');
      const i = s.tasks.findIndex((x) => x.id === task.id);
      if (i < 0) {
        if (s.tasks.length >= 20000) throw new Error('任务数量已达上限，请先整理任务');
        s.tasks.push(task);
      } else s.tasks[i] = task;
      if (s.timer.taskId === task.id && s.timer.status === 'idle')
        Object.assign(s.timer, { title: task.title, projectId: task.projectId });
      break;
    }
    case 'task-delete':
      if (s.timer.taskId === action.id && s.timer.status !== 'idle')
        throw new Error('请先结束这个任务的专注，再删除任务');
      s.tasks = s.tasks.filter((x) => x.id !== action.id);
      if (s.timer.taskId === action.id)
        Object.assign(s.timer, { taskId: null, title: '自由专注', projectId: null });
      break;
    case 'task-toggle': {
      const t = s.tasks.find((x) => x.id === action.id);
      if (t) {
        if (t.completed) {
          t.completed = false;
          t.completedAt = null;
        } else completeTask(s, t, now);
      }
      break;
    }
    case 'task-batch': {
      const ids = new Set(z.array(id).max(500).parse(action.ids));
      const operation = z.enum(['complete', 'schedule']).parse(action.operation);
      const dueDate = operation === 'schedule' ? date.nullable().parse(action.dueDate) : null;
      const targets = s.tasks.filter((t) => ids.has(t.id));
      for (const t of targets) {
        if (operation === 'complete' && !t.completed) completeTask(s, t, now);
        else if (operation === 'schedule') t.dueDate = dueDate;
      }
      break;
    }
    case 'duration':
      if (s.timer.status !== 'idle') throw new Error('请先结束本轮，再调整时长');
      if (s.timer.mode === 'stopwatch') throw new Error('正向计时无需设置时长');
      s.timer.durationMs = z.number().int().min(1).max(180).parse(action.minutes) * 60000;
      break;
    case 'session-note': {
      const record = s.sessions.find((x) => x.id === action.id);
      if (!record) throw new Error('这条专注记录不存在');
      record.note = z.string().trim().max(500).parse(action.note);
      break;
    }
    case 'project-save': {
      const p = projectSchema.parse(action.project);
      if (s.projects.some((x) => x.name === p.name && x.id !== p.id))
        throw new Error('这个分类已经存在');
      const i = s.projects.findIndex((x) => x.id === p.id);
      if (i < 0) {
        if (s.projects.length >= 100) throw new Error('分类数量已达上限');
        s.projects.push(p);
      } else s.projects[i] = p;
      break;
    }
    case 'project-delete':
      s.projects = s.projects.filter((x) => x.id !== action.id);
      s.tasks.forEach((t) => {
        if (t.projectId === action.id) t.projectId = null;
      });
      s.sessions.forEach((t) => {
        if (t.projectId === action.id) t.projectId = null;
      });
      if (s.timer.projectId === action.id) s.timer.projectId = null;
      break;
    case 'settings': {
      const previous = s.settings;
      s.settings = settingsSchema.parse(action.settings);
      if (
        s.timer.status === 'idle' &&
        (previous.focusMinutes !== s.settings.focusMinutes ||
          previous.longMinutes !== s.settings.longMinutes)
      )
        s.timer.durationMs = focusDuration(s);
      break;
    }
    case 'select-task': {
      if (s.timer.status !== 'idle') throw new Error('本轮专注结束后，就可以切换任务');
      const task = s.tasks.find((x) => x.id === action.id);
      if (action.id && !task) throw new Error('任务不存在');
      if (task?.completed) throw new Error('请先将任务恢复为未完成');
      Object.assign(s.timer, {
        taskId: task?.id ?? null,
        title: task?.title ?? '自由专注',
        projectId: task?.projectId ?? null,
      });
      break;
    }
    case 'mode':
      if (s.timer.status !== 'idle') throw new Error('请先结束当前专注，再切换模式');
      s.timer.mode = z.enum(['pomodoro', 'deep', 'stopwatch']).parse(action.mode);
      s.timer.durationMs = focusDuration(s);
      break;
    case 'start':
      if (s.timer.status === 'running') break;
      if (s.timer.status === 'idle') {
        s.timer.startedAt = now;
        s.timer.elapsedMs = 0;
        s.timer.segments = [];
        if (s.timer.taskId && s.tasks.find((x) => x.id === s.timer.taskId)?.completed)
          Object.assign(s.timer, { taskId: null, title: '自由专注', projectId: null });
      }
      s.summary = null;
      s.timer.status = 'running';
      s.timer.lastTickAt = now;
      break;
    case 'pause':
      if (s.timer.status === 'running') {
        s.timer.status = 'paused';
        s.timer.lastTickAt = null;
      }
      break;
    case 'finish':
      if (s.timer.status !== 'idle') finish(s, now, false);
      break;
    case 'discard':
      resetTimer(s);
      s.summary = null;
      break;
    case 'break':
      if (s.timer.status !== 'idle') throw new Error('先结束当前计时，再开始休息');
      resetTimer(s);
      s.timer.phase = 'break';
      s.timer.durationMs =
        (s.completedRounds > 0 && s.completedRounds % s.settings.longBreakEvery === 0
          ? s.settings.longBreakMinutes
          : s.settings.breakMinutes) * 60000;
      s.timer.status = 'running';
      s.timer.startedAt = now;
      s.timer.lastTickAt = now;
      s.summary = null;
      break;
    case 'dismiss-summary':
      s.summary = null;
      break;
    case 'session-delete':
      s.sessions = s.sessions.filter((x) => x.id !== action.id);
      break;
    default:
      throw new Error('不支持的操作');
  }
  return s;
}
export function parseBackup(raw: string): AppState {
  if (raw.length > 20 * 1024 * 1024) throw new Error('备份文件过大（上限 20 MB）');
  const parsed = JSON.parse(raw);
  const s = stateSchema.parse(parsed);
  const projects = new Set(s.projects.map((p) => p.id));
  s.tasks.forEach((t) => {
    if (t.projectId && !projects.has(t.projectId)) t.projectId = null;
  });
  s.sessions.forEach((t) => {
    if (t.projectId && !projects.has(t.projectId)) t.projectId = null;
  });
  if (s.timer.taskId && !s.tasks.some((t) => t.id === s.timer.taskId))
    Object.assign(s.timer, { taskId: null, title: '自由专注', projectId: null });
  if (s.timer.projectId && !projects.has(s.timer.projectId)) s.timer.projectId = null;
  return reduce(s, { type: 'recover' });
}
export function dayBounds(day: string): [number, number] {
  const d = new Date(day + 'T00:00:00');
  const e = new Date(d);
  e.setDate(e.getDate() + 1);
  return [d.getTime(), e.getTime()];
}
export function sessionMsBetween(s: Session, start: number, end: number): number {
  return s.segments.reduce(
    (n, seg) => n + Math.max(0, Math.min(end, seg.end) - Math.max(start, seg.start)),
    0,
  );
}
export function dayMs(sessions: Session[], day: string): number {
  const [a, b] = dayBounds(day);
  return sessions.reduce((n, s) => n + sessionMsBetween(s, a, b), 0);
}
export function formatDuration(ms: number): string {
  if (ms > 0 && ms < 60000) return '不到 1 分钟';
  const m = Math.floor(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)} 小时${m % 60 ? ` ${m % 60} 分钟` : ''}` : `${m} 分钟`;
}
export function clockText(ms: number): string {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(sec / 60);
  return `${String(m).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}
export function toCSV(s: AppState): string {
  const cell = (v: unknown) => {
    let str = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(str)) str = "'" + str;
    return '"' + str.replaceAll('"', '""') + '"';
  };
  const rows: unknown[][] = [
    ['任务', '分类', '开始时间', '结束时间', '专注分钟', '结果', '复盘'],
    ...s.sessions.map((x) => [
      x.title,
      s.projects.find((p) => p.id === x.projectId)?.name ?? '未分类',
      new Date(x.startedAt).toLocaleString('zh-CN', { hour12: false }),
      new Date(x.endedAt).toLocaleString('zh-CN', { hour12: false }),
      (x.durationMs / 60000).toFixed(2),
      x.outcome === 'completed' ? '完整专注' : '提前结束',
      x.note ?? '',
    ]),
  ];
  return '\uFEFF' + rows.map((row) => row.map(cell).join(',')).join('\r\n');
}
