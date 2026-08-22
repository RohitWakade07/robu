@echo off
chcp 65001 >nul
cls

echo.
echo     ___     ____     __  ___   _____
echo    /   ^|   / __ \   /  ^|/  /  / ___/
echo   / /^| ^|  / /_/ /  / /^|_/ /   \__ \ 
echo  / ___ ^| / _, _/  / /  / /   ___/ / 
echo /_/  ^|_^|/_/ ^|_^|  /_/  /_/   /____/  
echo.
echo  ===================================================================
echo    A R M S  ::  Autonomous Robotic Management System
echo    Orchestration Layer ^& Fleet Intelligence Platform
echo  ===================================================================
echo.

:: Start Backend in a new terminal window
echo  [1/2] Launching ARMS Core Engine (FastAPI on http://localhost:8000)...
start "ARMS Core Backend [FastAPI]" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --reload --port 8000"

:: Start Frontend in a new terminal window
echo  [2/2] Launching ARMS Control Portal (React Vite on http://localhost:5173)...
start "ARMS Control Portal [React/Vite]" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo  -------------------------------------------------------------------
echo  [SUCCESS] Fleet Management Services Active!
echo    - API Swagger Docs : http://localhost:8000/docs
echo    - Control Dashboard: http://localhost:5173
echo  -------------------------------------------------------------------
echo.
