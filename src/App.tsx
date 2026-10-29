import { useEffect, useRef, useState } from 'react';
import {
  Sun,
  ListTodo,
  ChartNoAxesCombined,
  Settings2,
  Minus,
  X,
  Square,
  PanelTop,
  ArrowUpRight,
  Check,
  Leaf,
  Coffee,
  ArrowRight,
  CircleHelp,
  AlertCircle,
  Palette,
  Search,
} from 'lucide-react';
import { bridge } from './bridge';
import {
  newTask,
  localDate,
  dayMs,
  formatDuration,
  type AppState,
  type Action,
  type Task,
  type Session,
} from './core';
import { Logo, Dialog } from './components';
import { Focus, TimerFace } from './Focus';
import { Tasks } from './Tasks';
import { Stats } from './Stats';
import { Settings } from './Settings';
import { TaskEditor } from './TaskEditor';
import { ThemeStudio } from './ThemeStudio';
import { themeFor } from './themes';
import { useAmbient, unlockAmbient } from './ambient';
import { CommandPalette } from './CommandPalette';
import { Reflection } from './FocusExtras';

type Page = 'today' | 'tasks' | 'stats' | 'settings' | 'themes';
type Confirm = {
  title: string;
  description: string;
  label: string;
  danger?: boolean;
  action: () => Promise<boolean>;
  extra?: { label: string; action: () => Promise<boolean> };
};
let audio: AudioContext | null = null;
function unlockAudio() {
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume();
  } catch {}
}
function chime() {
  if (!audio || audio.state !== 'running') return;
  for (const [frequency, delay] of [
    [660, 0],
    [880, 0.2],
  ]) {
    const oscillator = audio.createOscillator(),
      gain = audio.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, audio.currentTime + delay);
    gain.gain.linearRampToValueAtTime(0.07, audio.currentTime + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + delay + 1);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(audio.currentTime + delay);
    oscillator.stop(audio.currentTime + delay + 1);
  }
}
export function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [page, setPage] = useState<Page>('today');
  const [mini, setMini] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [editor, setEditor] = useState<Task | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [help, setHelp] = useState(false);
  const [command, setCommand] = useState(false);
  useAmbient(state);
  const [toast, setToast] = useState<{ text: string; undo?: () => void; id: number } | null>(null);
  const [fatal, setFatal] = useState('');
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [storageWarning, setStorageWarning] = useState('');
  const [, refreshDate] = useState(0);
  const stateRef = useRef(state);
  stateRef.current = state;
  const hadSummary = useRef(false);
  const showToast = (text: string, undo?: () => void) =>
    setToast({
      text: text.replace(/^Error invoking remote method '[^']+': (Error: )?/, ''),
      undo,
      id: Date.now(),
    });
  const navigate = (next: Page) => {
    if (page === 'settings' && settingsDirty && next !== 'settings')
      setConfirm({
        title: '设置还没有保存',
        description: '回到设置点击「保存设置」即可保留调整，也可以放弃修改并离开。',
        label: '放弃修改并离开',
        action: async () => {
          setSettingsDirty(false);
          setPage(next);
          return true;
        },
      });
    else setPage(next);
  };
  const toggleMini = () => {
    if (editor || confirm || help || command) return;
    if (settingsDirty) {
      showToast('请先保存设置，再切换迷你窗口。');
      return;
    }
    void bridge.window('mini');
  };
  useEffect(() => {
    const timer = setInterval(() => refreshDate((n) => n + 1), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    let mounted = true;
    void bridge
      .get()
      .then((s) => {
        if (mounted) setState(s);
      })
      .catch(() => setFatal('暂时无法读取数据，请重新打开栖时。'));
    void bridge
      .info()
      .then((i) => {
        if (i.notice && mounted) {
          if (i.notice.startsWith('数据暂时无法写入')) setStorageWarning(i.notice);
          else showToast(i.notice);
        }
      })
      .catch(() => {});
    const unsub = bridge.subscribe((s) => {
      if (mounted) setState(s);
    });
    const unnotice = bridge.onNotice((text) => {
      if (text.startsWith('数据暂时无法写入')) setStorageWarning(text);
      else if (text.startsWith('数据保存已恢复')) {
        setStorageWarning('');
        showToast(text);
      } else showToast(text);
    });
    const unmini = bridge.onMini((v) => {
      setMini(v);
      if (v) {
        setToast(null);
        setEditor(null);
        setHelp(false);
        setImmersive(false);
      }
    });
    return () => {
      mounted = false;
      unsub();
      unnotice();
      unmini();
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), toast.undo ? 12000 : 6500);
    return () => clearTimeout(timeout);
  }, [toast]);
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const sync = () => {
      document.documentElement.dataset.theme =
        state?.settings.theme === 'dark' || (state?.settings.theme === 'system' && media.matches)
          ? 'dark'
          : 'light';
    };
    document.documentElement.dataset.style = state?.settings.style ?? 'sage';
    document.documentElement.dataset.motion = state?.settings.motion === false ? 'off' : 'on';
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [state?.settings.theme, state?.settings.style, state?.settings.motion]);
  useEffect(() => {
    if (
      state?.summary &&
      !hadSummary.current &&
      state.settings.sound &&
      (document.hasFocus() || !state.settings.notifications)
    )
      chime();
    hadSummary.current = !!state?.summary;
  }, [state?.summary, state?.settings.sound]);
  const act = async (action: Action): Promise<boolean> => {
    unlockAudio();
    unlockAmbient();
    try {
      await bridge.dispatch(action);
      return true;
    } catch (e) {
      showToast(e instanceof Error ? e.message : '这次操作没有完成，请重试。');
      return false;
    }
  };
  const add = () => setEditor(newTask(''));
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const dialog = document.querySelector('[role="dialog"]');
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n' && !dialog) {
        e.preventDefault();
        if (mini) void bridge.window('mini');
        add();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'm' && !dialog) {
        e.preventDefault();
        if (settingsDirty) showToast('请先保存设置，再切换迷你窗口。');
        else void bridge.window('mini');
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && !dialog) {
        e.preventDefault();
        if (mini) void bridge.window('mini');
        setCommand(true);
      }
      if (e.key === 'Escape' && !dialog) setImmersive(false);
      const target = e.target as HTMLElement;
      if (
        e.code === 'Space' &&
        !e.repeat &&
        !dialog &&
        !target.closest('input, textarea, select, button, a, [contenteditable="true"]')
      ) {
        e.preventDefault();
        const s = stateRef.current;
        if (s) void act({ type: s.timer.status === 'running' ? 'pause' : 'start' });
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mini, settingsDirty]);
  const selectTask = async (task: Task) => {
    if (await act({ type: 'select-task', id: task.id })) {
      navigate('today');
      showToast(`准备好了：${task.title}`);
    }
  };
  const finish = () => {
    if (!state) return;
    if (mini) void bridge.window('mini');
    if (state.timer.phase === 'break') {
      void act({ type: 'discard' });
      return;
    }
    setConfirm({
      title: '这一轮，先到这里？',
      description: `已投入 ${formatDuration(state.timer.elapsedMs)}。结束后会保存实际专注时间；任务可以稍后继续。`,
      label: '结束并记录',
      action: () => act({ type: 'finish' }),
      extra: { label: '放弃本轮，不记录', action: () => act({ type: 'discard' }) },
    });
  };
  const deleteTask = (task: Task) => {
    setEditor(null);
    setConfirm({
      title: '删除这个任务？',
      description: `「${task.title}」会从列表移除，已有专注记录仍然保留。`,
      label: '删除任务',
      danger: true,
      action: async () => {
        const ok = await act({ type: 'task-delete', id: task.id });
        if (ok)
          showToast('任务已删除。', () => {
            void act({ type: 'task-save', task });
            setToast(null);
          });
        return ok;
      },
    });
  };
  const deleteSession = (session: Session) =>
    setConfirm({
      title: '删除这条专注记录？',
      description: `「${session.title}」的 ${formatDuration(session.durationMs)} 将从统计中移除，此操作无法撤销。`,
      label: '删除记录',
      danger: true,
      action: () => act({ type: 'session-delete', id: session.id }),
    });
  const runConfirm = async (action: () => Promise<boolean>) => {
    setConfirmBusy(true);
    try {
      if (await action()) setConfirm(null);
    } finally {
      setConfirmBusy(false);
    }
  };
  if (!state)
    return (
      <div className="loading-screen">
        <Logo />
        <h2>栖时</h2>
        <p>{fatal || '让注意力，慢慢归位。'}</p>
        {fatal && (
          <button className="button primary" onClick={() => location.reload()}>
            重新加载
          </button>
        )}
      </div>
    );
  const pending = state.tasks.filter(
    (t) => !t.completed && t.dueDate && t.dueDate <= localDate(),
  ).length;
  const summary = state.summary;
  const summaryTask = state.tasks.find((t) => t.id === state.timer.taskId);
  const weekly = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    return dayMs(state.sessions, localDate(d));
  });
  return (
    <div className={`app-shell ${mini ? 'mini-shell' : ''} ${immersive ? 'immersive-shell' : ''}`}>
      <header
        className="titlebar"
        inert={!!(editor || confirm || help || command || (summary && !mini))}
      >
        <div className="titlebar-brand">
          <Logo small />
          <span>栖时</span>
          <span className="titlebar-sub">QISHI</span>
        </div>
        <div className="titlebar-actions">
          {!mini && (
            <>
              <button
                className="quick-command-trigger"
                onClick={() => setCommand(true)}
                aria-label="快速操作"
              >
                <Search size={14} />
                <span>快速操作</span>
                <kbd>Ctrl K</kbd>
              </button>
              <button className="world-trigger" onClick={() => navigate('themes')}>
                <Palette size={14} />
                {themeFor(state.settings.style).name}
              </button>
            </>
          )}
          <button className="mini-trigger" onClick={toggleMini} title="Ctrl + Shift + M">
            <PanelTop size={14} />
            <span>{mini ? '展开窗口' : '迷你模式'}</span>
          </button>
          {bridge.desktop && (
            <>
              <span className="titlebar-separator" />
              <button
                className="window-button"
                aria-label="最小化窗口"
                onClick={() => void bridge.window('minimize')}
              >
                <Minus size={15} />
              </button>
              {!mini && (
                <button
                  className="window-button"
                  aria-label="最大化或还原窗口"
                  onClick={() => void bridge.window('maximize')}
                >
                  <Square size={11} />
                </button>
              )}
              <button
                className="window-button close-window"
                aria-label="关闭窗口"
                onClick={() => void bridge.window('close')}
              >
                <X size={16} />
              </button>
            </>
          )}
        </div>
      </header>
      {storageWarning && (
        <div className="storage-warning" role="alert">
          <AlertCircle size={15} />
          <span>{storageWarning}</span>
        </div>
      )}
      {mini ? (
        <main className="mini-content">
          <div className="mini-task">
            <span className="current-task-dot" />
            <span>{state.timer.phase === 'break' ? '休息一下' : state.timer.title}</span>
          </div>
          <TimerFace small state={state} act={act} onFinish={finish} />
        </main>
      ) : (
        <div className="app-body" inert={!!(editor || confirm || help || command || summary)}>
          <nav className="sidebar" aria-label="主导航">
            <div className="sidebar-brand">
              <Logo />
              <div>
                <strong>栖时</strong>
                <span>专注于此刻</span>
              </div>
            </div>
            <div className="nav-group">
              {(
                [
                  { id: 'today', label: '今日专注', Icon: Sun },
                  { id: 'tasks', label: '我的任务', Icon: ListTodo },
                  { id: 'stats', label: '专注统计', Icon: ChartNoAxesCombined },
                  { id: 'themes', label: '主题工坊', Icon: Palette },
                ] as const
              ).map((x) => (
                <button
                  className={`nav-item ${page === x.id ? 'active' : ''}`}
                  aria-current={page === x.id ? 'page' : undefined}
                  key={x.id}
                  onClick={() => navigate(x.id)}
                >
                  <x.Icon size={18} strokeWidth={1.7} />
                  <span>{x.label}</span>
                  {x.id === 'tasks' && pending > 0 && <span className="nav-count">{pending}</span>}
                </button>
              ))}
            </div>
            <div className="sidebar-bottom">
              <div className="sidebar-week">
                <div>
                  <span>最近七天</span>
                  <Leaf size={14} />
                </div>
                <strong>{formatDuration(weekly.reduce((a, b) => a + b, 0))}</strong>
                <div className="week-spark" aria-hidden="true">
                  {weekly.map((v, i) => (
                    <span
                      key={i}
                      className={i === 6 ? 'today' : ''}
                      style={{ height: `${Math.max(10, (v / Math.max(...weekly, 1)) * 100)}%` }}
                    />
                  ))}
                </div>
                <p>专注，让日子有迹可循。</p>
              </div>
              <button
                className={`nav-item ${page === 'settings' ? 'active' : ''}`}
                onClick={() => navigate('settings')}
              >
                <Settings2 size={18} strokeWidth={1.7} />
                <span>偏好设置</span>
              </button>
              <button className="help-button" onClick={() => setHelp(true)}>
                <CircleHelp size={14} />
                使用小贴士<span>1.1</span>
              </button>
            </div>
          </nav>
          <main className="main-scroll" key={page}>
            {page === 'today' ? (
              <Focus
                state={state}
                act={act}
                onAdd={add}
                onEdit={setEditor}
                onTasks={() => setPage('tasks')}
                onStats={() => setPage('stats')}
                onSelect={(t) => void selectTask(t)}
                onFinish={finish}
                immersive={immersive}
                setImmersive={setImmersive}
                onThemes={() => setPage('themes')}
              />
            ) : page === 'themes' ? (
              <ThemeStudio state={state} act={act} onFocus={() => setPage('today')} />
            ) : page === 'tasks' ? (
              <Tasks
                state={state}
                act={act}
                onAdd={add}
                onEdit={setEditor}
                onSelect={(t) => void selectTask(t)}
              />
            ) : page === 'stats' ? (
              <Stats
                state={state}
                onDelete={deleteSession}
                onExport={() => {
                  void bridge
                    .exportData('csv')
                    .then((ok) => {
                      if (ok) showToast('专注记录已导出。');
                    })
                    .catch(() => showToast('导出未完成，请重试。'));
                }}
              />
            ) : (
              <Settings
                state={state}
                act={act}
                toast={showToast}
                onDirty={setSettingsDirty}
                onDeleteProject={(p) =>
                  setConfirm({
                    title: `移除「${p.name}」分类？`,
                    description: '这个分类下的任务与记录会归入「未分类」，内容都会保留。',
                    label: '移除分类',
                    danger: true,
                    action: () => act({ type: 'project-delete', id: p.id }),
                  })
                }
              />
            )}
          </main>
        </div>
      )}
      {editor && (
        <TaskEditor
          key={editor.id}
          task={editor}
          isNew={!state.tasks.some((t) => t.id === editor.id)}
          projects={state.projects}
          onSave={(task) => act({ type: 'task-save', task })}
          onDelete={deleteTask}
          onClose={() => setEditor(null)}
        />
      )}
      {confirm && (
        <Dialog
          title={confirm.title}
          onClose={() => {
            if (!confirmBusy) setConfirm(null);
          }}
          className="confirm-dialog"
        >
          <p>{confirm.description}</p>
          <div className="dialog-footer">
            <button
              className="button secondary"
              disabled={confirmBusy}
              onClick={() => setConfirm(null)}
            >
              再想想
            </button>
            <button
              className={`button ${confirm.danger ? 'danger-fill' : 'primary'}`}
              disabled={confirmBusy}
              onClick={() => void runConfirm(confirm.action)}
            >
              {confirm.label}
            </button>
          </div>
          {confirm.extra && (
            <button
              className="discard-link"
              disabled={confirmBusy}
              onClick={() => void runConfirm(confirm.extra!.action)}
            >
              {confirm.extra.label}
            </button>
          )}
        </Dialog>
      )}
      {summary && !editor && !confirm && !mini && (
        <Dialog
          title={summary.phase === 'break' ? '休息好了，慢慢继续' : '这一段时间，属于你'}
          onClose={() => void act({ type: 'dismiss-summary' })}
          className="summary-dialog"
        >
          <div className="completion-emblem">
            {summary.phase === 'break' ? (
              <Coffee size={32} strokeWidth={1.4} />
            ) : (
              <Check size={34} strokeWidth={1.6} />
            )}
          </div>
          <div className="completion-time">{formatDuration(summary.durationMs)}</div>
          <p className="completion-description">
            {summary.phase === 'break'
              ? '准备好时，再开启下一轮。'
              : summary.sessionId
                ? `认真投入的每一分钟，都已为你记下。`
                : '本轮不足 1 秒，没有生成专注记录。'}
          </p>
          {summary.phase === 'focus' && (
            <div className="completion-task">
              <span>{summary.title}</span>
              {summaryTask && !summaryTask.completed && (
                <button
                  className="text-button"
                  onClick={() => void act({ type: 'task-toggle', id: summaryTask.id })}
                >
                  <Check size={14} />
                  标记完成
                </button>
              )}
              {summaryTask?.completed && (
                <span className="text-success">
                  <Check size={14} />
                  已完成
                </span>
              )}
            </div>
          )}
          {summary.sessionId && state.sessions.find((x) => x.id === summary.sessionId) && (
            <Reflection
              key={summary.sessionId}
              session={state.sessions.find((x) => x.id === summary.sessionId)!}
              act={act}
            />
          )}
          {summary.phase === 'break' && (
            <div className="rest-tip">看看远处，舒展肩颈，喝一口水。准备好再出发。</div>
          )}
          <div className="completion-actions">
            {summary.phase === 'focus' && (
              <button className="button primary" onClick={() => void act({ type: 'break' })}>
                <Coffee size={17} />
                休息一下
              </button>
            )}
            <button
              className={`button ${summary.phase === 'break' ? 'primary' : 'secondary'}`}
              onClick={() => void act({ type: 'start' })}
            >
              继续专注
              <ArrowRight size={16} />
            </button>
          </div>
          <button
            className="text-button subtle completion-later"
            onClick={() => void act({ type: 'dismiss-summary' })}
          >
            稍后再开始
          </button>
        </Dialog>
      )}
      {command && (
        <CommandPalette
          state={state}
          onClose={() => setCommand(false)}
          onAdd={add}
          onTheme={() => navigate('themes')}
          onStats={() => navigate('stats')}
          onTasks={() => navigate('tasks')}
          onTimer={() => navigate('today')}
          onSelect={(t) => void selectTask(t)}
        />
      )}
      {help && (
        <Dialog title="让开始，变得简单一点" onClose={() => setHelp(false)}>
          <div className="help-steps">
            <p>
              <span>01</span>
              <strong>记下一件事</strong>添加任务，或直接开始自由专注。
            </p>
            <p>
              <span>02</span>
              <strong>把这一刻交给它</strong>选中任务，按空格或点击开始。
            </p>
            <p>
              <span>03</span>
              <strong>看见自己的积累</strong>结束后记录时长，完成任务由你决定。
            </p>
          </div>
          <div className="help-note">
            <AlertCircle size={17} />
            <p>
              电脑休眠或退出应用时会暂停计时。关闭窗口默认收进托盘，仍会继续计时。迷你窗口可以陪你在其他应用中工作。
            </p>
          </div>
          <button className="button primary full-width" onClick={() => setHelp(false)}>
            慢慢来，开始吧
            <ArrowUpRight size={16} />
          </button>
        </Dialog>
      )}
      {toast && (
        <div className="toast" role="status">
          <span>{toast.text}</span>
          {toast.undo && <button onClick={toast.undo}>撤销</button>}
          <button className="toast-close" aria-label="关闭提示" onClick={() => setToast(null)}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
