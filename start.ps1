# ARMS Platform Startup Script (PowerShell)
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Clear-Host

Write-Host "    ___     ____     __  ___   _____" -ForegroundColor Cyan
Write-Host "   /   |   / __ \   /  |/  /  / ___/" -ForegroundColor Cyan
Write-Host "  / /| |  / /_/ /  / /|_/ /   \__ \ " -ForegroundColor Blue
Write-Host " / ___ | / _, _/  / /  / /   ___/ / " -ForegroundColor Magenta
Write-Host "/_/  |_|/_/ |_|  /_/  /_/   /____/  " -ForegroundColor Magenta

Write-Host "`n ===================================================================" -ForegroundColor DarkGray
Write-Host "   A R M S  ::  Autonomous Robotic Management System" -ForegroundColor White
Write-Host "   Orchestration Layer & Fleet Intelligence Platform" -ForegroundColor DarkCyan
Write-Host " ===================================================================`n" -ForegroundColor DarkGray

# Resolve root directory reliably
$rootDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
$backendDir = Join-Path $rootDir "backend"
$frontendDir = Join-Path $rootDir "frontend"

# Launch Backend (FastAPI on http://localhost:8000)
Write-Host " [1/2] " -NoNewline -ForegroundColor Cyan
Write-Host ">>> Launching ARMS Core Engine (FastAPI on :8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle = 'ARMS Core Backend [FastAPI]'; Set-Location -LiteralPath '$backendDir'; Write-Host '===================================================' -ForegroundColor Yellow; Write-Host '  ARMS Backend Engine :: http://localhost:8000' -ForegroundColor Yellow; Write-Host '===================================================' -ForegroundColor Yellow; python -m uvicorn app.main:app --reload --port 8000"

# Launch Frontend (Vite on http://localhost:5173)
Write-Host " [2/2] " -NoNewline -ForegroundColor Cyan
Write-Host ">>> Launching ARMS Control Portal (Vite React on :5173)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle = 'ARMS Control Portal [React/Vite]'; Set-Location -LiteralPath '$frontendDir'; Write-Host '===================================================' -ForegroundColor Green; Write-Host '  ARMS Control Portal :: http://localhost:5173' -ForegroundColor Green; Write-Host '===================================================' -ForegroundColor Green; npm run dev"

Write-Host "`n -------------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host " [SUCCESS] Fleet Management Services Active!" -ForegroundColor Green
Write-Host "   -> API Swagger Docs : " -NoNewline -ForegroundColor White
Write-Host "http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host "   -> Control Dashboard: " -NoNewline -ForegroundColor White
Write-Host "http://localhost:5173" -ForegroundColor Green
Write-Host " -------------------------------------------------------------------`n" -ForegroundColor DarkGray
