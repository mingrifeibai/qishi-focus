import fs from 'node:fs';
import path from 'node:path';
import { createState, parseBackup, type AppState } from '../src/core';

export class Storage {
  file: string;
  notice = '';
  constructor(readonly directory: string) {
    fs.mkdirSync(directory, { recursive: true });
    this.file = path.join(directory, 'qishi-data.json');
  }
  load(): AppState {
    if (!fs.existsSync(this.file)) return createState();
    try {
      return parseBackup(fs.readFileSync(this.file, 'utf8'));
    } catch {
      fs.copyFileSync(this.file, this.file + `.damaged-${Date.now()}`);
      try {
        const state = parseBackup(fs.readFileSync(this.file + '.bak', 'utf8'));
        fs.copyFileSync(this.file + '.bak', this.file);
        this.notice = '已从自动备份恢复数据，原文件也已保留。';
        return state;
      } catch {
        this.notice = '数据文件无法读取，已保留原文件。你可以在设置中导入之前的备份。';
        fs.renameSync(this.file, this.file + `.unreadable-${Date.now()}`);
        return createState();
      }
    }
  }
  save(state: AppState) {
    const temporary = this.file + '.tmp';
    const fd = fs.openSync(temporary, 'w');
    try {
      fs.writeFileSync(fd, JSON.stringify(state));
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    if (fs.existsSync(this.file)) fs.copyFileSync(this.file, this.file + '.bak');
    fs.renameSync(temporary, this.file);
  }
}
