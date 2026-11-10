# Stops the frontend supervisor (run-frontend.ps1) and the Vite server it runs, and tells the auto-start
# keep-alive check not to bring it back until run-frontend.ps1 / start-dev.ps1 is run again.

$ErrorActionPreference = "Stop"
$taskName = "SilverMullerSeals-Frontend"
$runScript = Join-Path $PSScriptRoot "run-frontend.ps1"
$logDir = Join-Path $PSScriptRoot "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
Set-Content -Path (Join-Path $logDir "stopped.flag") -Value (Get-Date -Format s) -Encoding ASCII

$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($task -and $task.State -eq "Running") { Stop-ScheduledTask -TaskName $taskName }

$ids = @()
$pidFile = Join-Path $logDir "supervisor.pid"
if (Test-Path $pidFile) {
  $recorded = (Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
  if ($recorded -match '^\d+$') {
    $p = Get-CimInstance Win32_Process -Filter "ProcessId = $recorded" -ErrorAction SilentlyContinue
    if ($p -and $p.Name -in @('powershell.exe', 'pwsh.exe')) { $ids += [int]$recorded }
  }
}
$ids += Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe' OR Name = 'pwsh.exe'" |
  Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -and $_.CommandLine -like "*$runScript*" } |
  ForEach-Object { [int]$_.ProcessId }
foreach ($id in ($ids | Sort-Object -Unique)) {
  & taskkill.exe /PID $id /T /F 2>$null | Out-Null
  Write-Host "Stopped frontend supervisor PID $id."
}
Remove-Item -Force $pidFile -ErrorAction SilentlyContinue

$c = Get-NetTCPConnection -State Listen -LocalPort 5173 -ErrorAction SilentlyContinue | Select-Object -First 1
if ($c) {
  $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId = $($c.OwningProcess)").CommandLine
  if ($cmd -match 'vite') {
    & taskkill.exe /PID $c.OwningProcess /T /F 2>$null | Out-Null
    Write-Host "Stopped Vite on port 5173 (PID $($c.OwningProcess))."
  }
}
Write-Host "Frontend stopped."
