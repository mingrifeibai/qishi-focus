import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';

const root = process.cwd();
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const file = path.join(root, 'release', `Qishi-${version}.exe`);
assert.ok(fs.existsSync(file), '先生成 Windows 免安装程序');
const server = net.createServer();
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
await new Promise((resolve) => server.close(resolve));
const dataDir = path.join(root, '.test-data', `release-${Date.now()}`);
fs.mkdirSync(dataDir, { recursive: true });
const env = { ...process.env, QISHI_DATA_DIR: dataDir };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(file, [`--remote-debugging-port=${port}`], {
  env,
  windowsHide: true,
  stdio: 'ignore',
});
let browser;
let page;
let exited = false;
child.on('exit', () => {
  exited = true;
});
child.on('error', (error) => console.error(error));
const deadline = Date.now() + 60000;
try {
  while (Date.now() < deadline) {
    try {
      browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { timeout: 1500 });
      break;
    } catch {
      if (exited) throw new Error('免安装启动器提前退出');
      await delay(700);
    }
  }
  assert.ok(browser, '发行程序在 60 秒内启动');
  const context = browser.contexts()[0];
  page = context.pages()[0] ?? (await context.waitForEvent('page'));
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.getByRole('button', { name: '今日专注', exact: true }).waitFor();
  const info = await page.evaluate(() => window.qishi.info());
  assert.equal(info.version, version);
  assert.equal(await page.evaluate(() => typeof window.require), 'undefined');
  const initial = await page.evaluate(() => window.qishi.get());
  assert.equal(initial.tasks.length, 0);
  assert.equal(initial.sessions.length, 0);
  await page.screenshot({ path: 'docs/screenshots/09-release-clean.png', animations: 'disabled' });
  await page.getByRole('button', { name: '主题工坊', exact: true }).click();
  await page.getByRole('button', { name: '使用像素牧场主题', exact: true }).click();
  await page.waitForFunction(() => document.documentElement.dataset.style === 'pixel');
  await page.getByRole('button', { name: '在这里开始专注', exact: true }).click();
  await page.getByRole('button', { name: '添加今日任务' }).click();
  await page.getByRole('textbox', { name: '任务名称' }).fill('发行版功能验证');
  await page.getByRole('button', { name: '保存任务', exact: true }).click();
  await page.getByRole('button', { name: '选择专注：发行版功能验证', exact: true }).click();
  await page.getByRole('button', { name: '开始专注', exact: true }).click();
  await delay(1800);
  await page.getByRole('button', { name: '结束本轮', exact: true }).click();
  await page.getByRole('button', { name: '结束并记录', exact: true }).click();
  await page.getByRole('dialog', { name: '这一段时间，属于你' }).waitFor();
  await page.getByRole('textbox', { name: '专注复盘', exact: true }).fill('新版发行验证完成');
  await page.getByRole('button', { name: '保存复盘', exact: true }).click();
  await page.getByRole('button', { name: '已保存', exact: true }).waitFor();
  const final = await page.evaluate(() => window.qishi.get());
  assert.equal(final.settings.style, 'pixel');
  assert.equal(final.sessions[0].note, '新版发行验证完成');
  assert.equal(final.tasks.length, 1);
  assert.equal(final.sessions.length, 1);
  assert.ok(final.sessions[0].durationMs >= 1000);
  assert.ok(fs.existsSync(path.join(dataDir, 'qishi-data.json')));
  await page.getByRole('button', { name: '稍后再开始', exact: true }).click();
  await page.getByRole('button', { name: '迷你模式', exact: true }).click();
  await page.locator('.mini-shell').waitFor();
  await page.screenshot({
    path: 'docs/screenshots/v1.1/release-pixel-mini.png',
    animations: 'disabled',
  });
  await page.getByRole('button', { name: '展开窗口', exact: true }).click();
  await page.locator('.companion-card').scrollIntoViewIfNeeded();
  await page.screenshot({
    path: 'docs/screenshots/v1.1/release-focus-extras.png',
    animations: 'disabled',
  });
  assert.deepEqual(errors, []);
  const report = {
    result: 'PASS',
    version: info.version,
    executable: path.relative(root, file).replaceAll(path.sep, '/'),
    sizeBytes: fs.statSync(file).size,
    checked: [
      'portable-exe-launch',
      'isolated-preload',
      'clean-first-run',
      'pixel-theme-switch',
      'task-create',
      'timer-start-finish',
      'session-persistence',
      'session-reflection',
      'pixel-mini-window',
      'no-renderer-errors',
    ],
    dataDir: path.relative(root, dataDir).replaceAll(path.sep, '/'),
  };
  fs.writeFileSync('docs/release-verification.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally {
  if (page && !page.isClosed()) {
    try {
      await page.evaluate(() => window.qishi.window('quit'));
    } catch {}
  }
  if (browser) {
    try {
      await browser.close();
    } catch {}
  }
  for (let i = 0; !exited && i < 20; i++) await delay(250);
  if (!exited && child.pid) {
    const cleanup = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
      windowsHide: true,
      stdio: 'ignore',
    });
    await new Promise((resolve) => cleanup.on('close', resolve));
  }
}
