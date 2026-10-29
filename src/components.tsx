import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { X, ArrowUpRight, MoreHorizontal, Check, Leaf, Plus, Play } from 'lucide-react';
import { localDate, type AppState, type Task } from './core';
export function Logo({ small = false }: { small?: boolean }) {
  return (
    <span className={`logo ${small ? 'small' : ''}`} aria-hidden="true">
      <Leaf size={small ? 17 : 23} strokeWidth={1.6} />
    </span>
  );
}
export function Dialog({
  title,
  children,
  onClose,
  className = '',
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useLayoutEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const focus = () =>
      (
        (ref.current?.querySelector('[data-autofocus]') ??
          ref.current?.querySelector('button')) as HTMLElement | null
      )?.focus();
    focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeRef.current();
      }
      if (e.key === 'Tab') {
        const items = [
          ...(ref.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
          ) ?? []),
        ].filter((x) => x.offsetParent !== null);
        if (!items.length) {
          e.preventDefault();
          return;
        }
        const first = items[0],
          last = items.at(-1)!;
        if (!ref.current?.contains(document.activeElement)) {
          e.preventDefault();
          (e.shiftKey ? last : first).focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      before?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className={`dialog ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="dialog-heading">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="关闭弹窗">
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function Empty({
  title,
  description,
  onAdd,
  label = '添加一个任务',
}: {
  title: string;
  description: string;
  onAdd?: () => void;
  label?: string;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Leaf size={26} strokeWidth={1.2} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {onAdd && (
        <button className="text-button" onClick={onAdd}>
          <Plus size={15} />
          {label}
        </button>
      )}
    </div>
  );
}
export function TaskRow({
  task,
  state,
  onToggle,
  onSelect,
  onEdit,
  compact = false,
}: {
  task: Task;
  state: AppState;
  onToggle: () => void;
  onSelect: () => void;
  onEdit: () => void;
  compact?: boolean;
}) {
  const project = state.projects.find((x) => x.id === task.projectId);
  const selected = state.timer.taskId === task.id;
  const rounds = state.sessions.filter(
    (x) => x.taskId === task.id && x.outcome === 'completed',
  ).length;
  const overdue = task.dueDate && task.dueDate < localDate() && !task.completed;
  return (
    <div
      className={`task-row ${selected ? 'selected' : ''} ${task.completed ? 'completed' : ''} ${compact ? 'compact' : ''}`}
    >
      <button
        className="task-check"
        aria-label={`${task.completed ? '恢复任务' : '完成任务'}：${task.title}`}
        onClick={onToggle}
      >
        {task.completed && <Check size={13} strokeWidth={2.5} />}
      </button>
      <button className="task-body" onClick={onEdit} title="编辑任务">
        <span className="task-name">
          {task.priority === 'high' && <span className="priority-mark" title="高优先级" />}
          {task.title}
        </span>
        <span className="task-meta">
          {project && <span className={`project-dot ${project.color}`}>{project.name}</span>}
          {overdue ? (
            <span className="overdue">已逾期</span>
          ) : (
            task.dueDate &&
            !compact && (
              <span>
                {task.dueDate === localDate() ? '今天' : task.dueDate.slice(5).replace('-', '/')}
              </span>
            )
          )}
          {task.subtasks.length > 0 && (
            <span>
              {task.subtasks.filter((x) => x.done).length}/{task.subtasks.length} 子任务
            </span>
          )}
          {task.repeat !== 'none' && (
            <span className="repeat-tag">
              {{ daily: '每天', weekdays: '工作日', weekly: '每周', none: '' }[task.repeat]}
            </span>
          )}
          <span className="round-count">
            {rounds}/{task.estimatedRounds} 轮
          </span>
        </span>
      </button>
      {!task.completed && (
        <button
          className={`icon-button select-task ${selected ? 'is-selected' : ''}`}
          onClick={onSelect}
          title={selected ? '当前专注任务' : '选择并前往专注'}
          aria-label={`选择专注：${task.title}`}
        >
          {selected ? <span className="active-dot" /> : <Play size={15} />}
        </button>
      )}
      {!compact && (
        <button
          className="icon-button more-task"
          onClick={onEdit}
          aria-label={`编辑任务：${task.title}`}
        >
          <MoreHorizontal size={18} />
        </button>
      )}
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>
          {title}
          <span className="heading-dot">.</span>
        </h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
export function SectionLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button className="text-button subtle" onClick={onClick}>
      {children}
      <ArrowUpRight size={15} />
    </button>
  );
}
