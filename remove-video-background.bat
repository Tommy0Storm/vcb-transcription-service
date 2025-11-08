@echo off
REM VCB Transcript - Remove White Background from Spinning Ball Video
REM This script uses ffmpeg to make the white background transparent

echo ========================================
echo VCB Video Background Removal Tool
echo ========================================
echo.

REM Check if ffmpeg is installed
where ffmpeg >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: ffmpeg is not installed!
    echo.
    echo Please install ffmpeg first:
    echo 1. Download from: https://ffmpeg.org/download.html
    echo 2. Or install via winget: winget install ffmpeg
    echo 3. Or install via chocolatey: choco install ffmpeg
    echo.
    pause
    exit /b 1
)

echo ffmpeg found! Processing video...
echo.

REM Input video file
set INPUT=VCB-Transcript-Video.mp4
set OUTPUT=VCB-Transcript-Video-Transparent.webm

REM Check if input file exists
if not exist "%INPUT%" (
    echo ERROR: %INPUT% not found!
    echo Please make sure the video file is in the current directory.
    pause
    exit /b 1
)

echo Input:  %INPUT%
echo Output: %OUTPUT%
echo.
echo Removing white background (this may take a few minutes)...
echo.

REM Remove white background using chromakey filter
REM Adjust the similarity value (0.1) if needed - higher = more aggressive removal
ffmpeg -i "%INPUT%" -vf "chromakey=white:0.1:0.2" -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -b:v 2M "%OUTPUT%"

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo SUCCESS! Video processed successfully.
    echo ========================================
    echo.
    echo Output file: %OUTPUT%
    echo.
    echo The video now has a transparent background.
    echo You can use this in your web app with transparency support.
    echo.
) else (
    echo.
    echo ========================================
    echo ERROR: Video processing failed!
    echo ========================================
    echo.
)

pause
