import { Check, ArrowUpRight, Sun, Moon, Monitor, Sparkles } from 'lucide-react';
import { PageHeading } from './components';
import { ThemeScene } from './ThemeScene';
import { THEMES, themeFor } from './themes';
import type { AppState, Action } from './core';
export function ThemeStudio({
  state,
  act,
  onFocus,
}: {
  state: AppState;
  act: (action: Action) => Promise<boolean>;
  onFocus: () => void;
}) {
  const active = themeFor(state.settings.style);
  return (
    <div className="page studio-page">
      <PageHeading
        eyebrow="A WORLD THAT FEELS LIKE YOU"
        title="换个世界，继续热爱"
        description="五种风景，五种心情。选一个今天想待着的地方。"
      >
        <span className="studio-count">
          <Sparkles size={15} />5 个原创主题 · 全部可用
        </span>
      </PageHeading>
      <section className={`studio-spotlight preview-${active.id}`}>
        <ThemeScene style={active.id} />
        <div className="spotlight-copy">
          <span className="studio-eyebrow">你的小小世界 / CURRENT WORLD</span>
          <h2>{active.name}</h2>
          <p>{active.quote}</p>
          <button className="button primary" onClick={onFocus}>
            在这里开始专注
            <ArrowUpRight size={16} />
          </button>
        </div>
        <span className="spotlight-badge">
          <Check size={13} />
          正在使用
        </span>
      </section>
      <div className="studio-section-head">
        <div>
          <h2>找到你的频道</h2>
          <p>场景、配色、字体和细节，都会一起变化。</p>
        </div>
        <div className="studio-mode" aria-label="明暗模式">
          {(
            [
              { id: 'light', label: '浅色外观', Icon: Sun },
              { id: 'dark', label: '深色外观', Icon: Moon },
              { id: 'system', label: '跟随系统外观', Icon: Monitor },
            ] as const
          ).map((x) => (
            <button
              key={x.id}
              className={state.settings.theme === x.id ? 'active' : ''}
              aria-label={x.label}
              title={x.label}
              aria-pressed={state.settings.theme === x.id}
              onClick={() =>
                void act({ type: 'settings', settings: { ...state.settings, theme: x.id } })
              }
            >
              <x.Icon size={16} />
            </button>
          ))}
        </div>
      </div>
      <div className="theme-catalog">
        {THEMES.map((t) => (
          <button
            className={`world-card ${t.id === active.id ? 'selected' : ''} preview-${t.id}`}
            key={t.id}
            aria-label={`使用${t.name}主题`}
            aria-pressed={t.id === active.id}
            onClick={() =>
              void act({
                type: 'settings',
                settings: { ...state.settings, style: t.id, theme: t.mode },
              })
            }
          >
            <div className="world-thumbnail">
              <ThemeScene style={t.id} />
              <span className="world-tag">{t.tag}</span>
              {t.id === active.id && (
                <span className="world-check">
                  <Check size={15} />
                </span>
              )}
            </div>
            <div className="world-copy">
              <div>
                <h3>{t.name}</h3>
                <span className="world-swatches">
                  {t.colors.map((c) => (
                    <i key={c} style={{ background: c }} />
                  ))}
                </span>
              </div>
              <p>{t.description}</p>
              <span className="world-english">{t.english}</span>
            </div>
          </button>
        ))}
      </div>
      <section className="studio-preferences surface">
        <div>
          <h2>舒服，比热闹更重要</h2>
          <p>保留喜欢的细节，关掉会分散注意力的部分。</p>
        </div>
        <label className="setting-toggle">
          <div>
            <strong>轻柔场景动效</strong>
            <p>缓慢的云、行驶的列车与专注中的像素伙伴。</p>
          </div>
          <input
            type="checkbox"
            checked={state.settings.motion}
            onChange={(e) =>
              void act({
                type: 'settings',
                settings: { ...state.settings, motion: e.target.checked },
              })
            }
          />
          <span className="switch" />
        </label>
        <label className="setting-toggle">
          <div>
            <strong>显示专注伙伴</strong>
            <p>在今日页看见累计投入带来的小小成长。</p>
          </div>
          <input
            type="checkbox"
            checked={state.settings.companion}
            onChange={(e) =>
              void act({
                type: 'settings',
                settings: { ...state.settings, companion: e.target.checked },
              })
            }
          />
          <span className="switch" />
        </label>
      </section>
    </div>
  );
}
