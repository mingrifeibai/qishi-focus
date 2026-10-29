import { useState, type FormEvent } from 'react';
import { Plus, Trash2, X, Check } from 'lucide-react';
import { Dialog } from './components';
import { uid, taskSchema, type Task, type Project } from './core';
export function TaskEditor({
  task,
  isNew = false,
  projects,
  onSave,
  onDelete,
  onClose,
}: {
  task: Task;
  isNew?: boolean;
  projects: Project[];
  onSave: (t: Task) => Promise<boolean>;
  onDelete: (t: Task) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(task);
  const [sub, setSub] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const requestClose = () => {
    if (JSON.stringify(draft) !== JSON.stringify(task) || sub.trim()) setClosing(true);
    else onClose();
  };
  const update = <K extends keyof Task>(key: K, value: Task[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const addSub = () => {
    if (sub.trim() && draft.subtasks.length < 100) {
      update('subtasks', [...draft.subtasks, { id: uid(), title: sub.trim(), done: false }]);
      setSub('');
    }
  };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    const candidate = sub.trim()
      ? { ...draft, subtasks: [...draft.subtasks, { id: uid(), title: sub.trim(), done: false }] }
      : draft;
    const result = taskSchema.safeParse(candidate);
    if (!result.success) {
      setError('请填写任务名称，并检查日期和预计轮数。');
      return;
    }
    setSaving(true);
    if (await onSave(result.data)) onClose();
    setSaving(false);
  };
  return (
    <Dialog
      title={!isNew ? '任务详情' : '一件值得专注的事'}
      onClose={requestClose}
      className="task-dialog"
    >
      {closing && (
        <div className="unsaved-notice" role="alert">
          <span>还有未保存的修改，要保留编辑吗？</span>
          <div>
            <button className="text-button" onClick={() => setClosing(false)}>
              继续编辑
            </button>
            <button className="text-button danger" onClick={onClose}>
              放弃修改
            </button>
          </div>
        </div>
      )}
      <form onSubmit={save}>
        <label className="field">
          任务名称
          <input
            data-autofocus
            placeholder="你想完成什么？"
            maxLength={160}
            value={draft.title}
            onChange={(e) => update('title', e.target.value)}
            required
          />
        </label>
        <div className="form-grid">
          <label className="field">
            分类
            <select
              aria-label="分类"
              value={draft.projectId ?? ''}
              onChange={(e) => update('projectId', e.target.value || null)}
            >
              <option value="">未分类</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            计划日期
            <input
              aria-label="计划日期"
              type="date"
              value={draft.dueDate ?? ''}
              onChange={(e) => update('dueDate', e.target.value || null)}
            />
          </label>
          <label className="field">
            优先级
            <select
              aria-label="优先级"
              value={draft.priority}
              onChange={(e) => update('priority', e.target.value as Task['priority'])}
            >
              <option value="normal">普通</option>
              <option value="high">重要</option>
              <option value="low">从容安排</option>
            </select>
          </label>
          <label className="field">
            预计专注轮数
            <input
              type="number"
              min="1"
              max="99"
              value={draft.estimatedRounds}
              onChange={(e) => update('estimatedRounds', Number(e.target.value))}
            />
          </label>
        </div>
        <label className="field">
          重复安排
          <select
            aria-label="重复安排"
            value={draft.repeat}
            onChange={(e) => update('repeat', e.target.value as Task['repeat'])}
          >
            <option value="none">仅这一次</option>
            <option value="daily">每天</option>
            <option value="weekdays">每个工作日</option>
            <option value="weekly">每周</option>
          </select>
          <small className="muted">完成后生成下一次待办，不堆积错过的日期。</small>
        </label>
        <label className="field">
          备注 <span className="optional">可选</span>
          <textarea
            placeholder="记下下一步，让开始变得更容易。"
            maxLength={5000}
            rows={3}
            value={draft.notes}
            onChange={(e) => update('notes', e.target.value)}
          />
        </label>
        <div className="subtask-heading">
          拆成小步骤{' '}
          <span className="optional">
            {draft.subtasks.length
              ? `${draft.subtasks.filter((x) => x.done).length} / ${draft.subtasks.length}`
              : '可选'}
          </span>
        </div>
        <div className="subtask-list">
          {draft.subtasks.map((item) => (
            <div className="subtask" key={item.id}>
              <button
                type="button"
                className={`task-check ${item.done ? 'checked' : ''}`}
                aria-label={`切换子任务：${item.title}`}
                onClick={() =>
                  update(
                    'subtasks',
                    draft.subtasks.map((x) => (x.id === item.id ? { ...x, done: !x.done } : x)),
                  )
                }
              >
                {item.done && <Check size={12} />}
              </button>
              <span className={item.done ? 'struck' : ''}>{item.title}</span>
              <button
                type="button"
                className="icon-button"
                aria-label={`删除子任务：${item.title}`}
                onClick={() =>
                  update(
                    'subtasks',
                    draft.subtasks.filter((x) => x.id !== item.id),
                  )
                }
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="subtask-add">
          <input
            placeholder="添加一个小步骤"
            aria-label="新子任务"
            maxLength={160}
            value={sub}
            onChange={(e) => setSub(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSub();
              }
            }}
          />
          <button
            type="button"
            className="icon-button"
            aria-label="添加子任务"
            disabled={!sub.trim()}
            onClick={addSub}
          >
            <Plus size={17} />
          </button>
        </div>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-footer">
          {!isNew && (
            <button type="button" className="text-button danger" onClick={() => onDelete(task)}>
              <Trash2 size={15} />
              删除任务
            </button>
          )}
          <div className="spacer" />
          <button className="button secondary" type="button" onClick={requestClose}>
            取消
          </button>
          <button className="button primary" type="submit" disabled={saving}>
            保存任务
          </button>
        </div>
      </form>
    </Dialog>
  );
}
