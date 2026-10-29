import { useState, type FormEvent } from 'react';
import { Plus, SlidersHorizontal, CornerDownLeft } from 'lucide-react';
import { newTask, parseQuickInput, localDate, type AppState, type Action, type Task } from './core';
export const taskTemplates = [
  {
    name: '阅读',
    title: '读完一个章节',
    steps: ['确定今天要读的章节', '记下三个值得留下的观点'],
    rounds: 1,
  },
  {
    name: '写作',
    title: '完成一份初稿',
    steps: ['列出三个核心观点', '专心写完第一稿', '最后检查结构和表达'],
    rounds: 2,
  },
  {
    name: '学习',
    title: '掌握一个知识点',
    steps: ['理解概念和例子', '独立完成练习', '用自己的话总结'],
    rounds: 2,
  },
];
export function fromTemplate(index: number, projectId: string | null = null): Task {
  const template = taskTemplates[index];
  const t = newTask(template.title, projectId);
  t.estimatedRounds = template.rounds;
  t.subtasks = template.steps.map((title) => ({ id: crypto.randomUUID(), title, done: false }));
  return t;
}
export function TaskComposer({
  state,
  act,
  onAdvanced,
  compact = false,
}: {
  state: AppState;
  act: (a: Action) => Promise<boolean>;
  onAdvanced: (t: Task) => void;
  compact?: boolean;
}) {
  const [value, setValue] = useState('');
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const parsed = parseQuickInput(value, state.projects);
  const candidate = () => ({
    ...newTask(parsed.title, parsed.projectId, parsed.dueDate),
    priority: parsed.priority,
  });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!parsed.title || busy) return;
    setBusy(true);
    if (await act({ type: 'task-save', task: candidate() })) {
      setValue('');
      setMessage(
        parsed.dueDate === localDate()
          ? '已加入今日计划'
          : parsed.dueDate
            ? `已安排到 ${parsed.dueDate.slice(5).replace('-', '/')}`
            : '已放进收集箱',
      );
    }
    setBusy(false);
  };
  return (
    <div
      className={`task-composer ${compact ? 'compact-composer' : ''} ${active ? 'focused' : ''}`}
    >
      <form onSubmit={submit}>
        <Plus size={16} />
        <input
          aria-label="快速添加任务"
          placeholder={compact ? '记下一件事，回车添加' : '例如：明天 阅读 20 页 #学习 !重要'}
          maxLength={220}
          value={value}
          onFocus={() => setActive(true)}
          onBlur={() => setActive(false)}
          onChange={(e) => {
            setValue(e.target.value);
            setMessage('');
          }}
        />
        <button
          type="button"
          className="icon-button"
          aria-label="展开任务详细设置"
          onClick={() => {
            onAdvanced(candidate());
            setValue('');
          }}
        >
          <SlidersHorizontal size={14} />
        </button>
        <button
          className="composer-submit"
          type="submit"
          aria-label="快速保存任务"
          disabled={!parsed.title || busy}
        >
          <CornerDownLeft size={15} />
        </button>
      </form>
      {value ? (
        <div className="composer-hint">
          <span>{parsed.dueDate === localDate() ? '今天' : (parsed.dueDate ?? '收集箱')}</span>
          {parsed.projectId && (
            <span>{state.projects.find((p) => p.id === parsed.projectId)?.name}</span>
          )}
          {parsed.priority === 'high' && <span>重要</span>}
          <small>回车即可添加</small>
        </div>
      ) : message ? (
        <div className="composer-hint" role="status">
          {message}
        </div>
      ) : (
        active && (
          <div className="composer-hint">
            <small>支持 今天 / 明天 / 后天、#分类、!重要（用空格分隔）</small>
          </div>
        )
      )}
    </div>
  );
}
