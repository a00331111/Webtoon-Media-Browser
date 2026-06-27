@echo off
echo Starting Webtoon Media Browser with test folder...
echo.

cd /d "%~dp0"
cd versions\v0.2.5\Webtoon Media Browser-win32-x64

echo Opening test folder: Z:\other\玩物上志[2022年作品]\v
echo.

start "" "Webtoon Media Browser.exe" "Z:\other\玩物上志[2022年作品]\v"
