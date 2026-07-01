@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo     Dare to Care - First Time Setup (Windows)
echo ===================================================
echo.

:: Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in your PATH.
    echo Please install Node.js from https://nodejs.org/ and try again.
    pause
    exit /b 1
)

echo [1/3] Setting up Backend Server...
cd server
call npm install
if not exist .env (
    echo Creating server/.env from example...
    copy ..\.env.example .env
)
cd ..
echo.

echo [2/3] Setting up Frontend Application...
cd dare-to-care-forms
call npm install
cd ..
echo.

echo [3/3] Setup Complete!
echo.
echo ===================================================
echo Setup finished successfully! 
echo You can now run the application by double-clicking:
echo   start-app.bat
echo ===================================================
pause
