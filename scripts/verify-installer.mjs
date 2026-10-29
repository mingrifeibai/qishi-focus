import { _electron as electron, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';

// Run only on a machine without an existing Qishi installation.
// Existing shortcut files are backed up and restored byte-for-byte.
// All application files and test data stay under the workspace's .test-data.
const root = process.cwd();
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const setup = path.join(root, 'release', `Qishi-Setup-${version}-x64.exe`);
assert.ok(fs.existsSync(setup), '先生成安装包');
const testDir = path.join(root, '.test-data', `installer-${Date.now()}`);
const installDir = path.join(testDir, 'app');
const dataDir = path.join(testDir, 'data');
const executable = path.join(installDir, '栖时.exe');
const env = { ...process.env, QISHI_DATA_DIR: dataDir };
delete env.ELECTRON_RUN_AS_NODE;
// PowerShell 7's inherited module paths are incompatible with the Windows
// PowerShell used by NSIS. Use its own built-in modules for this test process.
env.PSModulePath = path.join(
  process.env.SystemRoot,
  'System32',
  'WindowsPowerShell',
  'v1.0',
  'Modules',
);

function run(file, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, { env, windowsHide: true, ...options });
    let out = '',
      err = '';
    child.stdout?.on('data', (chunk) => {
      out += chunk.toString('utf8');
    });
    child.stderr?.on('data', (chunk) => {
      err += chunk.toString('utf8');
    });
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0
        ? resolve(out.trim())
        : reject(new Error(`${path.basename(file)} exited ${code}: ${err || out}`)),
    );
  });
}
function powershell(code) {
  const script = `[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new(); $ErrorActionPreference = 'Stop';\n${code}`;
  return run('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-EncodedCommand',
    Buffer.from(script, 'utf16le').toString('base64'),
  ]);
}
async function snapshot() {
  return JSON.parse(
    await powershell(`
$desktop = Join-Path ([Environment]::GetFolderPath('DesktopDirectory')) '栖时.lnk'
$start = Join-Path ([Environment]::GetFolderPath('Programs')) '栖时.lnk'
$shell = New-Object -ComObject WScript.Shell
$entries = @(Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*' | Where-Object { $_.DisplayName -match '栖时|Qishi' } | Select-Object DisplayName,DisplayVersion,InstallLocation,UninstallString)
$processes = @(Get-Process -Name '栖时' -ErrorAction SilentlyContinue)
$desktopTarget = if (Test-Path -LiteralPath $desktop) { $shell.CreateShortcut($desktop).TargetPath } else { $null }
$startTarget = if (Test-Path -LiteralPath $start) { $shell.CreateShortcut($start).TargetPath } else { $null }
[pscustomobject]@{ desktop=$desktop; start=$start; desktopTarget=$desktopTarget; startTarget=$startTarget; entries=$entries; processCount=$processes.Count; processIds=@($processes | ForEach-Object { $_.Id }) } | ConvertTo-Json -Depth 5 -Compress
`),
  );
}
const before = await snapshot();
assert.equal(before.entries.length, 0, '检测到已安装版本，停止测试以保护用户安装');
if (before.processCount > 0) {
  // Match electron-builder's NSIS process-scoped branch exactly. Never change
  // execution policy or permit its filename-wide taskkill fallback during this test.
  await powershell(`
if (-not (Get-Command Get-CimInstance -ErrorAction SilentlyContinue)) { throw '需要先退出栖时才能测试' }
if ((Get-ExecutionPolicy -Scope Process) -eq 'Restricted') { throw '不能安全隔离进程检查，请先退出栖时' }
$null = Get-CimInstance -ClassName Win32_Process -ErrorAction Stop
`);
}
fs.mkdirSync(dataDir, { recursive: true });
const shortcutBackups = [before.desktop, before.start]
  .filter((file) => fs.existsSync(file))
  .map((file, index) => {
    const bytes = fs.readFileSync(file);
    const stat = fs.statSync(file);
    fs.writeFileSync(path.join(testDir, `original-shortcut-${index}.lnk`), bytes);
    return { file, bytes, stat };
  });
