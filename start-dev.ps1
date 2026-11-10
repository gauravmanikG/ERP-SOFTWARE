# Starts the backend (port 4000) and the frontend (port 5173) against PostgreSQL (port 5434), both under their
# supervisors so they restart by themselves if they crash or hang.
#
# Production mode (a release is installed by .\release.ps1): the backend runs release\seals-backend.jar and serves
# the ERP itself on http://localhost:4000/; port 5173 only redirects there.
# Development mode (no release, or SMS_MODE=dev): Maven runs the backend from source, Vite serves the screens on 5173.
#
# If the auto-start tasks are installed (.\install-autostart.ps1) they are used: both run hidden, independent of
# any window, and are re-checked every 2 minutes. Otherwise each supervisor opens in its own window.

$root = $PSScriptRoot
$production = (Test-Path "$root\release\seals-backend.jar") -and ($env:SMS_MODE -ne "dev")
$openUrl = if ($production) { "http://localhost:4000/" } else { "http://127.0.0.1:5173" }

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Silver Muller Seals - ERP System Starter" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "1. PostgreSQL Target: localhost:5434/sms_seals" -ForegroundColor Yellow
if ($production) {
  Write-Host "2. Mode:              production (release\seals-backend.jar)" -ForegroundColor Yellow
  Write-Host "3. ERP:               http://localhost:4000/  (5173 redirects here)" -ForegroundColor Yellow
} else {
  Write-Host "2. Mode:              development (Maven + Vite)" -ForegroundColor Yellow
  Write-Host "3. Backend API:       http://localhost:4000   Frontend UI: http://127.0.0.1:5173" -ForegroundColor Yellow
}
Write-Host "==========================================================" -ForegroundColor Cyan

# A deliberate stop is over once you start again.
Remove-Item -Force "$root\backend\logs\stopped.flag", "$root\frontend\logs\stopped.flag" -ErrorAction SilentlyContinue

$tasks = @("SilverMullerSeals-Backend", "SilverMullerSeals-Frontend")
$installed = @($tasks | Where-Object { Get-ScheduledTask -TaskName $_ -ErrorAction SilentlyContinue })
if ($installed.Count -eq $tasks.Count) {
  foreach ($t in $tasks) { Start-ScheduledTask -TaskName $t }
  Write-Host "Started both through the auto-start tasks (hidden, self-healing)." -ForegroundColor Green
  Write-Host "Logs: backend\logs\supervisor.log and frontend\logs\supervisor.log"
} else {
  Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "`"$root\backend\run.ps1`""
  Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "`"$root\frontend\run-frontend.ps1`""
  Write-Host "Started both in their own windows (closing a window stops that server)." -ForegroundColor Green
  Write-Host "To keep them running without windows, run .\install-autostart.ps1 -StartNow once." -ForegroundColor Yellow
}
Write-Host "The backend needs up to a minute. Then open $openUrl"
