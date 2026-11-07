# Removes the auto-start task created by install-autostart.ps1 and stops the backend it started.

$ErrorActionPreference = "Stop"
$taskName = "SilverMullerSeals-Backend"

if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
  & (Join-Path $PSScriptRoot "stop-backend.ps1")
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
  Write-Host "Removed scheduled task '$taskName'. The backend will no longer start at sign-in."
} else {
  Write-Host "Scheduled task '$taskName' is not installed."
}
