# Registers a Windows Task Scheduler task that starts the backend supervisor (run.ps1) hidden whenever this
# user signs in to Windows. run.ps1 then keeps the API running (restart on crash / hang).
#
# Usage (normal PowerShell window, from the backend folder):
#   .\install-autostart.ps1            # register the task
#   .\install-autostart.ps1 -StartNow  # register and start it immediately
# Remove it again with .\uninstall-autostart.ps1. No administrator rights are needed for the current user.

param([switch]$StartNow)

$ErrorActionPreference = "Stop"
$taskName = "SilverMullerSeals-Backend"
$runScript = Join-Path $PSScriptRoot "run.ps1"
if (-not (Test-Path $runScript)) { throw "run.ps1 not found next to this script ($runScript)." }

$user = "$env:USERDOMAIN\$env:USERNAME"

$action = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$runScript`"" `
  -WorkingDirectory $PSScriptRoot

# Start 30 seconds after sign-in so PostgreSQL and the network are up first.
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $user
$trigger.Delay = "PT30S"

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit ([TimeSpan]::Zero) `
  -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) `
  -StartWhenAvailable -MultipleInstances IgnoreNew

$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings `
  -Principal $principal -Force `
  -Description "Silver Muller Seals: starts the backend API at sign-in and keeps it running (backend\run.ps1)." | Out-Null

Write-Host "Registered scheduled task '$taskName' for $user (runs at sign-in, hidden)."
if ($StartNow) {
  Start-ScheduledTask -TaskName $taskName
  Write-Host "Started. The API needs about a minute; then check http://localhost:4000/api/health"
}
Write-Host "Logs: $(Join-Path $PSScriptRoot 'logs')"
