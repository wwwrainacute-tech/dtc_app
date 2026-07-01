@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo        Starting Dare to Care Platform...
echo ===================================================
echo.

:: Start the backend server in a new minimized command window
echo Starting Backend Server (Port 3002)...
start "Dare to Care - Backend" /MIN cmd /c "cd server && npm run dev"

:: Wait a few seconds for the backend to initialize
timeout /t 3 /nobreak >nul

:: Start the frontend server in a new minimized command window
echo Starting Frontend Server...
start "Dare to Care - Frontend" /MIN cmd /c "cd dare-to-care-forms && npm run dev"

:: Wait a few seconds for the frontend to be ready
timeout /t 3 /nobreak >nul

:: Open the default web browser to the app
echo Opening browser to http://localhost:5174 ...
start http://localhost:5174

echo.
echo ===================================================
echo Both servers are running in the background.
echo Keep those command windows open while using the app!
echo Close them when you are done.
echo ===================================================
pause
