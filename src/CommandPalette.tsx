import { useEffect, useState } from 'react';
import { Search, ArrowRight, Plus, Palette, Timer, BarChart3, ListTodo } from 'lucide-react';
import { Dialog } from './components';
import type { AppState, Task } from './core';
export function CommandPalette({
  state,
  onClose,
  onAdd,
  onTheme,
  onStats,
  onTasks,
  onTimer,
  onSelect,
}: {
  state: AppState;
  onClose: () => void;
  onAdd: () => void;
  onTheme: () => void;
  onStats: () => void;
  onTasks: () => void;
  onTimer: () => void;
  onSelect: (task: Task) => void;
}) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const commands = [
    { id: 'add', label: '新建一件想做的事', hint: '打开任务编辑', Icon: Plus, run: onAdd },
    { id: 'timer', label: '回到今日专注', hint: '计时器与今日计划', Icon: Timer, run: onTimer },
    {
      id: 'themes',
      label: '换一个喜欢的主题',
      hint: '五种风格 · 即刻切换',
      Icon: Palette,
      run: onTheme,
    },
    {
      id: 'tasks',
      label: '管理我的任务',
      hint: '搜索 · 批量安排 · 重复任务',
      Icon: ListTodo,
      run: onTasks,
    },
    {
      id: 'stats',
      label: '看看我的专注积累',
      hint: '趋势 · 日历 · 复盘',
      Icon: BarChart3,
      run: onStats,
    },
  ];
  const needle = query.trim().toLowerCase();
  const options = [
    ...commands.filter((x) => `${x.label}${x.hint}`.includes(needle)),
    ...state.tasks
      .filter((t) => !t.completed && t.title.toLowerCase().includes(needle))
      .slice(0, 8)
      .map((t) => ({
        id: t.id,
        label: t.title,
        hint: `选择专注 · ${state.projects.find((p) => p.id === t.projectId)?.name ?? '未分类'}`,
        Icon: ArrowRight,
        run: () => onSelect(t),
      })),
  ];
  useEffect(() => setIndex(0), [query]);
  useEffect(() => {
    document
      .querySelector('.command-results [aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [index, query]);
  const choose = (i: number) => {
    const item = options[i];
    if (item) {
      onClose();
      item.run();
    }
  };
  return (
    <Dialog title="想做点什么？" onClose={onClose} className="command-dialog">
      <div className="command-search">
        <Search size={19} />
        <input
          data-autofocus
          role="combobox"
          aria-label="搜索任务或操作"
          aria-controls="command-results"
          aria-expanded="true"
          aria-activedescendant={options[index] ? `command-${options[index].id}` : undefined}
          placeholder="搜索任务、主题或操作…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              setIndex((n) =>
                Math.max(0, Math.min(options.length - 1, n + (e.key === 'ArrowDown' ? 1 : -1))),
              );
            }
            if (e.key === 'Enter') {
              e.preventDefault();
              choose(index);
            }
          }}
        />
        <kbd>ESC</kbd>
      </div>
      <div className="command-results" id="command-results" role="listbox">
        {options.length ? (
          options.map((o, i) => (
            <button
              key={o.id}
              id={`command-${o.id}`}
              role="option"
              aria-selected={i === index}
              className={i === index ? 'active' : ''}
              tabIndex={-1}
              onMouseEnter={() => setIndex(i)}
              onClick={() => choose(i)}
            >
              <span className="command-icon">
                <o.Icon size={18} />
              </span>
              <span>
                <strong>{o.label}</strong>
                <small>{o.hint}</small>
              </span>
              <ArrowRight size={15} />
            </button>
          ))
        ) : (
          <p className="command-empty">没有匹配的内容，换个关键词试试。</p>
        )}
      </div>
      <div className="command-footer">
        <span>↑ ↓ 选择</span>
        <span>Enter 确认</span>
        <span>随时按 Ctrl K 打开</span>
      </div>
    </Dialog>
  );
}
