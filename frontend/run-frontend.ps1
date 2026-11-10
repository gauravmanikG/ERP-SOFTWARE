# Keeps port 5173 answering - the frontend twin of backend\run.ps1.
#
# Two modes, picked at every (re)start:
#   - Production (a release is installed: ..\release\seals-backend.jar, made by ..\release.ps1): the backend
#     serves the built ERP on port 4000, so 5173 only redirects there (scripts\redirect-to-backend.mjs).
#   - Development (no release, or SMS_MODE=dev): the Vite dev server with live reload (npm run dev).
#
#   - If the dev server exits for any reason it is started again (10s, then backing off to 60s in a crash loop).
#   - If it is running but stops answering http://127.0.0.1:5173/ (3 checks in a row, 15s apart, after a
#     startup grace period) it is treated as hung, stopped and started again.
#   - Only one copy runs at a time (manual run and the auto-start task cannot double-start).
#   - -AutoStart (used by the auto-start task) does nothing after a deliberate stop-frontend.ps1.
#
# Logs: frontend\logs\supervisor.log and frontend\logs\vite-<time>.out.log / .err.log (last 10 runs kept).
# Stop: Ctrl+C in this window, or frontend\stop-frontend.ps1.

param([switch]$AutoStart)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$logDir = Join-Path $PSScriptRoot "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$stopFlag = Join-Path $logDir "stopped.flag"
if ($AutoStart -and (Test-Path $stopFlag)) { exit 0 }
if (-not $AutoStart) { Remove-Item -Force $stopFlag -ErrorAction SilentlyContinue }

$port                 = 5173
$liveUrl              = "http://127.0.0.1:$port/"
$releaseJar           = Join-Path $PSScriptRoot "..\release\seals-backend.jar"
$checkIntervalSeconds = 15
$failuresBeforeKill   = 3
$startupGraceSeconds  = 180
$minDelaySeconds      = 10
$maxDelaySeconds      = 60
$stableRunSeconds     = 120
$keepRunLogs          = 10
$supervisorLog = Join-Path $logDir "supervisor.log"

function Write-Log([string]$message) {
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $message
  Write-Host $line
  try {
    if ((Test-Path $supervisorLog) -and (Get-Item $supervisorLog).Length -gt 5MB) { Move-Item -Force $supervisorLog "$supervisorLog.1" }
  } catch { }
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($line + [Environment]::NewLine)
  for ($i = 0; $i -lt 5; $i++) {
    try {
      $fs = [System.IO.File]::Open($supervisorLog, 'Append', 'Write', 'ReadWrite')
      try { $fs.Write($bytes, 0, $bytes.Length) } finally { $fs.Dispose() }
      return
    } catch { Start-Sleep -Milliseconds 200 }
  }
}

function Test-Live {
  try { return (Invoke-WebRequest -Uri $liveUrl -UseBasicParsing -TimeoutSec 10).StatusCode -eq 200 } catch { return $false }
}

function Get-PortOwner {
  $c = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($c) { return [int]$c.OwningProcess }
  return $null
}

function Stop-Tree([int]$processId) { & taskkill.exe /PID $processId /T /F 2>$null | Out-Null }

# ------------------------------------------------------------------ single instance
$mutex = New-Object System.Threading.Mutex($false, "Local\SilverMullerSealsFrontendSupervisor")
$haveMutex = $false
try { $haveMutex = $mutex.WaitOne(0) } catch [System.Threading.AbandonedMutexException] { $haveMutex = $true }
if (-not $haveMutex) {
  Write-Host "The frontend supervisor is already running. Open $liveUrl, or stop it first with frontend\stop-frontend.ps1."
  exit 0
}

$pidFile = Join-Path $logDir "supervisor.pid"
Set-Content -Path $pidFile -Value $PID -Encoding ASCII
Write-Log "Supervisor started (PID $PID). Frontend: $liveUrl"

if (-not (Test-Path (Join-Path $PSScriptRoot "node_modules"))) {
  Write-Log "node_modules missing; running npm install once."
  & cmd.exe /c "npm install" | Out-Null
}

# The supervised server must not open a new browser tab on every (re)start (vite.config.js reads this).
$env:SMS_NO_BROWSER_OPEN = "1"

