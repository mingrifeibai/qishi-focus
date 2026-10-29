import { useState } from 'react';
import { Plus, Search, ListFilter, CheckSquare, CalendarDays, Check, X, Copy } from 'lucide-react';
import { PageHeading, TaskRow, Empty } from './components';
import { localDate, shiftDay, type AppState, type Action, type Task } from './core';
import { TaskComposer, taskTemplates, fromTemplate } from './TaskComposer';
export function Tasks({
  state,
  act,
  onAdd,
  onEdit,
  onSelect,
}: {
  state: AppState;
  act: (a: Action) => Promise<boolean>;
  onAdd: () => void;
  onEdit: (t: Task) => void;
  onSelect: (t: Task) => void;
}) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [project, setProject] = useState('all');
  const [sort, setSort] = useState('priority');
  const [limit, setLimit] = useState(30);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [batchBusy, setBatchBusy] = useState(false);
  const today = localDate();
  const base = state.tasks.filter((t) =>
    filter === 'completed'
      ? t.completed
      : !t.completed &&
        (filter === 'today'
          ? t.dueDate && t.dueDate <= today
          : filter === 'planned'
            ? t.dueDate && t.dueDate > today
            : filter === 'inbox'
              ? !t.dueDate
              : true),
  );
  const items = base
    .filter(
      (t) =>
        (project === 'all' || (t.projectId ?? '') === project) &&
        `${t.title} ${t.notes}`.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === 'date'
        ? (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || a.createdAt - b.createdAt
        : sort === 'newest'
          ? b.createdAt - a.createdAt
          : { high: 0, normal: 1, low: 2 }[a.priority] -
              { high: 0, normal: 1, low: 2 }[b.priority] || a.createdAt - b.createdAt,
    );
  const visibleIds = new Set(items.map((t) => t.id));
  const chosen = selected.filter((id) => visibleIds.has(id));
  const batch = async (operation: 'complete' | 'schedule', dueDate?: string | null) => {
    if (!chosen.length || batchBusy) return;
    setBatchBusy(true);
    if (await act({ type: 'task-batch', ids: chosen, operation, dueDate })) {
      setSelected([]);
      setSelecting(false);
    }
    setBatchBusy(false);
  };
  return (
    <div className="page tasks-page">
      <PageHeading
        eyebrow="MAKE ROOM FOR WHAT MATTERS"
        title="有条理，也有余地"
        description="把脑海里的事放在这里，给专注腾出空间。"
      >
        <button className="button primary" onClick={onAdd}>
          <Plus size={17} />
          新建任务
        </button>
      </PageHeading>
      <TaskComposer state={state} act={act} onAdvanced={onEdit} />
      <div className="template-strip">
        <Copy size={13} />
        <span>从一个小计划开始</span>
        {taskTemplates.map((t, i) => (
          <button
            key={t.name}
            onClick={() =>
              onEdit(
                fromTemplate(
                  i,
                  state.projects.find((p) => p.name === (i === 1 ? '工作' : '学习'))?.id ?? null,
                ),
              )
            }
          >
            {t.name}模板
            <Plus size={11} />
          </button>
        ))}
      </div>
      <div className="tasks-surface">
        <div className="task-tabs">
          {[
            ['all', '待完成'],
            ['today', '今天'],
            ['planned', '计划'],
            ['inbox', '收集箱'],
            ['completed', '已完成'],
          ].map(([key, label]) => (
            <button
              key={key}
              className={filter === key ? 'active' : ''}
              onClick={() => {
                setFilter(key);
                setLimit(30);
              }}
            >
              {label}
              {key === 'all' && <span>{state.tasks.filter((t) => !t.completed).length}</span>}
            </button>
          ))}
        </div>
        <div className="task-toolbar">
          <label className="search-field">
            <Search size={17} />
            <input
              placeholder="搜索任务或备注…"
              aria-label="搜索任务或备注"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setLimit(30);
              }}
            />
          </label>
          <button
            className={`button secondary batch-trigger ${selecting ? 'active' : ''}`}
            aria-pressed={selecting}
            onClick={() => {
              setSelecting(!selecting);
              setSelected([]);
            }}
          >
            <CheckSquare size={14} />
            {selecting ? '退出多选' : '批量安排'}
          </button>
          <label className="sort-select">
            <ListFilter size={15} />
            <select aria-label="任务排序" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="priority">优先级排序</option>
              <option value="date">计划日期排序</option>
              <option value="newest">最近添加</option>
            </select>
          </label>
        </div>
        {selecting && (
          <div className="batch-bar">
            <label>
              <input
                type="checkbox"
                aria-label="选择当前结果（最多 500 项）"
                checked={chosen.length > 0 && chosen.length === Math.min(items.length, 500)}
                onChange={(e) =>
                  setSelected(e.target.checked ? items.slice(0, 500).map((t) => t.id) : [])
                }
              />
              已选 {chosen.length} 项
            </label>
            <button
              disabled={!chosen.length || batchBusy}
              onClick={() => void batch('schedule', localDate())}
            >
              <CalendarDays size={13} />
              安排今天
            </button>
            <button
              disabled={!chosen.length || batchBusy}
              onClick={() => void batch('schedule', shiftDay(1))}
            >
              移到明天
            </button>
            <button
              disabled={!chosen.length || batchBusy}
              onClick={() => void batch('schedule', null)}
            >
              放回收集箱
            </button>
            <button
              disabled={!chosen.length || batchBusy || filter === 'completed'}
              onClick={() => void batch('complete')}
            >
              <Check size={13} />
              完成
            </button>
          </div>
        )}
        <div className="project-filters">
          <button className={project === 'all' ? 'active' : ''} onClick={() => setProject('all')}>
            所有分类
          </button>
          {state.projects.map((p) => (
            <button
              key={p.id}
              className={project === p.id ? 'active' : ''}
              onClick={() => setProject(p.id)}
            >
              <span className={`color-dot ${p.color}`} />
              {p.name}
            </button>
          ))}
          <button className={project === '' ? 'active' : ''} onClick={() => setProject('')}>
            未分类
          </button>
        </div>
        <div className="task-list-caption">
          <span>
            {filter === 'completed' ? '每一份完成，都是积累' : '按自己的节奏，一件一件来'}
          </span>
          <span>{items.length} 个任务</span>
        </div>
        <div className="full-task-list">
          {items.length ? (
            items.slice(0, limit).map((t) => (
              <div className={`task-list-entry ${selecting ? 'is-selecting' : ''}`} key={t.id}>
                {selecting && (
                  <input
                    type="checkbox"
                    aria-label={`多选任务：${t.title}`}
                    checked={chosen.includes(t.id)}
                    onChange={(e) =>
                      setSelected((ids) =>
                        e.target.checked
                          ? [...ids.filter((id) => visibleIds.has(id)), t.id].slice(0, 500)
                          : ids.filter((id) => id !== t.id),
                      )
                    }
                  />
                )}
                <TaskRow
                  key={t.id}
                  task={t}
                  state={state}
                  onToggle={() => void act({ type: 'task-toggle', id: t.id })}
                  onEdit={() => onEdit(t)}
                  onSelect={() => onSelect(t)}
                />
              </div>
            ))
          ) : (
            <Empty
              title={
                search
                  ? '还没找到这件事'
                  : filter === 'completed'
                    ? '完成的事，会留在这里'
                    : filter === 'inbox'
                      ? '先记下来，稍后安排'
                      : '这里留着一点空白'
              }
              description={
                search
                  ? '试试其他关键词，或切换分类。'
                  : filter === 'inbox'
                    ? '创建任务时清空计划日期，就会出现在收集箱。'
                    : '不用一次想好所有事，从下一步开始。'
              }
              onAdd={search || filter === 'completed' ? undefined : onAdd}
            />
          )}
          {items.length > limit && (
            <button className="button secondary load-more" onClick={() => setLimit((n) => n + 30)}>
              再看 30 项
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
