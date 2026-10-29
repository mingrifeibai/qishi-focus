import { dayMs, localDate, formatDuration, type AppState } from './core';
export function FocusCalendar({
  state,
  month,
  onDay,
}: {
  state: AppState;
  month: Date;
  onDay: (day: Date) => void;
}) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const pad = (first.getDay() + 6) % 7;
  const days = Array.from({ length: count }, (_, i) => {
    const date = new Date(month.getFullYear(), month.getMonth(), i + 1);
    return { date, ms: dayMs(state.sessions, localDate(date)) };
  });
  const max = Math.max(...days.map((d) => d.ms), 1);
  return (
    <section className="surface calendar-card">
      <div className="section-heading">
        <div>
          <h2>月度专注日历</h2>
          <p>有投入的日子，会慢慢亮起来。点击日期查看当天足迹。</p>
        </div>
        <span className="calendar-legend">
          少<span />
          <span />
          <span />
          <span />多
        </span>
      </div>
      <div className="calendar-grid">
        {['一', '二', '三', '四', '五', '六', '日'].map((d) => (
          <span className="calendar-weekday" key={d}>
            {d}
          </span>
        ))}
        {Array.from({ length: pad }, (_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {days.map((d) => (
          <button
            key={+d.date}
            disabled={localDate(d.date) > localDate()}
            className={`calendar-day ${localDate(d.date) === localDate() ? 'today' : ''} ${d.ms ? 'has-focus' : ''}`}
            style={
              d.ms
                ? {
                    background: `color-mix(in srgb, var(--green) ${Math.round(8 + (d.ms / max) * 21)}%, var(--surface))`,
                  }
                : {}
            }
            onClick={() => onDay(d.date)}
            title={`${localDate(d.date)}：${formatDuration(d.ms)}`}
            aria-label={`${localDate(d.date)}，专注${formatDuration(d.ms)}`}
          >
            <span>{d.date.getDate()}</span>
            <small>{d.ms ? formatDuration(d.ms) : '—'}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
