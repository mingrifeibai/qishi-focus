import {
  test,
  expect,
  _electron as electron,
  type ElectronApplication,
  type Page,
} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { createState, newTask, shiftDay, localDate } from '../src/core';
import { THEMES } from '../src/themes';
let app: ElectronApplication;
let page: Page;
const errors: string[] = [];
test.beforeEach(async () => {
  const dir = path.join(process.cwd(), '.test-data', `v1.1-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  const s = createState();
  s.tasks = [
    newTask('给今天一个小小的开始', 'work'),
    newTask('阅读 20 页，记下喜欢的句子', 'learn'),
    newTask('散步，留意沿途的风景', 'life'),
  ];
  s.timer.taskId = s.tasks[0].id;
  s.timer.title = s.tasks[0].title;
  s.timer.projectId = 'work';
  fs.writeFileSync(path.join(dir, 'qishi-data.json'), JSON.stringify(s));
  const env: Record<string, string> = Object.fromEntries(
    Object.entries(process.env).filter((x): x is [string, string] => x[1] !== undefined),
  );
  env.QISHI_DATA_DIR = dir;
  delete env.ELECTRON_RUN_AS_NODE;
  app = await electron.launch({ args: [process.cwd()], env });
  page = await app.firstWindow();
  page.on('pageerror', (e) => errors.push(e.message));
  await expect(page.getByRole('button', { name: '今日专注', exact: true })).toBeVisible();
});
test.afterEach(async () => {
  await app.close();
  expect(errors.splice(0)).toEqual([]);
});
test('five worlds change the complete UI, persist, and render at small sizes', async () => {
  fs.mkdirSync('docs/screenshots/v1.1', { recursive: true });
  for (const t of THEMES) {
    await page.getByRole('button', { name: '主题工坊', exact: true }).click();
    await page.getByRole('button', { name: `使用${t.name}主题`, exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-style', t.id);
    await page.getByRole('button', { name: '在这里开始专注', exact: true }).click();
    await expect(page.getByRole('timer')).toHaveText('25:00');
    await page.screenshot({ path: `docs/screenshots/v1.1/${t.id}.png`, animations: 'disabled' });
    await page.getByRole('button', { name: '主题工坊', exact: true }).click();
    await page.getByRole('button', { name: '深色外观', exact: true }).click();
    await page.getByRole('button', { name: '在这里开始专注', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.screenshot({
      path: `docs/screenshots/v1.1/${t.id}-dark.png`,
      animations: 'disabled',
    });
  }
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-style', 'pixel');
  await page.getByRole('button', { name: '主题工坊', exact: true }).click();
  await page.getByRole('button', { name: '使用松间留白主题', exact: true }).click();
  await page.screenshot({ path: 'docs/screenshots/v1.1/studio.png', animations: 'disabled' });
  const captureStyle = await page.addStyleTag({
    content: '.main-scroll { overflow: visible !important; }',
  });
  await page
    .locator('.theme-catalog')
    .screenshot({ path: 'docs/screenshots/v1.1/worlds.png', animations: 'disabled' });
  await captureStyle.evaluate((el) => el.parentNode?.removeChild(el));
  await page.getByLabel('轻柔场景动效').click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
  await page.getByRole('button', { name: '在这里开始专注', exact: true }).click();
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(960, 680));
  await expect(page.getByRole('button', { name: '开始专注', exact: true })).toBeInViewport();
  expect(
    await page.locator('.main-scroll').evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBeTruthy();
});
test('quick add, batch scheduling, recurrence, templates and command search work together', async () => {
  await page
    .getByRole('textbox', { name: '快速添加任务', exact: true })
    .fill('明天 准备读书笔记 #学习 !重要');
  await page.getByRole('textbox', { name: '快速添加任务', exact: true }).press('Enter');
  let s = await page.evaluate(() => window.qishi!.get());
  const added = s.tasks.find((t) => t.title === '准备读书笔记')!;
  expect(added.dueDate).toBe(shiftDay(1));
  expect(added.projectId).toBe('learn');
  expect(added.priority).toBe('high');
  await page.getByRole('button', { name: '我的任务', exact: false }).click();
  await page.getByRole('button', { name: '批量安排', exact: true }).click();
  await page.getByRole('checkbox', { name: '多选任务：准备读书笔记', exact: true }).check();
  await page.getByRole('button', { name: '安排今天', exact: true }).click();
  expect(
    (await page.evaluate(() => window.qishi!.get())).tasks.find((t) => t.id === added.id)!.dueDate,
  ).toBe(localDate());
  await page.getByRole('button', { name: '编辑任务：准备读书笔记', exact: true }).click();
  await page.getByLabel('重复安排', { exact: true }).selectOption('weekdays');
  await page.getByRole('button', { name: '保存任务', exact: true }).click();
  await page.getByRole('button', { name: '完成任务：准备读书笔记', exact: true }).click();
  s = await page.evaluate(() => window.qishi!.get());
  expect(s.tasks.filter((t) => t.title === '准备读书笔记')).toHaveLength(2);
  await page.getByRole('button', { name: '写作模板', exact: false }).click();
  await expect(page.getByRole('textbox', { name: '任务名称', exact: true })).toHaveValue(
    '完成一份初稿',
  );
  await page.getByRole('button', { name: '保存任务', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.keyboard.press('Control+k');
  await page.getByRole('combobox', { name: '搜索任务或操作', exact: true }).fill('准备读书笔记');
  await page.getByRole('combobox', { name: '搜索任务或操作', exact: true }).press('Enter');
  await expect(page.getByRole('button', { name: '开始专注', exact: true })).toBeVisible();
  expect((await page.evaluate(() => window.qishi!.get())).timer.title).toBe('准备读书笔记');
  await page.getByRole('button', { name: '偏好设置', exact: true }).click();
  await page.getByLabel('番茄专注', { exact: true }).fill('40');
  await page.keyboard.press('Control+k');
  await page.getByRole('combobox', { name: '搜索任务或操作', exact: true }).fill('准备读书笔记');
  await page.getByRole('combobox', { name: '搜索任务或操作', exact: true }).press('Enter');
  await expect(page.getByRole('dialog', { name: '设置还没有保存' })).toBeVisible();
  await page.getByRole('button', { name: '再想想', exact: true }).click();
  await expect(page.getByLabel('番茄专注', { exact: true })).toHaveValue('40');
});
test('duration shortcuts, audio lifecycle and reflection preserve accurate records', async () => {
  await page.evaluate(() => {
    const root = window as unknown as { audioEvents: { start: number; stop: number } };
    root.audioEvents = { start: 0, stop: 0 };
    const originalStart = AudioBufferSourceNode.prototype.start,
      originalStop = AudioBufferSourceNode.prototype.stop;
    AudioBufferSourceNode.prototype.start = function (...args: Parameters<typeof originalStart>) {
      root.audioEvents.start++;
      return originalStart.apply(this, args);
    };
    AudioBufferSourceNode.prototype.stop = function (...args: Parameters<typeof originalStop>) {
      root.audioEvents.stop++;
      return originalStop.apply(this, args);
    };
  });
  await page.getByRole('button', { name: '15 分', exact: true }).click();
  await expect(page.getByRole('timer')).toHaveText('15:00');
  await page.getByRole('button', { name: '环境音：雨幕', exact: true }).click();
  await page.getByRole('button', { name: '开始专注', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { audioEvents: { start: number } }).audioEvents.start,
      ),
    )
    .toBeGreaterThan(0);
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: '暂停专注', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { audioEvents: { stop: number } }).audioEvents.stop,
      ),
    )
    .toBeGreaterThan(0);
  await page.getByRole('button', { name: '结束本轮', exact: true }).click();
  await page.getByRole('button', { name: '结束并记录', exact: true }).click();
  await page
    .getByRole('textbox', { name: '专注复盘', exact: true })
    .fill('下次从第二节开始，先整理提纲。');
  await page.getByRole('button', { name: '保存复盘', exact: true }).click();
  await expect(page.getByRole('button', { name: '已保存', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '稍后再开始', exact: true }).click();
  await page.getByRole('button', { name: '专注统计', exact: true }).click();
  await expect(page.getByText('下次从第二节开始，先整理提纲。', { exact: true })).toBeVisible();
  const saved = await page.evaluate(() => window.qishi!.get());
  expect(saved.sessions).toHaveLength(1);
  expect(saved.sessions[0].durationMs).toBeLessThan(10000);
});
