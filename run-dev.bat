@echo off
echo Starting Webtoon Media Browser in development mode...
echo.
echo Press Ctrl+C to stop the dev server.
echo.

cd /d "%~dp0"
npm run dev
pause
