import { useState } from 'react';
import {
  CloudRain,
  Waves,
  AudioLines,
  VolumeX,
  Volume2,
  Sprout,
  Sparkles,
  Save,
  Check,
} from 'lucide-react';
import { PixelPerson } from './ThemeScene';
import { unlockAmbient } from './ambient';
import { formatDuration, type AppState, type Action, type Session } from './core';
export function AmbientBar({
  state,
  act,
}: {
  state: AppState;
  act: (a: Action) => Promise<boolean>;
}) {
  return (
    <section className="ambient-bar" aria-label="专注环境音">
      <div className="ambient-label">
        <AudioLines size={16} />
        <span>给专注一点声音</span>
      </div>
      <div className="ambient-options">
        {(
          [
            { id: 'off', label: '安静', Icon: VolumeX },
            { id: 'rain', label: '雨幕', Icon: CloudRain },
            { id: 'white', label: '白噪音', Icon: Waves },
            { id: 'brown', label: '棕噪音', Icon: AudioLines },
          ] as const
        ).map((x) => (
          <button
            key={x.id}
            aria-label={`环境音：${x.label}`}
            aria-pressed={state.settings.ambient === x.id}
            className={state.settings.ambient === x.id ? 'active' : ''}
            onClick={() => {
              unlockAmbient();
              void act({ type: 'settings', settings: { ...state.settings, ambient: x.id } });
            }}
          >
            <x.Icon size={13} />
            {x.label}
          </button>
        ))}
      </div>
      {state.settings.ambient !== 'off' && (
        <label className="ambient-volume">
          <Volume2 size={13} />
          <input
            aria-label="环境音音量"
            type="range"
            min="0"
            max="100"
            value={state.settings.ambientVolume}
            onChange={(e) =>
              void act({
                type: 'settings',
                settings: { ...state.settings, ambientVolume: Number(e.target.value) },
              })
            }
          />
        </label>
      )}
      <p>
        {state.settings.ambient === 'off'
          ? '留一段纯粹的安静。'
          : '仅在专注中播放 · 暂停与休息时自动静音'}
      </p>
    </section>
  );
}
export function Companion({ state }: { state: AppState }) {
  const total = state.sessions.reduce((n, s) => n + s.durationMs, 0);
  const minutes = Math.floor(total / 60000);
  const stages = [
    { at: 0, label: '一颗种子', line: '第一次开始，就是小小的发芽。' },
    { at: 30, label: '冒出新芽', line: '一点点投入，让生活多一点绿意。' },
    { at: 120, label: '开出小花', line: '那些认真度过的时间，正在开花。' },
    { at: 300, label: '长成小树', line: '慢慢生长，不必和任何人比赛。' },
    { at: 900, label: '一片小森林', line: '你已经为自己种下了一片风景。' },
  ];
  const stage = [...stages].reverse().find((x) => minutes >= x.at)!;
  const next = stages.find((x) => x.at > minutes);
  const pct = next ? Math.min(100, ((minutes - stage.at) / (next.at - stage.at)) * 100) : 100;
  return (
    <div className="companion-card">
      <div className="companion-sprite">
        <svg viewBox="-4 -2 28 34" aria-hidden="true">
          <PixelPerson
            running={state.timer.status === 'running' && state.timer.phase === 'focus'}
          />
        </svg>
      </div>
      <div className="companion-copy">
        <span>
          <Sprout size={13} />
          专注小伙伴 <i>一起慢慢生长</i>
        </span>
        <strong>{stage.label}</strong>
        <p>{stage.line}</p>
      </div>
      <div className="companion-progress">
        <span>
          <Sparkles size={12} />
          {formatDuration(total)} 的积累
        </span>
        <div className="goal-track">
          <span style={{ width: `${pct}%` }} />
        </div>
        <small>
          {next ? `再投入 ${next.at - minutes} 分钟，${next.label}` : '不追赶，只继续自己的节奏。'}
        </small>
      </div>
    </div>
  );
}
export function Reflection({
  session,
  act,
}: {
  session: Session;
  act: (a: Action) => Promise<boolean>;
}) {
  const [note, setNote] = useState(session.note ?? '');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <div className="reflection">
      <label>
        给下一次开始，留一句话
        <textarea
          aria-label="专注复盘"
          maxLength={500}
          rows={2}
          placeholder="做到哪了？下一步从哪里开始？"
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setSaved(false);
          }}
        />
      </label>
      <button
        className="text-button"
        disabled={busy || note === (session.note ?? '')}
        onClick={async () => {
          setBusy(true);
          setSaved(await act({ type: 'session-note', id: session.id, note }));
          setBusy(false);
        }}
      >
        {saved ? <Check size={12} /> : <Save size={12} />} {saved ? '已保存' : '保存复盘'}
      </button>
    </div>
  );
}
