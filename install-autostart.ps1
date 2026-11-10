# Keeps the whole ERP live on this PC: registers two Windows Task Scheduler tasks for the current user.
#
#   SilverMullerSeals-Backend   -> backend\run.ps1 -AutoStart        (API, http://localhost:4000)
#   SilverMullerSeals-Frontend  -> frontend\run-frontend.ps1 -AutoStart (UI, http://127.0.0.1:5173)
#
# Each task runs hidden, starts 30s after Windows sign-in, AND re-checks every 2 minutes. The scripts are
# supervisors that restart their server on crash or hang; the 2-minute check brings the supervisor itself back if
# it is ever killed (Task Manager, a closed window, a tool freeing memory, a crash). A check while it is already
# running does nothing (single-instance lock). A deliberate stop (stop-all.ps1 / stop-backend.ps1 /
# stop-frontend.ps1) is respected until you start it again with start-dev.ps1.
#
# Usage (normal PowerShell window in the project folder; no administrator rights needed):
#   .\install-autostart.ps1            # register (or update) both tasks
#   .\install-autostart.ps1 -StartNow  # register and start both now
# Remove with .\uninstall-autostart.ps1

param([switch]$StartNow)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$user = "$env:USERDOMAIN\$env:USERNAME"

$apps = @(
  @{ Name = "SilverMullerSeals-Backend";  Script = Join-Path $root "backend\run.ps1";            Dir = Join-Path $root "backend";
     Desc = "Silver Muller Seals: keeps the backend API running (backend\run.ps1). Starts at sign-in, re-checked every 2 minutes." },
  @{ Name = "SilverMullerSeals-Frontend"; Script = Join-Path $root "frontend\run-frontend.ps1"; Dir = Join-Path $root "frontend";
     Desc = "Silver Muller Seals: keeps the frontend running (frontend\run-frontend.ps1). Starts at sign-in, re-checked every 2 minutes." }
)

# conhost --headless (Windows 10 21H2+/11) runs PowerShell with no window at all - not even a flash.
$useHeadless = Test-Path "$env:WINDIR\System32\conhost.exe"

foreach ($app in $apps) {
  if (-not (Test-Path $app.Script)) { throw "$($app.Script) not found." }
  $psArgs = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$($app.Script)`" -AutoStart"
  if ($useHeadless) {
    $action = New-ScheduledTaskAction -Execute "$env:WINDIR\System32\conhost.exe" -Argument "--headless powershell.exe $psArgs" -WorkingDirectory $app.Dir
  } else {
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $psArgs -WorkingDirectory $app.Dir
  }

  $atLogOn = New-ScheduledTaskTrigger -AtLogOn -User $user
  $atLogOn.Delay = "PT30S"   # let PostgreSQL and the network come up first
  # Keep-alive: every 2 minutes, forever. Omitting -RepetitionDuration means "indefinitely".
  $keepAlive = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 2)

  $settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) `
    -StartWhenAvailable -MultipleInstances IgnoreNew
  $principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited

  Register-ScheduledTask -TaskName $app.Name -Action $action -Trigger @($atLogOn, $keepAlive) -Settings $settings `
    -Principal $principal -Force -Description $app.Desc | Out-Null
  Write-Host "Registered '$($app.Name)' (sign-in + every 2 minutes, hidden)."
}

if ($StartNow) {
  Remove-Item -Force (Join-Path $root "backend\logs\stopped.flag"), (Join-Path $root "frontend\logs\stopped.flag") -ErrorAction SilentlyContinue
  foreach ($app in $apps) { Start-ScheduledTask -TaskName $app.Name }
  Write-Host "Started. Backend needs about a minute: http://localhost:4000/api/health  -  UI: http://127.0.0.1:5173"
}
Write-Host "Logs: backend\logs and frontend\logs (supervisor.log in each)."
