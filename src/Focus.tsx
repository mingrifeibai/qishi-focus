import { useState } from 'react';
import {
  Play,
  Pause,
  Square,
  Maximize2,
  ArrowUpRight,
  Coffee,
  ChevronDown,
  CircleCheck,
  Clock3,
  Target,
  Leaf,
  Plus,
  ArrowRight,
  Minimize2,
  Palette,
} from 'lucide-react';
import { ThemeScene } from './ThemeScene';
import { themeFor } from './themes';
import { TaskComposer } from './TaskComposer';
import { AmbientBar, Companion } from './FocusExtras';
import { TaskRow, Empty, SectionLink, Dialog } from './components';
import {
  clockText,
  dayMs,
  localDate,
  formatDuration,
  type AppState,
  type Action,
  type Task,
} from './core';

type Props = {
  state: AppState;
  act: (a: Action) => Promise<boolean>;
  onAdd: () => void;
  onEdit: (t: Task) => void;
  onTasks: () => void;
  onStats: () => void;
  onThemes: () => void;
  onSelect: (t: Task) => void;
  onFinish: () => void;
  immersive: boolean;
  setImmersive: (v: boolean) => void;
};
export function TimerFace({
  state,
  act,
  onFinish,
  small = false,
}: {
  state: AppState;
  act: Props['act'];
  onFinish: () => void;
  small?: boolean;
}) {
  const t = state.timer;
  const remaining =
    t.mode === 'stopwatch' && t.phase === 'focus'
      ? Math.floor(t.elapsedMs / 1000) * 1000
      : t.durationMs - t.elapsedMs;
  const progress = t.elapsedMs / t.durationMs;
  return (
    <div className={`timer-face ${small ? 'small-timer' : ''}`}>
      {!small && (
        <div className="timer-orbit">
          <svg viewBox="0 0 280 280" aria-hidden="true">
            <circle className="orbit-track" cx="140" cy="140" r="132" />
            <circle
              className="orbit-progress"
              cx="140"
              cy="140"
              r="132"
              strokeDasharray={`${2 * Math.PI * 132}`}
              strokeDashoffset={2 * Math.PI * 132 * (1 - Math.min(1, progress))}
            />
          </svg>
          <span className="orbit-dot" />
        </div>
      )}
      <div className="timer-inner">
        <span className="timer-status">
          {t.phase === 'break' ? (
            <>
              <Coffee size={14} />
              给自己一点留白
            </>
          ) : t.status === 'running' ? (
            <>
              <span className="live-dot" />
              专注进行中
            </>
          ) : t.status === 'paused' ? (
            '已暂停 · 随时继续'
          ) : (
            '让注意力，慢慢归位'
          )}
        </span>
        <div
          className="time-digits"
          role="timer"
          aria-label={t.mode === 'stopwatch' && t.phase === 'focus' ? '已专注时间' : '剩余时间'}
        >
          {clockText(remaining)}
        </div>
        {!small && (
          <span className="timer-caption">
            {t.phase === 'break'
              ? '休息时间不计入专注统计'
              : t.mode === 'stopwatch'
                ? '正向计时 · 按自己的节奏'
                : `${Math.round(t.durationMs / 60000)} 分钟 · 只做眼前这一件事`}
          </span>
        )}
      </div>
      <div className="timer-controls">
        <button
          className="button primary start-button"
          onClick={() => void act({ type: t.status === 'running' ? 'pause' : 'start' })}
        >
          {t.status === 'running' ? (
            <Pause size={17} fill="currentColor" />
          ) : (
            <Play size={17} fill="currentColor" />
          )}
          {t.status === 'running'
            ? t.phase === 'break'
              ? '暂停休息'
              : '暂停专注'
            : t.status === 'paused'
              ? t.phase === 'break'
                ? '继续休息'
                : '继续专注'
              : '开始专注'}
        </button>
        {t.status !== 'idle' && (
          <button
            className="button finish-button"
            title="结束本轮并保存实际专注时间"
            aria-label="结束本轮"
            onClick={onFinish}
          >
            <Square size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
export function Focus({
  state,
  act,
  onAdd,
  onEdit,
  onTasks,
  onStats,
  onThemes,
  onSelect,
  onFinish,
  immersive,
  setImmersive,
}: Props) {
  const [picker, setPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const world = themeFor(state.settings.style);
  const today = localDate();
  const now = new Date();
  const pending = state.tasks
    .filter((t) => !t.completed && t.dueDate && t.dueDate <= today)
    .sort(
      (a, b) =>
        Number(b.priority === 'high') - Number(a.priority === 'high') || a.createdAt - b.createdAt,
    );
  const completed = state.tasks.filter(
    (t) => t.completed && t.completedAt && localDate(t.completedAt) === today,
  );
  const elapsed = dayMs(state.sessions, today);
  const goal = Math.min(
    100,
    Math.round((elapsed / (state.settings.dailyGoalMinutes * 60000)) * 100),
  );
  return (
    <div className={`focus-page ${immersive ? 'immersive' : ''}`}>
      <div className="today-heading">
        <div>
          <div className="eyebrow">
            {now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
            <span className="date-divider" />A LITTLE MORE PRESENT
          </div>
          <h1>
            {now.getHours() < 11
              ? '早安，慢慢进入状态'
              : now.getHours() < 18
                ? '把时间，留给重要的事'
                : '夜晚，也有自己的节奏'}
            <span className="heading-dot">.</span>
          </h1>
        </div>
        <button className="today-world" onClick={onThemes}>
          <Palette size={13} />
          {world.name}
          <span>换个风景</span>
        </button>
      </div>
      <div className="focus-columns">
        <section className="focus-card">
          <div className="scene-wrap">
            <ThemeScene
              style={state.settings.style}
              running={state.timer.status === 'running' && state.timer.phase === 'focus'}
              growth={Math.floor(state.sessions.reduce((n, s) => n + s.durationMs, 0) / 1800000)}
            />
            <div className="scene-caption">
              <span>{world.quote}</span>
              <span>{world.english}</span>
            </div>
            <button
              className="scene-expand icon-button"
              aria-label={immersive ? '退出沉浸模式' : '进入沉浸模式'}
              title={immersive ? '退出沉浸模式' : '沉浸专注'}
              onClick={() => setImmersive(!immersive)}
            >
              {immersive ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
            </button>
          </div>
          <div className="focus-content">
            <div className="mode-switch" aria-label="专注模式">
              {(
                [
                  ['pomodoro', '番茄专注'],
                  ['deep', '深度专注'],
                  ['stopwatch', '正向计时'],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  className={state.timer.mode === mode ? 'active' : ''}
                  disabled={state.timer.status !== 'idle'}
                  aria-pressed={state.timer.mode === mode}
                  onClick={() => void act({ type: 'mode', mode })}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              className="current-task"
              onClick={() => {
                setSearch('');
                setPicker(true);
              }}
              disabled={state.timer.status !== 'idle'}
              title="选择本轮专注的任务"
            >
              <span className="current-task-dot" />
              <span className="current-task-title">
                {state.timer.phase === 'break' ? '暂时放下，休息一下' : state.timer.title}
              </span>
              <ChevronDown size={14} />
            </button>
            {state.timer.mode !== 'stopwatch' && (
              <div className="duration-presets" aria-label="快捷专注时长">
                {[15, 25, 50, 90].map((m) => (
                  <button
                    key={m}
                    disabled={state.timer.status !== 'idle'}
                    aria-pressed={state.timer.durationMs === m * 60000}
                    className={state.timer.durationMs === m * 60000 ? 'active' : ''}
                    onClick={() => void act({ type: 'duration', minutes: m })}
                  >
                    {m}
                    <small> 分</small>
                  </button>
                ))}
              </div>
            )}
            <TimerFace state={state} act={act} onFinish={onFinish} />
            <div className="timer-bottom">
              <span className="shortcut-tip">
                <kbd>Space</kbd> {state.timer.status === 'running' ? '暂停' : '开始 / 继续'}
              </span>
              <span>一次专注，一点进步</span>
            </div>
          </div>
        </section>
        <aside className="today-panel">
          <div className="section-heading">
            <div>
              <h2>
                今日计划 <span className="count">{pending.length}</span>
              </h2>
              <p>少一点，也可以做得很好。</p>
            </div>
            <button className="icon-button add-circle" aria-label="添加今日任务" onClick={onAdd}>
              <Plus size={18} />
            </button>
          </div>
          <TaskComposer state={state} act={act} onAdvanced={onEdit} compact />
          <div className="today-tasks">
            {pending.length ? (
              pending
                .slice(0, 8)
                .map((t) => (
                  <TaskRow
                    key={t.id}
                    compact
                    task={t}
                    state={state}
                    onToggle={() => void act({ type: 'task-toggle', id: t.id })}
                    onEdit={() => onEdit(t)}
                    onSelect={() => onSelect(t)}
                  />
                ))
            ) : (
              <Empty
                title="给今天一个小小的开始"
                description="从一件事开始，就已经很好。"
                onAdd={onAdd}
              />
            )}
            {pending.length > 8 && (
              <button className="text-button" onClick={onTasks}>
                还有 {pending.length - 8} 项，查看全部 <ArrowRight size={14} />
              </button>
            )}
          </div>
          <button className="completed-toggle" onClick={() => setShowCompleted(!showCompleted)}>
            <ChevronDown size={14} className={showCompleted ? '' : 'rotated'} />
            <span>今日已完成</span>
            <span className="count">{completed.length}</span>
          </button>
          {showCompleted && (
            <div>
              {completed.length ? (
                completed.map((t) => (
                  <TaskRow
                    key={t.id}
                    compact
                    task={t}
                    state={state}
                    onToggle={() => void act({ type: 'task-toggle', id: t.id })}
                    onEdit={() => onEdit(t)}
                    onSelect={() => {}}
                  />
                ))
              ) : (
                <p className="muted small-copy">每一份完成，都值得被看见。</p>
              )}
            </div>
          )}
          <div className="panel-bottom">
            <SectionLink onClick={onTasks}>管理所有任务</SectionLink>
            <div className="gentle-note">
              <Leaf size={19} strokeWidth={1.3} />
              <p>
                不必填满每一分钟，
                <br />
                只需认真对待这一刻。
              </p>
            </div>
          </div>
        </aside>
      </div>
      <div className="daily-summary">
        <div className="summary-label">
          <span className="summary-icon">
            <Clock3 size={19} />
          </span>
          <div>
            <span className="muted">今日专注</span>
            <strong>{formatDuration(elapsed)}</strong>
          </div>
        </div>
        <div className="summary-label">
          <span className="summary-icon">
            <CircleCheck size={19} />
          </span>
          <div>
            <span className="muted">完成任务</span>
            <strong>
              {completed.length}
              <small> 件</small>
            </strong>
          </div>
        </div>
        <div className="summary-label goal-summary">
          <span className="summary-icon">
            <Target size={20} />
          </span>
          <div>
            <div className="goal-label">
              <span className="muted">每日期待</span>
              <span>{goal}%</span>
            </div>
            <div className="goal-track">
              <span style={{ width: `${goal}%` }} />
            </div>
            <small className="muted">
              {formatDuration(state.settings.dailyGoalMinutes * 60000)}，一点点积累
            </small>
          </div>
        </div>
        <button className="summary-link" onClick={onStats}>
          看看我的积累
          <ArrowUpRight size={17} />
        </button>
      </div>
      <AmbientBar state={state} act={act} />
      {state.settings.companion && <Companion state={state} />}
      {picker && (
        <Dialog title="这一刻，专注于什么？" onClose={() => setPicker(false)}>
          <input
            className="picker-search"
            data-autofocus
            placeholder="搜索未完成任务"
            aria-label="搜索专注任务"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="picker-list">
            <button
              className="picker-item"
              onClick={async () => {
                if (await act({ type: 'select-task', id: null })) setPicker(false);
              }}
            >
              <Leaf size={17} />
              <span>
                自由专注<small>不关联任务，也可以开始</small>
              </span>
            </button>
            {state.tasks
              .filter((t) => !t.completed && t.title.toLowerCase().includes(search.toLowerCase()))
              .map((t) => (
                <button
                  className="picker-item"
                  key={t.id}
                  onClick={async () => {
                    if (await act({ type: 'select-task', id: t.id })) setPicker(false);
                  }}
                >
                  <span className="current-task-dot" />
                  <span>
                    {t.title}
                    <small>
                      {state.projects.find((p) => p.id === t.projectId)?.name ?? '未分类'}
                    </small>
                  </span>
                  {state.timer.taskId === t.id && <CircleCheck size={17} />}
                </button>
              ))}
          </div>
        </Dialog>
      )}
    </div>
  );
}
