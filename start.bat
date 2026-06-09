@echo off
title RepForge Gym Store - Local Server
echo ==============================================
echo   RepForge Gym Store
echo   Local development server
echo ==============================================
echo.

REM Kill anything on port 5500
for /f "tokens=5" %%P in ('netstat -aon ^| findstr :5500 ^| findstr LISTENING 2^>nul') do (
  echo [!] Killing stale process on port 5500 (PID %%P)...
  taskkill /F /PID %%P >nul 2>&1
)

cd /d "%~dp0frontend"

REM All-in-one Python server (static + API in one file)
if exist "_serve.py" (
  echo [+] Starting RepForge (Python - static + API)...
  echo     Open  http://localhost:5500/  in your browser
  echo     Press Ctrl+C to stop
  echo.
  python "_serve.py"
  goto :end
)

echo [!] Could not find _serve.py
pause

:end
