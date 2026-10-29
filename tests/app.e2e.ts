import {
  test,
  expect,
  _electron as electron,
  type ElectronApplication,
  type Page,
} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { createState, newTask, localDate, type AppState } from '../src/core';

const root = process.cwd();
let app: ElectronApplication;
let page: Page;
let appClosed = false;
const errors: string[] = [];
async function launch(name: string, initial?: AppState, existingDir?: string) {
  const dir = existingDir ?? path.join(root, '.test-data', `${name}-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  if (initial) fs.writeFileSync(path.join(dir, 'qishi-data.json'), JSON.stringify(initial));
  const env: Record<string, string> = Object.fromEntries(
    Object.entries(process.env).filter((x): x is [string, string] => x[1] !== undefined),
  );
  env.QISHI_DATA_DIR = dir;
  delete env.ELECTRON_RUN_AS_NODE;
  app = await electron.launch({ args: [root], env });
  appClosed = false;
  app.on('close', () => {
    appClosed = true;
  });
  page = await app.firstWindow();
  page.on('pageerror', (e) => errors.push(e.message));
  await expect(page.getByRole('button', { name: '今日专注', exact: true })).toBeVisible();
  return dir;
}
test.afterEach(async () => {
  if (app && !appClosed) await app.close();
  expect(errors.splice(0)).toEqual([]);
});
test('tasks, timer, pause, finish, stats, undo, mini and reload work together', async () => {
  await launch('journey');
  await page.getByRole('button', { name: '添加今日任务' }).click();
  await page.getByRole('textbox', { name: '任务名称' }).fill('完成产品设计稿');
  await page.getByLabel('分类', { exact: true }).selectOption('work');
  await page.getByLabel('新子任务').fill('梳理信息结构');
  await page.getByRole('button', { name: '添加子任务', exact: true }).click();
  await page.getByRole('button', { name: '保存任务', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: '选择专注：完成产品设计稿', exact: true }).click();
  await page.getByRole('button', { name: '开始专注', exact: true }).click();
  await expect(page.getByRole('button', { name: '暂停专注', exact: true })).toBeVisible();
  await page.waitForTimeout(2200);
  await page.getByRole('button', { name: '暂停专注', exact: true }).click();
  await expect(page.getByRole('button', { name: '继续专注', exact: true })).toBeVisible();
  const paused = await page.getByRole('timer').innerText();
  await page.waitForTimeout(1200);
  await expect(page.getByRole('timer')).toHaveText(paused);
  await page.getByRole('button', { name: '继续专注', exact: true }).click();
  await page.getByRole('button', { name: '结束本轮', exact: true }).click();
  await page.getByRole('button', { name: '结束并记录' }).click();
  await expect(page.getByRole('dialog', { name: '这一段时间，属于你' })).toBeVisible();
  await page.getByRole('button', { name: '标记完成', exact: true }).click();
  await page.getByRole('button', { name: '稍后再开始' }).click();
  await page.getByRole('button', { name: '专注统计', exact: true }).click();
  await expect(page.getByText('完成产品设计稿', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '我的任务', exact: false }).click();
  await page.getByRole('button', { name: '已完成', exact: true }).click();
  await page.getByRole('button', { name: '编辑任务：完成产品设计稿', exact: true }).click();
  await page.getByRole('button', { name: '删除任务', exact: true }).click();
  await page.getByRole('button', { name: '删除任务', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('任务已删除');
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await expect(page.getByText('完成产品设计稿', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '迷你模式', exact: true }).click();
  await expect(page.locator('.mini-shell')).toBeVisible();
  await page.getByRole('button', { name: '展开窗口', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: '今日专注', exact: true })).toBeVisible();
  const saved = await page.evaluate(() => window.qishi!.get());
  expect(saved.tasks).toHaveLength(1);
  expect(saved.sessions).toHaveLength(1);
  expect(saved.tasks[0].subtasks).toHaveLength(1);
});
test('settings, keyboard input, validation and desktop backup restore', async () => {
  const dir = await launch('settings');
  await page.getByRole('button', { name: '偏好设置' }).click();
  await page.getByLabel('番茄专注', { exact: true }).fill('30');
  await page.getByRole('button', { name: '夜色', exact: true }).click();
  await page.getByRole('button', { name: '保存设置' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByLabel('新分类名称').fill('创作');
  await page.getByRole('button', { name: '添加', exact: true }).click();
  await expect(page.getByRole('button', { name: '删除分类：创作' })).toBeVisible();
  const backup = path.join(dir, 'export.json');
  await app.evaluate(({ dialog }, file) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: file });
  }, backup);
  await page.getByRole('button', { name: '备份全部数据' }).click();
  await expect.poll(() => fs.existsSync(backup)).toBeTruthy();
  await app.evaluate(({ dialog }, file) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [file] });
    dialog.showMessageBox = async () => ({ response: 1, checkboxChecked: false });
  }, backup);
  await page.getByRole('button', { name: '恢复备份', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('备份已恢复');
  expect(fs.readdirSync(dir).some((f) => f.startsWith('before-restore'))).toBeTruthy();
  fs.writeFileSync(path.join(dir, 'invalid.json'), '{"version":1}');
  await app.evaluate(
    ({ dialog }, file) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [file] });
    },
    path.join(dir, 'invalid.json'),
  );
  await page.getByRole('button', { name: '恢复备份', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('校验未通过');
  await page.keyboard.press('Control+n');
  await page.getByRole('textbox', { name: '任务名称' }).fill('写一篇文章');
  await page.keyboard.press('Space');
  expect((await page.evaluate(() => window.qishi!.get())).timer.status).toBe('idle');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('alert')).toContainText('未保存');
  await page.getByRole('button', { name: '放弃修改', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('real desktop layouts: today, tasks, stats, dark, minimum size and mini', async () => {
  const s = createState();
  const today = localDate();
  s.tasks = [
    newTask('完成产品方案初稿', 'work', today),
    newTask('阅读《深度工作》20 页', 'learn', today),
    newTask('整理这周的灵感笔记', 'life', today),
    newTask('准备下一次项目讨论', 'work', today),
  ];
  s.tasks[0].priority = 'high';
  s.tasks[0].estimatedRounds = 3;
  s.tasks[1].estimatedRounds = 2;
  for (let i = 0; i < 12; i++) {
    const d = new Date();
    d.setDate(d.getDate() - Math.floor(i / 2));
    d.setHours(9 + (i % 2) * 3, 0, 0, 0);
    const start = +d;
    const ms = (25 + (i % 3) * 10) * 60000;
    s.sessions.push({
      id: `demo-${i}`,
      taskId: s.tasks[i % 4].id,
      title: s.tasks[i % 4].title,
      projectId: s.tasks[i % 4].projectId,
      startedAt: start,
      endedAt: start + ms,
      durationMs: ms,
      outcome: 'completed',
      segments: [{ start, end: start + ms }],
    });
  }
  s.timer.taskId = s.tasks[0].id;
  s.timer.title = s.tasks[0].title;
  s.timer.projectId = 'work';
  await launch('visual', s);
  fs.mkdirSync(path.join(root, 'docs', 'screenshots'), { recursive: true });
  await page.screenshot({ animations: 'disabled', path: 'docs/screenshots/01-today.png' });
  await page.getByRole('button', { name: '我的任务', exact: false }).click();
  await page.screenshot({ animations: 'disabled', path: 'docs/screenshots/02-tasks.png' });
  await page.getByRole('button', { name: '专注统计', exact: true }).click();
  await page.screenshot({ animations: 'disabled', path: 'docs/screenshots/03-stats.png' });
  await page.getByRole('button', { name: '月', exact: true }).click();
  await page.getByRole('heading', { name: '月度专注日历' }).scrollIntoViewIfNeeded();
  await page
    .locator('.calendar-card')
    .screenshot({ animations: 'disabled', path: 'docs/screenshots/08-calendar.png' });
  await page.getByRole('button', { name: new RegExp(`${today}，专注`) }).click();
  await expect(page.getByRole('heading', { name: '月度专注日历' })).toHaveCount(0);
  await page.getByRole('button', { name: '偏好设置' }).click();
  await page.screenshot({ animations: 'disabled', path: 'docs/screenshots/04-settings.png' });
  await page.getByRole('button', { name: '夜色', exact: true }).click();
  await page.getByRole('button', { name: '保存设置' }).click();
  await page.getByRole('button', { name: '今日专注', exact: true }).click();
  await page.getByRole('button', { name: '关闭提示' }).click();
  await page.screenshot({ animations: 'disabled', path: 'docs/screenshots/05-dark.png' });
  await page.evaluate(async () => {
    const s = await window.qishi!.get();
    await window.qishi!.dispatch({ type: 'settings', settings: { ...s.settings, theme: 'light' } });
  });
  await app.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0].setSize(960, 680);
  });
  await page.waitForTimeout(150);
  await expect(page.getByRole('button', { name: '开始专注', exact: true })).toBeInViewport();
  await page.screenshot({ animations: 'disabled', path: 'docs/screenshots/06-compact.png' });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(overflow).toBeFalsy();
  await page.getByRole('button', { name: '迷你模式', exact: true }).click();
  await page.waitForTimeout(150);
  await page.screenshot({ animations: 'disabled', path: 'docs/screenshots/07-mini.png' });
  await expect(page.getByRole('button', { name: '开始专注', exact: true })).toBeInViewport();
});
test('desktop suspend, relaunch, tray and automatic completion from mini preserve time', async () => {
  const s = createState();
  const now = Date.now();
  Object.assign(s.timer, {
    status: 'paused',
    durationMs: 60000,
    elapsedMs: 55000,
    startedAt: now - 55000,
    segments: [{ start: now - 55000, end: now }],
  });
  const dir = await launch('lifecycle', s);
  await page.getByRole('button', { name: '继续专注', exact: true }).click();
  await page.waitForTimeout(900);
  await app.evaluate(({ powerMonitor }) => powerMonitor.emit('suspend'));
  await expect(page.getByRole('button', { name: '继续专注', exact: true })).toBeVisible();
  const before = (await page.evaluate(() => window.qishi!.get())).timer.elapsedMs;
  await page.waitForTimeout(900);
  expect((await page.evaluate(() => window.qishi!.get())).timer.elapsedMs).toBe(before);
  await app.close();
  await launch('lifecycle-reopen', undefined, dir);
  const recovered = await page.evaluate(() => window.qishi!.get());
  expect(recovered.timer.status).toBe('paused');
  expect(recovered.timer.elapsedMs).toBe(before);
  await page.getByRole('button', { name: '关闭窗口', exact: true }).click();
  expect(
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isVisible()),
  ).toBeFalsy();
  await app.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0].show();
    BrowserWindow.getAllWindows()[0].focus();
  });
  await page.getByRole('button', { name: '迷你模式', exact: true }).click();
  await page.getByRole('button', { name: '继续专注', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '这一段时间，属于你' })).toBeVisible({
    timeout: 12000,
  });
  await expect(page.locator('.mini-shell')).toHaveCount(0);
  const done = await page.evaluate(() => window.qishi!.get());
  expect(done.sessions).toHaveLength(1);
  expect(done.sessions[0].durationMs).toBe(60000);
  await page.getByRole('button', { name: '休息一下', exact: true }).click();
  await expect(page.getByRole('button', { name: '暂停休息', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '结束本轮', exact: true }).click();
  expect((await page.evaluate(() => window.qishi!.get())).sessions).toHaveLength(1);
});
test('unsaved settings, task filters, long names and keyboard focus are handled', async () => {
  await launch('usability');
  await page.getByRole('button', { name: '偏好设置' }).click();
  await page.getByLabel('番茄专注', { exact: true }).fill('40');
  await page.getByRole('button', { name: '今日专注', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '设置还没有保存' })).toBeVisible();
  await page.getByRole('button', { name: '再想想', exact: true }).click();
  await expect(page.getByLabel('番茄专注', { exact: true })).toHaveValue('40');
  await page.getByRole('button', { name: '保存设置' }).click();
  await page.getByRole('button', { name: '我的任务', exact: false }).click();
  await page.getByRole('button', { name: '新建任务', exact: true }).click();
  const title = '一件需要认真投入的事情'.repeat(10);
  await page.getByRole('textbox', { name: '任务名称' }).fill(title);
  await page.getByLabel('计划日期').fill('');
  await page.getByLabel('新子任务').fill('还没按加号的小步骤');
  await page.getByRole('button', { name: '保存任务', exact: true }).click();
  await page.getByRole('button', { name: '收集箱', exact: true }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: '搜索任务或备注' }).fill('不存在的关键词');
  await expect(page.getByRole('heading', { name: '还没找到这件事' })).toBeVisible();
  const saved = await page.evaluate(() => window.qishi!.get());
  expect(saved.tasks[0].subtasks[0].title).toBe('还没按加号的小步骤');
  await page.getByRole('button', { name: '新建任务', exact: true }).click();
  await page.keyboard.press('Shift+Tab');
  expect(
    await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]')),
  ).toBeTruthy();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('storage failures remain visible and closing without tray exits cleanly', async () => {
  const dir = await launch('failure-notice');
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].webContents.send(
      'notice',
      '数据暂时无法写入磁盘。请检查磁盘空间，并在设置中导出备份。',
    ),
  );
  await expect(page.getByRole('alert')).toContainText('无法写入磁盘');
  await page.getByRole('button', { name: '我的任务', exact: false }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].webContents.send('notice', '数据保存已恢复正常。'),
  );
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.evaluate(async () => {
    const s = await window.qishi!.get();
    await window.qishi!.dispatch({
      type: 'settings',
      settings: { ...s.settings, closeToTray: false },
    });
  });
  const closed = app.waitForEvent('close');
  await page.getByRole('button', { name: '关闭窗口', exact: true }).click();
  await closed;
  expect(fs.existsSync(path.join(dir, 'qishi-data.json'))).toBeTruthy();
});
