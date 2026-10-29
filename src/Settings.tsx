import { useEffect, useState, type FormEvent } from 'react';
import {
  Monitor,
  Sun,
  Moon,
  Download,
  Upload,
  FolderOpen,
  Plus,
  Trash2,
  Check,
  Keyboard,
  ShieldCheck,
} from 'lucide-react';
import { PageHeading } from './components';
import {
  settingsSchema,
  uid,
  type AppState,
  type Action,
  type Settings as SettingsType,
  type Project,
} from './core';
import { bridge } from './bridge';
export function Settings({
  state,
  act,
  toast,
  onDeleteProject,
  onDirty,
}: {
  state: AppState;
  act: (a: Action) => Promise<boolean>;
  toast: (s: string) => void;
  onDeleteProject: (p: Project) => void;
  onDirty: (dirty: boolean) => void;
}) {
  const [draft, setDraft] = useState(state.settings);
  const [projectName, setProjectName] = useState('');
  const [color, setColor] = useState<Project['color']>('sage');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState({ version: '1.1.0', dataPath: '' });
  const key = JSON.stringify(state.settings);
  useEffect(() => {
    setDraft(state.settings);
  }, [key]);
  useEffect(() => {
    void bridge.info().then(setInfo);
  }, []);
  const dirty = JSON.stringify(draft) !== key;
  useEffect(() => {
    onDirty(dirty);
  }, [dirty, onDirty]);
  const update = <K extends keyof SettingsType>(k: K, v: SettingsType[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));
  const save = async (e: FormEvent) => {
    e.preventDefault();
    const result = settingsSchema.safeParse(draft);
    if (!result.success) {
      setError('请检查时间范围：专注 1–180 分钟，休息 1–60 分钟，每日期待 15–720 分钟。');
      return;
    }
    setError('');
    if (await act({ type: 'settings', settings: result.data }))
      toast('设置已保存，将在下一轮专注中生效。');
  };
  const fileAction = async (type: 'json' | 'csv' | 'import') => {
    setBusy(true);
    try {
      const ok = type === 'import' ? await bridge.importData() : await bridge.exportData(type);
      if (ok) toast(type === 'import' ? '备份已恢复。' : '已导出到你选择的位置。');
    } catch (e) {
      toast(e instanceof Error ? e.message : '操作未完成，请重试。');
    } finally {
      setBusy(false);
    }
  };
  const addProject = async () => {
    if (!projectName.trim()) return;
    if (
      await act({ type: 'project-save', project: { id: uid(), name: projectName.trim(), color } })
    ) {
      setProjectName('');
      toast('分类已添加。');
    }
  };
  return (
    <div className="page settings-page">
      <PageHeading
        eyebrow="MAKE YOURSELF AT HOME"
        title="找到舒服的节奏"
        description="一点调整，让这里更适合你。"
      />
      <form onSubmit={save}>
        <section className="surface setting-section">
          <div className="setting-section-title">
            <h2>专注节奏</h2>
            <p>给投入和休息，都留出合适的时间。</p>
          </div>
          <div className="setting-number-grid">
            {(
              [
                { key: 'focusMinutes', label: '番茄专注', max: 180 },
                { key: 'longMinutes', label: '深度专注', max: 180 },
                { key: 'breakMinutes', label: '短休息', max: 60 },
                { key: 'longBreakMinutes', label: '长休息', max: 60 },
                { key: 'longBreakEvery', label: '长休息间隔', max: 12, unit: '轮', min: 2 },
                { key: 'dailyGoalMinutes', label: '每日期待', max: 720, min: 15 },
              ] as const
            ).map((item) => (
              <label className="field" key={item.key}>
                {item.label}
                <div className="number-with-unit">
                  <input
                    aria-label={item.label}
                    type="number"
                    min={'min' in item ? item.min : 1}
                    max={item.max}
                    value={draft[item.key]}
                    onChange={(e) => update(item.key, Number(e.target.value))}
                  />
                  <span>{'unit' in item ? item.unit : '分钟'}</span>
                </div>
              </label>
            ))}
          </div>
          <p className="setting-note">
            每完成 {draft.longBreakEvery}{' '}
            轮倒计时专注，可开始一次长休息。每日期待仅作参考，没有压力。
          </p>
        </section>
        <section className="surface setting-section">
          <div className="setting-section-title">
            <h2>外观与提醒</h2>
            <p>让界面退后一点，让注意力向前一点。</p>
          </div>
          <div className="theme-options">
            {(
              [
                { key: 'light', label: '暖白', Icon: Sun },
                { key: 'dark', label: '夜色', Icon: Moon },
                { key: 'system', label: '跟随系统', Icon: Monitor },
              ] as const
            ).map((x) => (
              <button
                type="button"
                key={x.key}
                className={`theme-option ${x.key} ${draft.theme === x.key ? 'active' : ''}`}
                onClick={() => update('theme', x.key)}
              >
                <div className="theme-preview">
                  <div />
                  <span />
                  <span />
                </div>
                <span>
                  <x.Icon size={15} />
                  {x.label}
                  {draft.theme === x.key && <Check size={15} />}
                </span>
              </button>
            ))}
          </div>
          {(
            [
              { key: 'sound', title: '轻柔提示音', desc: '专注或休息结束时，用一声轻响提醒你。' },
              {
                key: 'notifications',
                title: '桌面通知',
                desc: '在其他窗口工作时，也能收到结束提醒。',
              },
              {
                key: 'closeToTray',
                title: '关闭窗口时收进托盘',
                desc: '保持计时；右键托盘图标可完全退出。',
              },
              {
                key: 'alwaysOnTopMini',
                title: '迷你窗口始终置顶',
                desc: '让时间在桌面一角安静陪伴。',
              },
            ] as const
          ).map((x) => (
            <label className="setting-toggle" key={x.key}>
              <div>
                <strong>{x.title}</strong>
                <p>{x.desc}</p>
              </div>
              <input
                type="checkbox"
                checked={draft[x.key]}
                onChange={(e) => update(x.key, e.target.checked)}
              />
              <span className="switch" />
            </label>
          ))}
        </section>
        <div className={`settings-save ${dirty ? 'dirty' : ''}`}>
          <span>
            {error ? (
              <span className="error-text" role="alert">
                {error}
              </span>
            ) : dirty ? (
              '有未保存的设置'
            ) : (
              '设置已保存 · 计时中的本轮不受时长调整影响'
            )}
          </span>
          <button className="button primary" disabled={!dirty} type="submit">
            <Check size={16} />
            保存设置
          </button>
        </div>
      </form>
      <section className="surface setting-section">
        <div className="setting-section-title">
          <h2>任务分类</h2>
          <p>为生活的不同部分，留一个位置。</p>
        </div>
        <div className="project-manager">
          {state.projects.map((p) => (
            <span className="project-tag" key={p.id}>
              <span className={`color-dot ${p.color}`} />
              {p.name}
              <button
                className="icon-button"
                aria-label={`删除分类：${p.name}`}
                onClick={() => onDeleteProject(p)}
              >
                <Trash2 size={13} />
              </button>
            </span>
          ))}
        </div>
        <div className="add-project">
          <input
            aria-label="新分类名称"
            placeholder="添加一个分类"
            maxLength={30}
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void addProject();
              }
            }}
          />
          <div className="color-choices">
            {(['sage', 'blue', 'clay', 'gold', 'purple'] as const).map((c, i) => (
              <button
                className={`color-choice ${c} ${color === c ? 'active' : ''}`}
                key={c}
                aria-label={`分类颜色：${['松绿', '雾蓝', '陶土', '麦黄', '淡紫'][i]}`}
                onClick={() => setColor(c)}
              >
                {color === c && <Check size={11} />}
              </button>
            ))}
          </div>
          <button
            className="button secondary"
            disabled={!projectName.trim()}
            onClick={() => void addProject()}
          >
            <Plus size={15} />
            添加
          </button>
        </div>
      </section>
      <section className="surface setting-section">
        <div className="setting-section-title">
          <h2>数据，留在你这里</h2>
          <p>无需账号，本地保存。定期备份，让积累更安心。</p>
        </div>
        <div className="data-actions">
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => void fileAction('json')}
          >
            <Download size={16} />
            备份全部数据
          </button>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => void fileAction('import')}
          >
            <Upload size={16} />
            恢复备份
          </button>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => void fileAction('csv')}
          >
            <Download size={16} />
            导出 CSV
          </button>
        </div>
        <div className="data-path">
          <ShieldCheck size={15} />
          <span title={info.dataPath}>{info.dataPath}</span>
          {bridge.desktop && (
            <button
              className="icon-button"
              aria-label="打开数据文件夹"
              onClick={() => void bridge.openDataFolder()}
            >
              <FolderOpen size={16} />
            </button>
          )}
        </div>
        <p className="setting-note">
          自动保留上一份保存记录；恢复备份前也会保留当前数据。删除任务不会删除历史专注记录。
        </p>
      </section>
      <section className="surface setting-section shortcuts-section">
        <div className="setting-section-title">
          <h2>
            <Keyboard size={17} />
            顺手的快捷键
          </h2>
        </div>
        <div>
          <span>
            新建任务<kbd>Ctrl + N</kbd>
          </span>
          <span>
            开始 / 暂停<kbd>Space</kbd>
          </span>
          <span>
            迷你窗口<kbd>Ctrl + Shift + M</kbd>
          </span>
          <span>
            关闭弹窗 / 退出沉浸<kbd>Esc</kbd>
          </span>
        </div>
        <p className="setting-note">快捷键在栖时窗口内生效；输入文字时不会触发空格计时。</p>
      </section>
      <footer className="about-footer">
        <span>
          栖时 <small>QISHI · {info.version}</small>
        </span>
        <span>一段时间，一件事情，一点进步。</span>
      </footer>
    </div>
  );
}
