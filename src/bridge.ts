import {
  createState,
  reduce,
  parseBackup,
  toCSV,
  localDate,
  type Action,
  type AppState,
} from './core';
export interface Bridge {
  desktop: boolean;
  get(): Promise<AppState>;
  dispatch(action: Action): Promise<AppState>;
  subscribe(callback: (state: AppState) => void): () => void;
  onNotice(callback: (text: string) => void): () => void;
  onMini(callback: (mini: boolean) => void): () => void;
  window(action: string): Promise<void>;
  exportData(format: 'json' | 'csv'): Promise<boolean>;
  importData(): Promise<boolean>;
  openDataFolder(): Promise<unknown>;
  info(): Promise<{ version: string; dataPath: string; notice: string }>;
}
declare global {
  interface Window {
    qishi?: Bridge;
  }
}
function browserBridge(): Bridge {
  let state = createState();
  let notice = '';
  try {
    const raw = localStorage.getItem('qishi');
    if (raw) state = parseBackup(raw);
  } catch {
    notice = '浏览器数据读取失败，请导入备份恢复。';
  }
  const listeners = new Set<(s: AppState) => void>();
  const notices = new Set<(s: string) => void>();
  const minis = new Set<(s: boolean) => void>();
  let mini = false;
  const save = () => {
    try {
      localStorage.setItem('qishi', JSON.stringify(state));
    } catch {
      notices.forEach((fn) => fn('浏览器存储空间不足，请导出备份。'));
    }
  };
  const emit = () => listeners.forEach((fn) => fn(state));
  const dispatch = async (action: Action) => {
    state = reduce(state, action);
    save();
    emit();
    return state;
  };
  setInterval(() => {
    if (state.timer.status === 'running') void dispatch({ type: 'tick' });
  }, 500);
  window.addEventListener('beforeunload', () => {
    state = reduce(state, { type: 'pause' });
    save();
  });
  return {
    desktop: false,
    get: async () => state,
    dispatch,
    subscribe: (fn) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    onNotice: (fn) => {
      notices.add(fn);
      return () => {
        notices.delete(fn);
      };
    },
    onMini: (fn) => {
      minis.add(fn);
      return () => {
        minis.delete(fn);
      };
    },
    window: async (a) => {
      if (a === 'mini') {
        mini = !mini;
        minis.forEach((fn) => fn(mini));
      }
    },
    exportData: async (format) => {
      const url = URL.createObjectURL(
        new Blob([format === 'json' ? JSON.stringify(state, null, 2) : toCSV(state)], {
          type: format === 'json' ? 'application/json' : 'text/csv;charset=utf-8',
        }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = `栖时-${localDate()}.${format}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return true;
    },
    importData: async () =>
      new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.oncancel = () => resolve(false);
        input.onchange = async () => {
          try {
            if (state.timer.status !== 'idle') throw new Error('请先结束当前计时');
            const file = input.files?.[0];
            if (!file) {
              resolve(false);
              return;
            }
            const imported = parseBackup(await file.text());
            if (
              !confirm(
                `恢复 ${imported.tasks.length} 个任务和 ${imported.sessions.length} 条记录？当前数据将被替换。`,
              )
            ) {
              resolve(false);
              return;
            }
            localStorage.setItem('qishi-before-restore', JSON.stringify(state));
            state = imported;
            save();
            emit();
            resolve(true);
          } catch {
            notices.forEach((fn) => fn('备份无效或无法恢复，当前数据没有改变。'));
            resolve(false);
          }
        };
        input.click();
      }),
    openDataFolder: async () => {},
    info: async () => ({ version: '1.1.0', dataPath: '当前浏览器本地存储', notice }),
  };
}
export const bridge: Bridge = window.qishi ?? browserBridge();
