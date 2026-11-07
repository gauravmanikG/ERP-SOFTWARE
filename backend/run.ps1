# Starts the Spring Boot API against local PostgreSQL on port 5434
# (persistent Windows service postgresql-x64-18) and keeps it running.
#
# Restart policy (supervisor + watchdog):
#   - If the API process exits for any reason (crash, out of memory, killed, database down at startup),
#     it is started again. Quick repeated failures back off: 10s, 20s, 40s, then every 60s.
#   - If the API is running but stops answering GET /api/health/live (3 checks in a row, 15s apart,
#     after a startup grace period), it is treated as hung: stopped and started again.
#   - A database outage alone does NOT trigger a restart (/api/health/live never touches the database;
#     the connection pool reconnects by itself once PostgreSQL is back).
#   - Only one supervisor runs at a time (manual run and the auto-start task cannot double-start).
#
# Logs: backend\logs\supervisor.log (restart events) and backend\logs\backend-<time>.out.log / .err.log
# (API output, last 10 runs kept).
# Stop: press Ctrl+C in this window. If it runs from the auto-start task, stop it with backend\stop-backend.ps1.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (Test-Path .env) {
  Get-Content .env | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
    $name, $value = $_ -split '=', 2
    Set-Item -Path "Env:$($name.Trim())" -Value $value.Trim()
  }
}

if (-not $env:SPRING_DATASOURCE_URL) {
  $env:SPRING_DATASOURCE_URL = "jdbc:postgresql://localhost:5434/sms_seals"
}
if (-not $env:SPRING_DATASOURCE_USERNAME) {
  $env:SPRING_DATASOURCE_USERNAME = "postgres"
}
if (-not $env:SPRING_DATASOURCE_PASSWORD) {
  $env:SPRING_DATASOURCE_PASSWORD = "postgres"
}
if (-not $env:PORT) {
  $env:PORT = "4000"
}

# ------------------------------------------------------------------ settings
$port                 = [int]$env:PORT
$liveUrl              = "http://localhost:$port/api/health/live"
$checkIntervalSeconds = 15    # how often the watchdog checks the API
$failuresBeforeKill   = 3     # consecutive failed checks before a running API counts as hung
$startupGraceSeconds  = 300   # time allowed for build + startup before the watchdog may act
$minDelaySeconds      = 10    # restart delay after a normal run
$maxDelaySeconds      = 60    # restart delay cap during a crash loop
$stableRunSeconds     = 120   # a run at least this long resets the crash-loop backoff
$keepRunLogs          = 10

$logDir = Join-Path $PSScriptRoot "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$supervisorLog = Join-Path $logDir "supervisor.log"

function Write-Log([string]$message) {
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $message
  Write-Host $line
  try {
    if ((Test-Path $supervisorLog) -and (Get-Item $supervisorLog).Length -gt 5MB) {
      Move-Item -Force $supervisorLog "$supervisorLog.1"
    }
  } catch { }
  # Open with shared read/write so an editor or tail reading the log never makes a write fail; retry briefly.
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($line + [Environment]::NewLine)
  for ($i = 0; $i -lt 5; $i++) {
    try {
      $fs = [System.IO.File]::Open($supervisorLog, 'Append', 'Write', 'ReadWrite')
      try { $fs.Write($bytes, 0, $bytes.Length) } finally { $fs.Dispose() }
      return
    } catch {
      Start-Sleep -Milliseconds 200
    }
  }
}

function Test-Live {
  try {
    $r = Invoke-WebRequest -Uri $liveUrl -UseBasicParsing -TimeoutSec 10
    return $r.StatusCode -eq 200
  } catch {
    return $false
  }
}

function Get-PortOwner {
  $c = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($c) { return [int]$c.OwningProcess }
  return $null
}

function Stop-Tree([int]$processId) {
  # Kills cmd -> maven -> forked application JVM together.
  & taskkill.exe /PID $processId /T /F 2>$null | Out-Null
}

function Remove-OldRunLogs {
  Get-ChildItem $logDir -Filter "backend-*.out.log" | Sort-Object LastWriteTime -Descending |
    Select-Object -Skip $keepRunLogs | ForEach-Object {
      Remove-Item -Force $_.FullName -ErrorAction SilentlyContinue
      Remove-Item -Force ($_.FullName -replace '\.out\.log$', '.err.log') -ErrorAction SilentlyContinue
    }
}

