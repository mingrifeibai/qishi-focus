import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  Tray,
  nativeImage,
  Notification,
  powerMonitor,
  dialog,
  shell,
} from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { reduce, parseBackup, toCSV, localDate, type Action, type AppState } from '../src/core';
import { Storage } from './storage';

if (process.env.QISHI_DATA_DIR) app.setPath('userData', path.resolve(process.env.QISHI_DATA_DIR));
app.setName('栖时');
app.setAppUserModelId('studio.qishi.focus');
const single = app.requestSingleInstanceLock();
let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let quitting = false;
let mini = false;
let normalBounds = {
  width: 1240,
  height: 820,
  x: undefined as number | undefined,
  y: undefined as number | undefined,
};
let store: Storage;
let state: AppState;
let interval: NodeJS.Timeout;
let tickCount = 0;
let storageFailed = false;
let didTrayNotice = false;
const iconPath = () => path.join(app.getAppPath(), 'assets', 'icon.png');
const send = (channel: string, value: unknown) => {
  if (win && !win.isDestroyed()) win.webContents.send(channel, value);
};
function persist() {
  try {
    store.save(state);
    if (storageFailed) send('notice', '数据保存已恢复正常。');
    storageFailed = false;
  } catch {
    storageFailed = true;
    send('notice', '数据暂时无法写入磁盘。请检查磁盘空间，并在设置中导出备份。');
  }
}
function notify(title: string, body: string) {
  if (state.settings.notifications && Notification.isSupported()) {
    const n = new Notification({ title, body, icon: iconPath(), silent: !state.settings.sound });
    n.on('click', () => {
      win?.show();
      win?.focus();
    });
    n.show();
  }
}
function publish(previous: AppState) {
  send('state:update', state);
  if (state.summary && !previous.summary) {
    persist();
    if (mini) setMini(false);
    if (!win?.isFocused())
      notify(
        state.summary.phase === 'break' ? '休息好了，再慢慢开始' : '这一段专注，完成了',
        state.summary.phase === 'break'
          ? '准备好时，开启下一轮专注。'
          : `「${state.summary.title}」已记录，给自己一点休息时间。`,
      );
  }
  if (tray)
    tray.setToolTip(
      state.timer.status === 'running'
        ? `栖时 · ${state.timer.phase === 'break' ? '休息中' : state.timer.title}`
        : '栖时 · 把时间留给重要的事',
    );
}
function dispatch(action: Action) {
  const previous = state;
  state = reduce(state, action);
  if (action.type !== 'tick') persist();
  publish(previous);
  if (action.type === 'settings' && mini) win?.setAlwaysOnTop(state.settings.alwaysOnTopMini);
  return state;
}
function setMini(value: boolean) {
  if (!win || mini === value) return;
  mini = value;
  if (mini) {
    if (win.isMaximized()) win.unmaximize();
    normalBounds = win.getBounds();
    win.setMinimumSize(360, 200);
    win.setSize(400, 232);
    win.setResizable(false);
    win.setAlwaysOnTop(state.settings.alwaysOnTopMini);
  } else {
    win.setResizable(true);
    win.setMinimumSize(960, 680);
    win.setBounds(normalBounds);
    win.setAlwaysOnTop(false);
  }
  send('mini', mini);
}
function createWindow() {
  win = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 960,
    minHeight: 680,
    frame: false,
    show: false,
    backgroundColor: '#f6f5f1',
    title: '栖时',
    icon: iconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  win.setMenu(null);
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) =>
    callback(false),
  );
  win.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'));
  win.once('ready-to-show', () => win?.show());
  win.on('close', (e) => {
    if (!quitting && state.settings.closeToTray && tray) {
      e.preventDefault();
      win?.hide();
      if (!didTrayNotice) {
        notify('栖时已收进托盘', '专注会继续计时，点击托盘图标即可返回。右键可退出。');
        didTrayNotice = true;
      }
    } else if (!quitting) {
      quitting = true;
      app.quit();
    }
  });
  win.on('closed', () => {
    win = null;
  });
  const image = nativeImage.createFromPath(iconPath()).resize({ width: 32, height: 32 });
  tray = new Tray(image);
  tray.setToolTip('栖时 · 把时间留给重要的事');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: '打开栖时',
        click: () => {
          win?.show();
          win?.focus();
        },
      },
      {
        label: '暂停 / 继续专注',
        click: () => {
          if (state.timer.status !== 'idle')
            dispatch({ type: state.timer.status === 'running' ? 'pause' : 'start' });
        },
      },
      { type: 'separator' },
      {
        label: '退出栖时',
        click: () => {
          quitting = true;
          app.quit();
        },
      },
    ]),
  );
  tray.on('click', () => {
    win?.show();
    win?.focus();
  });
}
if (!single) app.quit();
else {
  app.on('second-instance', () => {
    if (win?.isMinimized()) win.restore();
    win?.show();
    win?.focus();
  });
  app
    .whenReady()
    .then(() => {
      store = new Storage(app.getPath('userData'));
      state = store.load();
      ipcMain.handle('state:get', () => state);
      ipcMain.handle('state:dispatch', (_event, action: Action) => {
        if (!action || typeof action.type !== 'string' || JSON.stringify(action).length > 100000)
          throw new Error('操作数据无效');
        return dispatch(action);
      });
      ipcMain.handle('window:action', (_event, action: string) => {
        if (action === 'minimize') win?.minimize();
        if (action === 'maximize' && !mini) win?.isMaximized() ? win.unmaximize() : win?.maximize();
        if (action === 'close') win?.close();
        if (action === 'mini') setMini(!mini);
        if (action === 'quit') {
          quitting = true;
          app.quit();
        }
      });
      ipcMain.handle('app:info', () => ({
        version: app.getVersion(),
        dataPath: store.directory,
        notice: storageFailed
          ? '数据暂时无法写入磁盘。请检查磁盘空间，并在设置中导出备份。'
          : store.notice,
      }));
      ipcMain.handle('data:folder', () => shell.openPath(store.directory));
      ipcMain.handle('data:export', async (_event, format: string) => {
        if (format !== 'json' && format !== 'csv') throw new Error('不支持的格式');
        const result = await dialog.showSaveDialog(win!, {
          title: format === 'json' ? '备份栖时数据' : '导出专注记录',
          defaultPath: `栖时-${localDate()}.${format}`,
          filters: [{ name: format.toUpperCase(), extensions: [format] }],
        });
        if (result.canceled || !result.filePath) return false;
        fs.writeFileSync(
          result.filePath,
          format === 'json' ? JSON.stringify(state, null, 2) : toCSV(state),
          'utf8',
        );
        return true;
      });
      ipcMain.handle('data:import', async () => {
        if (state.timer.status !== 'idle') throw new Error('请先结束当前计时，再恢复备份');
        const picked = await dialog.showOpenDialog(win!, {
          title: '选择栖时备份',
          filters: [{ name: '栖时 JSON 备份', extensions: ['json'] }],
          properties: ['openFile'],
        });
        if (picked.canceled) return false;
        const file = picked.filePaths[0];
        if (fs.statSync(file).size > 20 * 1024 * 1024)
          throw new Error('文件过大，请选择有效的栖时备份');
        let imported: AppState;
        try {
          imported = parseBackup(fs.readFileSync(file, 'utf8'));
        } catch {
          throw new Error('备份格式或数据校验未通过，当前数据没有改变');
        }
        const result = await dialog.showMessageBox(win!, {
          type: 'question',
          title: '恢复备份',
          message: `用备份中的 ${imported.tasks.length} 个任务和 ${imported.sessions.length} 条专注记录替换当前数据？`,
          detail: '当前数据会先保存在数据文件夹的 before-restore 文件中。',
          buttons: ['取消', '恢复备份'],
          defaultId: 0,
          cancelId: 0,
        });
        if (result.response !== 1) return false;
        fs.writeFileSync(
          path.join(store.directory, `before-restore-${Date.now()}.json`),
          JSON.stringify(state),
        );
        store.save(imported);
        state = imported;
        send('state:update', state);
        return true;
      });
      createWindow();
      interval = setInterval(() => {
        if (state.timer.status !== 'running') return;
        const previous = state;
        state = reduce(state, { type: 'tick' });
        publish(previous);
        if (state.timer.status === 'paused' && previous.timer.status === 'running') {
          persist();
          send('notice', '检测到休眠或时间变化，已暂停计时。准备好后继续即可。');
        }
        if (++tickCount % 5 === 0) persist();
      }, 500);
      powerMonitor.on('suspend', () => {
        if (state.timer.status === 'running') {
          dispatch({ type: 'pause' });
          send('notice', '电脑休眠，专注已自动暂停。');
        }
      });
      powerMonitor.on('shutdown', () => {
        if (state.timer.status === 'running') dispatch({ type: 'pause' });
        persist();
      });
    })
    .catch((error) => {
      dialog.showErrorBox('栖时无法启动', String(error));
      app.quit();
    });
  app.on('before-quit', () => {
    quitting = true;
    clearInterval(interval);
    if (state) {
      state = reduce(state, { type: 'pause' });
      persist();
    }
    tray?.destroy();
    tray = null;
  });
  app.on('window-all-closed', () => app.quit());
}
