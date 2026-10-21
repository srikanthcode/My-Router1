@echo off
REM ---------------------------------------------------------------------------
REM  Convenience launcher for local development.
REM  The API defaults to port 4000, but that port is used by the LiteLLM proxy,
REM  so we run the API on 4100 and point the web UI at it. Web UI runs on 3000.
REM  Usage:  double-click, or run  start-dev.cmd
REM ---------------------------------------------------------------------------
setlocal
cd /d "%~dp0"
set API_PORT=4100
set API_BASE_URL=http://localhost:4100
set PUBLIC_API_BASE_URL=http://localhost:4100
set WEB_PORT=3000
call npm run dev > dev.log 2>&1