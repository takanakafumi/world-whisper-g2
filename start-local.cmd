@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

set "PORT=5173"

if not exist "node_modules\.bin\vite.cmd" (
  echo [World Whisper] Dependencies are not installed.
  echo Run: pnpm install
  echo.
  pause
  exit /b 1
)

echo [World Whisper] Checking the local development server...
powershell -NoProfile -Command "if ((Test-NetConnection -ComputerName 127.0.0.1 -Port %PORT% -WarningAction SilentlyContinue).TcpTestSucceeded) { exit 0 } else { exit 1 }"

if errorlevel 1 (
  echo Starting the development server...
  start "World Whisper Dev Server" /D "%~dp0" cmd /k call node_modules\.bin\vite.cmd --host 0.0.0.0 --port %PORT% --strictPort

  echo Waiting for port %PORT%...
  powershell -NoProfile -Command "$deadline = (Get-Date).AddSeconds(30); while ((Get-Date) -lt $deadline) { if ((Test-NetConnection -ComputerName 127.0.0.1 -Port %PORT% -WarningAction SilentlyContinue).TcpTestSucceeded) { exit 0 }; Start-Sleep -Milliseconds 500 }; exit 1"
) else (
  echo The development server is already running on port %PORT%.
)

if errorlevel 1 (
  echo.
  echo [World Whisper] The development server did not start within 30 seconds.
  echo Check the "World Whisper Dev Server" window for details.
  pause
  exit /b 1
)

cls
echo [World Whisper] Scan this QR code in Even Hub.
echo.
call node_modules\.bin\evenhub.cmd qr --port %PORT% --http

echo.
echo The development server is running in the other window.
echo Close that window or press Ctrl+C there when finished.
pause
