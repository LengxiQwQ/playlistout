@echo off
chcp 65001 >nul
title PlaylistOut Dashboard Launcher

:: 切换到上一级项目根目录
cd /d "%~dp0..\..\"

echo =======================================================
echo   PlaylistOut 本地数据看板一键启动器
echo   PlaylistOut Local Analytics Dashboard Launcher
echo =======================================================
echo.

where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Python，请先安装 Python 3.9+ 并加入 PATH 环境变量。
    echo [Error] Python not found in PATH.
    echo.
    pause
    exit /b 1
)

python scripts\utils\dashboard.py

if %errorlevel% neq 0 (
    echo.
    echo [提示] 运行发生异常，请检查上方日志。
    pause
)