# ------------------------------------------------------------------ single instance
$mutex = New-Object System.Threading.Mutex($false, "Local\SilverMullerSealsBackendSupervisor")
$haveMutex = $false
try { $haveMutex = $mutex.WaitOne(0) } catch [System.Threading.AbandonedMutexException] { $haveMutex = $true }
if (-not $haveMutex) {
  Write-Host "The backend supervisor is already running (auto-start task or another window). Nothing to do."
  Write-Host "Check http://localhost:$port/api/health, or stop it first with backend\stop-backend.ps1."
  exit 0
}

$pidFile = Join-Path $logDir "supervisor.pid"
Set-Content -Path $pidFile -Value $PID -Encoding ASCII   # lets stop-backend.ps1 find this supervisor
Write-Log "Supervisor started (PID $PID). Database: $env:SPRING_DATASOURCE_URL. API port: $port."

$proc = $null
$attempt = 0
$delay = $minDelaySeconds
try {
  while ($true) {
    # Port already taken? We hold the supervisor lock, so a backend of this project on the port is an orphan
    # (e.g. its window was closed): take it over. Anything else (Docker, another app) is left alone.
    $owner = Get-PortOwner
    if ($owner) {
      $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId = $owner" -ErrorAction SilentlyContinue).CommandLine
      if ($cmd -and $cmd -match 'silver-muller-seals|seals-backend|SealsApplication') {
        Write-Log "Found an unmanaged backend on port $port (PID $owner); stopping it so this supervisor manages it."
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
    $outLog = Join-Path $logDir "backend-$stamp.out.log"
    $errLog = Join-Path $logDir "backend-$stamp.err.log"
    Remove-OldRunLogs

    Write-Log "Starting backend (attempt $attempt). Output: $outLog"
    # ExitOnOutOfMemoryError: an out-of-memory JVM exits (and is restarted) instead of limping along.
    $proc = Start-Process -FilePath "cmd.exe" `
      -ArgumentList '/c', 'mvn', '-B', 'spring-boot:run', '"-Dspring-boot.run.jvmArguments=-XX:+ExitOnOutOfMemoryError"' `
      -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru `
      -RedirectStandardOutput $outLog -RedirectStandardError $errLog
    $null = $proc.Handle   # keeps the exit code readable after the process ends
    $startedAt = Get-Date
    $everLive = $false
    $failures = 0
    $hung = $false

    while (-not $proc.HasExited) {
      Start-Sleep -Seconds $checkIntervalSeconds
      if ($proc.HasExited) { break }
      if (Test-Live) {
        if (-not $everLive) {
          Write-Log ("Backend is up after {0:N0}s." -f ((Get-Date) - $startedAt).TotalSeconds)
          $everLive = $true
        } elseif ($failures -gt 0) {
          Write-Log "Backend is answering again."
        }
        $failures = 0
        continue
      }
      if (-not $everLive -and ((Get-Date) - $startedAt).TotalSeconds -lt $startupGraceSeconds) { continue }
      $failures++
      Write-Log "Liveness check failed ($failures/$failuresBeforeKill)."
      if ($failures -ge $failuresBeforeKill) {
        Write-Log "Backend is not responding; stopping it so it can be restarted."
        $hung = $true
        Stop-Tree $proc.Id
        break
      }
    }

    $proc.WaitForExit(15000) | Out-Null
    $ranSeconds = ((Get-Date) - $startedAt).TotalSeconds
    $exitCode = if ($hung) { "killed by watchdog" } else { "exit code $($proc.ExitCode)" }

    # Make sure nothing from this run still holds the port.
    $owner = Get-PortOwner
    if ($owner) { Stop-Tree $owner }

    # Backoff only for a crash loop: a run that came up healthy, or ran a while, resets the delay.
    $crashLoop = (-not $everLive) -and ($ranSeconds -lt $stableRunSeconds)
    if (-not $crashLoop) { $delay = $minDelaySeconds }
    Write-Log ("Backend stopped ({0}) after {1:N0}s. Restarting in {2}s." -f $exitCode, $ranSeconds, $delay)
    Start-Sleep -Seconds $delay
    if ($crashLoop) { $delay = [Math]::Min($delay * 2, $maxDelaySeconds) }
  }
}
finally {
  # Ctrl+C or the task being stopped: do not leave a hidden backend running without its supervisor.
  if ($proc -and -not $proc.HasExited) {
    Write-Log "Supervisor stopping; stopping backend (PID $($proc.Id))."
    Stop-Tree $proc.Id
  }
  Write-Log "Supervisor stopped."
  Remove-Item -Force $pidFile -ErrorAction SilentlyContinue
  if ($haveMutex) { try { $mutex.ReleaseMutex() } catch { } }
}
