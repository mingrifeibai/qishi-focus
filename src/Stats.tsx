import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ArrowDownToLine,
  Clock3,
  CircleCheck,
  ChartNoAxesCombined,
  Sprout,
  Trash2,
} from 'lucide-react';
import { PageHeading, Empty } from './components';
import { FocusCalendar } from './Calendar';
import {
  dayMs,
  dayBounds,
  localDate,
  sessionMsBetween,
  formatDuration,
  type AppState,
  type Session,
} from './core';
type Period = 'day' | 'week' | 'month';
export function Stats({
  state,
  onExport,
  onDelete,
}: {
  state: AppState;
  onExport: () => void;
  onDelete: (s: Session) => void;
}) {
  const [period, setPeriod] = useState<Period>('week');
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(15);
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  if (period === 'week')
    startDate.setDate(startDate.getDate() - ((startDate.getDay() + 6) % 7) + offset * 7);
  if (period === 'month') {
    startDate.setDate(1);
    startDate.setMonth(startDate.getMonth() + offset);
  }
  if (period === 'day') startDate.setDate(startDate.getDate() + offset);
  const endDate = new Date(startDate);
  if (period === 'month') endDate.setMonth(endDate.getMonth() + 1);
  else endDate.setDate(endDate.getDate() + (period === 'week' ? 7 : 1));
  const start = +startDate,
    end = +endDate;
  const sessions = state.sessions
    .filter((s) => sessionMsBetween(s, start, end) > 0)
    .sort((a, b) => b.startedAt - a.startedAt);
  const total = sessions.reduce((n, s) => n + sessionMsBetween(s, start, end), 0);
  const done = state.tasks.filter(
    (t) => t.completed && t.completedAt && t.completedAt >= start && t.completedAt < end,
  ).length;
  const points: { label: string; full: string; value: number; current: boolean }[] = [];
  if (period === 'day') {
    for (let h = 0; h < 24; h++) {
      const a = new Date(startDate);
      a.setHours(h);
      const b = new Date(a);
      b.setHours(h + 1);
      points.push({
        label: h % 4 === 0 ? `${h}:00` : '',
        full: `${h}:00–${h + 1}:00`,
        value: sessions.reduce((n, s) => n + sessionMsBetween(s, +a, +b), 0),
        current: offset === 0 && h === new Date().getHours(),
      });
    }
  } else {
    for (let d = new Date(startDate); +d < end; d.setDate(d.getDate() + 1)) {
      const day = localDate(d);
      points.push({
        label:
          period === 'week'
            ? ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
            : d.getDate() === 1 || d.getDate() % 5 === 0
              ? `${d.getDate()}`
              : '',
        full: day,
        value: dayMs(sessions, day),
        current: day === localDate(),
      });
    }
  }
  const max = Math.max(...points.map((p) => p.value / 60000), 30);
  const scale = Math.ceil(max / 30) * 30;
  const activeDays = period === 'day' ? (total ? 1 : 0) : points.filter((p) => p.value > 0).length;
  const distributions = [
    ...state.projects.map((p) => ({ id: p.id, name: p.name, color: p.color })),
    { id: null, name: '未分类', color: 'gray' },
  ]
    .map((p) => ({
      ...p,
      ms: sessions
        .filter((s) => s.projectId === p.id)
        .reduce((n, s) => n + sessionMsBetween(s, start, end), 0),
    }))
    .filter((p) => p.ms > 0)
    .sort((a, b) => b.ms - a.ms);
  let angle = 0;
  const stops = distributions
    .map((p) => {
      const a = angle;
      angle += (p.ms / total) * 360;
      return `var(--chart-${p.color}) ${a}deg ${angle}deg`;
    })
    .join(',');
  const label =
    period === 'day'
      ? startDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
      : period === 'month'
        ? startDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })
        : `${startDate.getFullYear()} 年 ${startDate.getMonth() + 1} 月 ${startDate.getDate()} 日 — ${new Date(end - 1).getMonth() + 1} 月 ${new Date(end - 1).getDate()} 日`;
  return (
    <div className="page stats-page">
      <PageHeading
        eyebrow="EVERY LITTLE MOMENT COUNTS"
        title="看见时间的积累"
        description="认真投入过的每一刻，都在这里留下痕迹。"
      >
        <button className="button secondary" onClick={onExport}>
          <ArrowDownToLine size={16} />
          导出记录
        </button>
      </PageHeading>
      <div className="stats-toolbar">
        <div className="segmented">
          {(
            [
              ['day', '日'],
              ['week', '周'],
              ['month', '月'],
            ] as const
          ).map(([p, title]) => (
            <button
              className={period === p ? 'active' : ''}
              key={p}
              onClick={() => {
                setPeriod(p);
                setOffset(0);
                setLimit(15);
              }}
            >
              {title}
            </button>
          ))}
        </div>
        <div className="period-picker">
          <button
            className="icon-button"
            aria-label="上一时段"
            onClick={() => {
              setOffset((n) => n - 1);
              setLimit(15);
            }}
          >
            <ChevronLeft size={17} />
          </button>
          <span>{label}</span>
          <button
            className="icon-button"
            aria-label="下一时段"
            disabled={offset >= 0}
            onClick={() => {
              setOffset((n) => n + 1);
              setLimit(15);
            }}
          >
            <ChevronRight size={17} />
          </button>
          {offset < 0 && (
            <button className="text-button" onClick={() => setOffset(0)}>
              回到当前
            </button>
          )}
        </div>
      </div>
      <div className="stat-cards">
        {[
          {
            icon: Clock3,
            label: '累计专注',
            value: formatDuration(total),
            foot: '只计算实际专注时间',
          },
          {
            icon: CircleCheck,
            label: '完成任务',
            value: `${done} 件`,
            foot: '每一件，都是向前一步',
          },
          {
            icon: ChartNoAxesCombined,
            label: '专注次数',
            value: `${sessions.length} 次`,
            foot: '包含提前结束的有效专注',
          },
          {
            icon: Sprout,
            label: '有投入的日子',
            value: `${activeDays} 天`,
            foot: '慢慢积累，不必追赶',
          },
        ].map((x) => (
          <div className="stat-card" key={x.label}>
            <div>
              <span>{x.label}</span>
              <x.icon size={17} />
            </div>
            <strong>{x.value}</strong>
            <small>{x.foot}</small>
          </div>
        ))}
      </div>
      <div className="chart-grid">
        <section className="surface trend-card">
          <div className="section-heading">
            <div>
              <h2>专注的节奏</h2>
              <p>{total ? '每一点投入，都有自己的分量。' : '完成第一轮专注后，这里会慢慢生长。'}</p>
            </div>
            <span className="chart-unit">分钟</span>
          </div>
          <div
            className="bar-chart"
            role="img"
            aria-label={`${label}专注趋势，总计${formatDuration(total)}`}
          >
            <div className="y-labels">
              <span>{scale}</span>
              <span>{scale / 2}</span>
              <span>0</span>
            </div>
            <div className="chart-plot">
              <div className="chart-lines">
                <i />
                <i />
                <i />
              </div>
              <div className={`bars ${period}`}>
                {points.map((p, i) => (
                  <div
                    className={`bar-column ${p.current ? 'current' : ''}`}
                    key={i}
                    title={`${p.full}：${formatDuration(p.value)}`}
                  >
                    <div className="bar-space">
                      <div
                        className={`bar ${!p.value ? 'zero' : ''}`}
                        style={{
                          height: `${Math.max(p.value ? 2 : 0, (p.value / 60000 / scale) * 100)}%`,
                        }}
                      />
                    </div>
                    <span>{p.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="chart-foot">
            <span className="legend-dot" />
            实际专注时长
            <span className="spacer" />
            暂停与休息时间不计入
          </div>
        </section>
        <section className="surface distribution-card">
          <div className="section-heading">
            <div>
              <h2>时间去了哪里</h2>
              <p>留给真正重要的事。</p>
            </div>
          </div>
          <div
            className={`donut ${total ? '' : 'empty'}`}
            style={total ? { background: `conic-gradient(${stops})` } : {}}
            role="img"
            aria-label={
              distributions
                .map((p) => `${p.name} ${Math.round((p.ms / total) * 100)}%`)
                .join('，') || '还没有专注记录'
            }
          >
            <div>
              <span>专注于</span>
              <strong>
                {distributions.length}
                <small> 个分类</small>
              </strong>
            </div>
          </div>
          <div className="distribution-list">
            {distributions.length ? (
              distributions.map((p) => (
                <div key={p.id ?? 'none'}>
                  <span className={`color-dot ${p.color}`} />
                  <span>{p.name}</span>
                  <span className="spacer" />
                  <span>{Math.round((p.ms / total) * 100)}%</span>
                  <small>{formatDuration(p.ms)}</small>
                </div>
              ))
            ) : (
              <p className="muted">为任务设置分类，让投入更清晰。</p>
            )}
          </div>
        </section>
      </div>
      {period === 'month' && (
        <FocusCalendar
          state={state}
          month={startDate}
          onDay={(d) => {
            const now = new Date();
            const delta =
              (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) -
                Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) /
              86400000;
            setPeriod('day');
            setOffset(delta);
            setLimit(15);
          }}
        />
      )}
      <section className="surface history-card">
        <div className="section-heading">
          <div>
            <h2>
              专注足迹 <span className="count">{sessions.length}</span>
            </h2>
            <p>本时段的记录 · 跨日专注按实际时间分配</p>
          </div>
        </div>
        {sessions.length ? (
          <div className="history-list">
            <div className="history-row history-header">
              <span>专注的事</span>
              <span>开始时间</span>
              <span>本时段投入</span>
              <span>状态</span>
              <span />
            </div>
            {sessions.slice(0, limit).map((s) => (
              <div className="history-row" key={s.id}>
                <div className="history-task">
                  <span
                    className={`color-dot ${state.projects.find((p) => p.id === s.projectId)?.color ?? 'gray'}`}
                  />
                  <span title={s.title}>
                    {s.title}
                    {s.note && (
                      <small className="history-note" title={s.note}>
                        {s.note}
                      </small>
                    )}
                  </span>
                </div>
                <span>
                  {new Date(s.startedAt).toLocaleString('zh-CN', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })}
                </span>
                <span>{formatDuration(sessionMsBetween(s, start, end))}</span>
                <span className={`session-status ${s.outcome}`}>
                  {s.outcome === 'completed' ? '完整专注' : '提前结束'}
                </span>
                <button
                  className="icon-button"
                  aria-label={`删除记录：${s.title}`}
                  onClick={() => onDelete(s)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {sessions.length > limit && (
              <button
                className="button secondary load-more"
                onClick={() => setLimit((n) => n + 15)}
              >
                查看更多记录
              </button>
            )}
          </div>
        ) : (
          <Empty
            title="你的专注足迹，从这里开始"
            description="结束一次专注，实际投入的时间就会被记录。"
          />
        )}
      </section>
    </div>
  );
}
