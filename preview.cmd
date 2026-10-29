@echo off
REM ---------------------------------------------------------------------------
REM  UNO Router — web preview launcher.
REM  Starts a production server on http://localhost:3100 and opens the browser.
REM  Double-click this file whenever you want the site up. Close the minimized
REM  "UNO Router Preview" window to stop the server.
REM ---------------------------------------------------------------------------
cd /d "%~dp0"

REM Stop any stale listener on port 3100
for /f "tokens=5" %%p in ('netstat -aon ^| findstr ":3100" ^| findstr "LISTENING"') do taskkill /f /pid %%p >nul 2>&1

if not exist "apps\web\.next" (
  echo Production build missing — building now ^(one time^)...
  call npm run build -w @pro/web >> preview-build.log 2>&1
)

cd apps\web
start "UNO Router Preview (close this window to stop)" /min cmd /c "npx next start -p 3100 > ..\..\preview-3100.log 2>&1"
timeout /t 5 >nul
start "" http://localhost:3100
