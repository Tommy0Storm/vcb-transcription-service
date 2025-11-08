# VCB Video Background Removal Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "VCB Video Background Removal Tool" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$INPUT_FILE = "VCB-Transcript-Video.mp4"
$OUTPUT_FILE = "VCB-Transcript-Video-Transparent.webm"

# Check if input file exists
if (-not (Test-Path $INPUT_FILE)) {
    Write-Host "ERROR: $INPUT_FILE not found!" -ForegroundColor Red
    Write-Host "Please make sure the video file is in the current directory." -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "Input:  $INPUT_FILE" -ForegroundColor Green
Write-Host "Output: $OUTPUT_FILE" -ForegroundColor Green
Write-Host ""
Write-Host "Removing white background (this may take a few minutes)..." -ForegroundColor Yellow
Write-Host ""

# Run ffmpeg with chromakey filter to remove white background
$ffmpegArgs = @(
    "-i", $INPUT_FILE,
    "-vf", "chromakey=white:0.1:0.2",
    "-c:v", "libvpx-vp9",
    "-pix_fmt", "yuva420p",
    "-auto-alt-ref", "0",
    "-b:v", "2M",
    "-y",
    $OUTPUT_FILE
)

try {
    & ffmpeg @ffmpegArgs

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "SUCCESS! Video processed successfully." -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Output file: $OUTPUT_FILE" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "The video now has a transparent background!" -ForegroundColor Green
        Write-Host "You can use this in your web app." -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "ERROR: Video processing failed!" -ForegroundColor Red
        Write-Host ""
    }
} catch {
    Write-Host ""
    Write-Host "ERROR: FFmpeg command failed!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
}

pause
