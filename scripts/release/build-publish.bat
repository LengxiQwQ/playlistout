@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0\..\.."

python scripts\release\build-publish.py %*

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [Build failed with exit code %ERRORLEVEL%]
    pause
    exit /b %ERRORLEVEL%
)

echo.
pause
