@echo off
setlocal enabledelayedexpansion

:: Set proxy for network access
set http_proxy=http://192.168.5.4:7893
set https_proxy=http://192.168.5.4:7893
set HTTP_PROXY=http://192.168.5.4:7893
set HTTPS_PROXY=http://192.168.5.4:7893

:: Read current version from package.json
for /f "tokens=2 delims=:, " %%a in ('findstr /C:"version" package.json') do (
    set "version=%%~a"
    goto :found_version
)

:found_version
echo Current version: %version%

:: Create version output directory
set "output_dir=versions\v%version%"
if not exist "%output_dir%" mkdir "%output_dir%"

:: Run build
echo Building version %version%...
call npm run build

if errorlevel 1 (
    echo Build failed!
    pause
    exit /b 1
)

:: Run package using electron-packager (ignore versions folder)
echo Packaging version %version%...
call npx @electron/packager . "Webtoon Media Browser" --platform=win32 --arch=x64 --out="%output_dir%" --overwrite --asar --ignore="versions"

if errorlevel 1 (
    echo Package failed!
    pause
    exit /b 1
)

:: Parse version components (major.minor.patch)
for /f "tokens=1,2,3 delims=." %%a in ("%version%") do (
    set "major=%%a"
    set "minor=%%b"
    set "patch=%%c"
)

:: Increment patch version
set /a "new_patch=%patch% + 1"
if %new_patch% lss 10 set "new_patch=0%new_patch%"

set "new_version=%major%.%minor%.%new_patch%"

:: Update package.json with new version
powershell -Command "(Get-Content package.json) -replace '\"version\": \"%version%\"', '\"version\": \"%new_version%\"' | Set-Content package.json"

echo.
echo ========================================
echo Build complete!
echo Version: %version%
echo Output: %output_dir%
echo Next version: %new_version%
echo ========================================
echo.

:: Open output directory
explorer "%output_dir%"

pause
