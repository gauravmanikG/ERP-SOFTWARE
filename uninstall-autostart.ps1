# Removes both auto-start tasks created by install-autostart.ps1 and stops the backend and frontend.

$ErrorActionPreference = "Stop"
& (Join-Path $PSScriptRoot "stop-all.ps1")
foreach ($name in @("SilverMullerSeals-Backend", "SilverMullerSeals-Frontend")) {
  if (Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $name -Confirm:$false
    Write-Host "Removed scheduled task '$name'."
  }
}
Write-Host "Auto-start removed. Start the app by hand with .\start-dev.ps1."