function restoreShortcuts() {
  for (const { file, bytes, stat } of shortcutBackups) {
    fs.writeFileSync(file, bytes);
    fs.utimesSync(file, stat.atime, stat.mtime);
    assert.ok(fs.readFileSync(file).equals(bytes), '原有快捷方式必须完整恢复');
  }
}
let app;
let installed = false;
let cleaned = false;
const checked = [];
async function uninstall() {
  const relative = path.relative(path.join(root, '.test-data'), installDir);
  assert.ok(
    relative && !relative.startsWith('..') && !path.isAbsolute(relative),
    '卸载目标必须在测试目录内',
  );
  if (!fs.existsSync(installDir)) return;
  const names = fs.readdirSync(installDir).filter((name) => /^Uninstall.*\.exe$/i.test(name));
  assert.equal(names.length, 1, '只允许调用本次安装产生的唯一卸载程序');
  await run(path.join(installDir, names[0]), ['/S']);
  for (let i = 0; i < 60 && fs.existsSync(executable); i++) await delay(500);
  assert.ok(!fs.existsSync(executable), '卸载后程序文件应移除');
  for (let i = 0; i < 20; i++) {
    const state = await snapshot();
    if (!state.desktopTarget && !state.startTarget && state.entries.length === 0) {
      cleaned = true;
      break;
    }
    await delay(500);
  }
  assert.ok(cleaned, '卸载后快捷方式和卸载注册信息应清理');
}
try {
  // NSIS requires /D to be the final, unquoted argument, including paths with spaces.
  installed = true;
  await run(setup, ['/S', `/D=${installDir}`], { windowsVerbatimArguments: true });
  assert.ok(fs.existsSync(executable));
  const state = await snapshot();
  assert.equal(path.resolve(state.desktopTarget), executable);
  assert.equal(path.resolve(state.startTarget), executable);
  assert.equal(state.entries.length, 1);
  assert.equal(state.entries[0].DisplayVersion, version);
  checked.push(
    'silent-install',
    'desktop-shortcut-target',
    'start-menu-shortcut-target',
    'windows-uninstall-registration',
  );
  app = await electron.launch({ executablePath: executable, args: [], env, timeout: 45000 });
  const page = await app.firstWindow();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await expect(page.getByRole('button', { name: '今日专注', exact: true })).toBeVisible();
  assert.equal((await page.evaluate(() => window.qishi.info())).version, version);
  await page.getByRole('textbox', { name: '快速添加任务', exact: true }).fill('安装版验证任务');
  await page.getByRole('textbox', { name: '快速添加任务', exact: true }).press('Enter');
  await expect(
    page.getByRole('button', { name: '选择专注：安装版验证任务', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '主题工坊', exact: true }).click();
  await page.getByRole('button', { name: '使用像素牧场主题', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-style', 'pixel');
  await page.getByRole('button', { name: '在这里开始专注', exact: true }).click();
  await page.screenshot({ path: 'docs/screenshots/10-installed-app.png', animations: 'disabled' });
  assert.deepEqual(errors, []);
  await app.close();
  app = null;
  const saved = fs.readFileSync(path.join(dataDir, 'qishi-data.json'), 'utf8');
  assert.equal(JSON.parse(saved).tasks[0].title, '安装版验证任务');
  checked.push('installed-app-launch', 'task-and-theme-persistence', 'no-renderer-errors');
  await run(setup, ['/S', `/D=${installDir}`], { windowsVerbatimArguments: true });
  assert.ok(fs.existsSync(executable));
  assert.equal(fs.readFileSync(path.join(dataDir, 'qishi-data.json'), 'utf8'), saved);
  const afterReinstall = await snapshot();
  assert.equal(afterReinstall.entries.length, 1);
  assert.equal(path.resolve(afterReinstall.desktopTarget), executable);
  checked.push('same-version-reinstall', 'isolated-test-data-retained-on-reinstall');
  await uninstall();
  assert.equal(fs.readFileSync(path.join(dataDir, 'qishi-data.json'), 'utf8'), saved);
  checked.push(
    'uninstall-removes-program-shortcuts-registration',
    'isolated-test-data-retained-on-uninstall',
  );
  restoreShortcuts();
  checked.push('original-shortcuts-restored');
  const restored = await snapshot();
  for (const pid of before.processIds)
    assert.ok(restored.processIds.includes(pid), '原有运行进程应保持不变');
  checked.push('pre-existing-processes-untouched');
  const report = {
    result: 'PASS',
    version,
    installer: path.relative(root, setup).replaceAll(path.sep, '/'),
    sizeBytes: fs.statSync(setup).size,
    checked,
    testDir: path.relative(root, testDir).replaceAll(path.sep, '/'),
    temporaryInstallationRemoved: cleaned,
    scope:
      'Windows x64 current-user silent install/reinstall/uninstall; installed app UI and actual shortcut targets; isolated application data.',
  };
  fs.writeFileSync('docs/installer-verification.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally {
  try {
    if (app) await app.close();
    if (installed && !cleaned && fs.existsSync(executable)) await uninstall();
  } finally {
    restoreShortcuts();
  }
}
