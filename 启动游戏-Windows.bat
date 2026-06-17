@echo off
setlocal
cd /d "%~dp0"

set PORT=8081
set HOST=127.0.0.1
set URL=http://%HOST%:%PORT%/

echo Shan Na Bian - local launcher
echo Working directory: %cd%
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found.
  echo Please install Node.js 18 or later: https://nodejs.org/
  echo.
  pause
  exit /b 1
)

if not exist ".env.local" (
  echo .env.local was not found.
  echo The game can still start, but AI chat will use local fallback templates.
  echo To enable AI, copy .env.example to .env.local and fill in the API key.
  echo.
)

echo Starting local server: %URL%
echo Close this window to stop the server.
echo.

start "" "%URL%"
node dev-server.js %PORT%

echo.
pause
