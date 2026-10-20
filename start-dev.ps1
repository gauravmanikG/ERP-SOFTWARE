# Starts both Spring Boot backend (port 4000) and Vite frontend (port 5173) against PostgreSQL (port 5434).

$root = $PSScriptRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Silver Muller Seals - ERP System Development Starter" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "1. PostgreSQL Target: localhost:5434/sms_seals" -ForegroundColor Yellow
Write-Host "2. Backend API:       http://localhost:4000" -ForegroundColor Yellow
Write-Host "3. Frontend UI:        http://localhost:5173" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

# Start Spring Boot in a separate window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend'; .\run.ps1"

# Start Vite in the current or new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\frontend'; npm run dev"

Write-Host "Both Backend and Frontend dev servers launched successfully!" -ForegroundColor Green
