# Stops the backend supervisor (run.ps1) and the API it runs, whether it was started by the auto-start task
# or from a window. Use this instead of killing java.exe by hand: killing only the API makes the supervisor
# start it again, which is the point of the restart policy.

$ErrorActionPreference = "Stop"
$taskName = "SilverMullerSeals-Backend"
$runScript = (Join-Path $PSScriptRoot "run.ps1")

# Tell the auto-start keep-alive check (every 2 minutes) that this stop is deliberate, so it does not restart it.
# Running run.ps1 by hand, or start-dev.ps1, clears the flag.
New-Item -ItemType Directory -Force -Path (Join-Path $PSScriptRoot "logs") | Out-Null
Set-Content -Path (Join-Path $PSScriptRoot "logs\stopped.flag") -Value (Get-Date -Format s) -Encoding ASCII

$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($task -and $task.State -eq "Running") {
  Stop-ScheduledTask -TaskName $taskName
  Write-Host "Stopped scheduled task '$taskName'."
}

# Supervisor processes, killed with their child tree (cmd -> maven -> API):
#  1. the PID run.ps1 records in logs\supervisor.pid (works however run.ps1 was started), and
#  2. any powershell whose command line names this folder's run.ps1 (e.g. the auto-start task).
$supervisorIds = @()
$pidFile = Join-Path $PSScriptRoot "logs\supervisor.pid"
if (Test-Path $pidFile) {
  $recorded = (Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
  if ($recorded -match '^\d+$') {
    $p = Get-CimInstance Win32_Process -Filter "ProcessId = $recorded" -ErrorAction SilentlyContinue
    if ($p -and $p.Name -in @('powershell.exe', 'pwsh.exe')) { $supervisorIds += [int]$recorded }
  }
}
$supervisorIds += Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe' OR Name = 'pwsh.exe'" |
  Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -and $_.CommandLine -like "*$runScript*" } |
  ForEach-Object { [int]$_.ProcessId }
foreach ($id in ($supervisorIds | Sort-Object -Unique)) {
  & taskkill.exe /PID $id /T /F 2>$null | Out-Null
  Write-Host "Stopped supervisor PID $id."
}
Remove-Item -Force $pidFile -ErrorAction SilentlyContinue

# Anything of this project still on the API port (e.g. a backend started some other way).
$port = if ($env:PORT) { [int]$env:PORT } else { 4000 }
$c = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1
if ($c) {
  $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId = $($c.OwningProcess)").CommandLine
  if ($cmd -match 'silver-muller-seals|seals-backend|SealsApplication') {
    & taskkill.exe /PID $c.OwningProcess /T /F 2>$null | Out-Null
    Write-Host "Stopped backend on port $port (PID $($c.OwningProcess))."
  } else {
    Write-Host "Port $port is used by another program (PID $($c.OwningProcess)); left it running."
  }
}
Write-Host "Backend stopped."
