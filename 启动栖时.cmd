@echo off
chcp 65001 >nul
if exist "%~dp0release\Qishi-1.1.0.exe" (
  start "" "%~dp0release\Qishi-1.1.0.exe"
) else (
  echo 未找到程序，请先执行 npm.cmd run package。
  pause
)