$proc = $null
$attempt = 0
$delay = $minDelaySeconds
try {
  while ($true) {
    $owner = Get-PortOwner
    if ($owner) {
      $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId = $owner" -ErrorAction SilentlyContinue).CommandLine
      if ($cmd -and $cmd -match 'vite|redirect-to-backend') {
        Write-Log "Found an unmanaged frontend server on port $port (PID $owner); stopping it so this supervisor manages it."
        Stop-Tree $owner
        Start-Sleep -Seconds 3
      } else {
        Write-Log "Port $port is used by another program (PID $owner). Waiting 30s before trying again."
        Start-Sleep -Seconds 30
        continue
      }
    }

    $attempt++
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $outLog = Join-Path $logDir "vite-$stamp.out.log"
    $errLog = Join-Path $logDir "vite-$stamp.err.log"
    Get-ChildItem $logDir -Filter "vite-*.out.log" | Sort-Object LastWriteTime -Descending | Select-Object -Skip $keepRunLogs |
      ForEach-Object { Remove-Item -Force $_.FullName, ($_.FullName -replace '\.out\.log$', '.err.log') -ErrorAction SilentlyContinue }

    $production = (Test-Path $releaseJar) -and ($env:SMS_MODE -ne "dev")
    if ($production) {
      $liveUrl = "http://127.0.0.1:$port/__health"
      $arguments = '/c', 'node', 'scripts\redirect-to-backend.mjs'
      Write-Log "Starting the redirect to port 4000 (production mode, attempt $attempt). Output: $outLog"
    } else {
      $liveUrl = "http://127.0.0.1:$port/"
      $arguments = '/c', 'npm', 'run', 'dev', '--', '--strictPort'
      Write-Log "Starting the Vite dev server (development mode, attempt $attempt). Output: $outLog"
    }
    $proc = Start-Process -FilePath "cmd.exe" -ArgumentList $arguments `
      -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru `
      -RedirectStandardOutput $outLog -RedirectStandardError $errLog
    $null = $proc.Handle
    $startedAt = Get-Date
    $everLive = $false
    $failures = 0
    $hung = $false

    while (-not $proc.HasExited) {
      Start-Sleep -Seconds $checkIntervalSeconds
      if ($proc.HasExited) { break }
      if (Test-Live) {
        if (-not $everLive) { Write-Log ("Frontend is up after {0:N0}s." -f ((Get-Date) - $startedAt).TotalSeconds); $everLive = $true }
        elseif ($failures -gt 0) { Write-Log "Frontend is answering again." }
        $failures = 0
        continue
      }
      if (-not $everLive -and ((Get-Date) - $startedAt).TotalSeconds -lt $startupGraceSeconds) { continue }
      $failures++
      Write-Log "Liveness check failed ($failures/$failuresBeforeKill)."
      if ($failures -ge $failuresBeforeKill) {
        Write-Log "Frontend is not responding; stopping it so it can be restarted."
        $hung = $true
        Stop-Tree $proc.Id
        break
      }
    }

    $proc.WaitForExit(15000) | Out-Null
    $ranSeconds = ((Get-Date) - $startedAt).TotalSeconds
    $exitCode = if ($hung) { "killed by watchdog" } else { "exit code $($proc.ExitCode)" }
    $owner = Get-PortOwner
    if ($owner) { Stop-Tree $owner }

    $crashLoop = (-not $everLive) -and ($ranSeconds -lt $stableRunSeconds)
    if (-not $crashLoop) { $delay = $minDelaySeconds }
    Write-Log ("Frontend stopped ({0}) after {1:N0}s. Restarting in {2}s." -f $exitCode, $ranSeconds, $delay)
    Start-Sleep -Seconds $delay
    if ($crashLoop) { $delay = [Math]::Min($delay * 2, $maxDelaySeconds) }
  }
}
finally {
  if ($proc -and -not $proc.HasExited) {
    Write-Log "Supervisor stopping; stopping frontend (PID $($proc.Id))."
    Stop-Tree $proc.Id
  }
  Write-Log "Supervisor stopped."
  Remove-Item -Force $pidFile -ErrorAction SilentlyContinue
  if ($haveMutex) { try { $mutex.ReleaseMutex() } catch { } }
}
