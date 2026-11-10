# Builds a production release of the whole ERP and runs it on this PC: http://<this-pc>:4000/
#
#   .\release.ps1               build, test, install and verify (about 2-4 minutes; the ERP is down ~30 s)
#   .\release.ps1 -FullTests    also run every database test first (backend\test-db.ps1, ~10 minutes)
#   .\release.ps1 -BuildOnly    only build and check release\seals-backend.new.jar; nothing is stopped
#   .\release.ps1 -Rollback     go back to the previous release
#
# What it does:
#   1. Builds the screens (frontend\dist, minified, one file per screen) after the documentation check.
#   2. Packages one jar with the API and the screens inside (mvn clean package in release\build, unit tests).
#   3. Checks the jar really contains the screens.
#   4. Stops the backend and frontend supervisors, keeps the running jar as release\seals-backend.previous.jar,
#      installs the new one as release\seals-backend.jar, and starts both again. With a release installed,
#      backend\run.ps1 runs the jar (production mode) and frontend\run-frontend.ps1 turns port 5173 into a
#      redirect to port 4000.
#   5. Waits until the new release answers (health check + ERP page). If it does not within 4 minutes, the
#      previous release is put back automatically.
#
# The database is never touched by this script; start-up only runs the usual safe migrations
# (docs/startup-data-rules.md). Going back to development mode: see docs/hosting.md.

param([switch]$FullTests, [switch]$BuildOnly, [switch]$Rollback)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$releaseDir = Join-Path $root "release"
$current = Join-Path $releaseDir "seals-backend.jar"
$previous = Join-Path $releaseDir "seals-backend.previous.jar"
$staged = Join-Path $releaseDir "seals-backend.new.jar"
$info = Join-Path $releaseDir "release.txt"
$port = 4000

function Step([string]$text) { Write-Host ""; Write-Host "== $text" -ForegroundColor Cyan }
function Fail([string]$text) { Write-Host "RELEASE FAILED: $text" -ForegroundColor Red; exit 1 }

function Invoke-Native([string]$what, [scriptblock]$block) {
  # Native tools write progress to stderr; only the exit code decides success.
  $ErrorActionPreference = "Continue"
  & $block
  $code = $LASTEXITCODE
  $ErrorActionPreference = "Stop"
  if ($code -ne 0) { Fail "$what (exit code $code)" }
}

function Test-Release {
  # Healthy = the API is live AND "/" serves the ERP page (not the API-only summary).
  try {
    $live = Invoke-WebRequest -Uri "http://localhost:$port/api/health/live" -UseBasicParsing -TimeoutSec 10
    if ($live.StatusCode -ne 200) { return $false }
    $page = Invoke-WebRequest -Uri "http://localhost:$port/" -UseBasicParsing -TimeoutSec 10
    return ($page.StatusCode -eq 200) -and ($page.Headers["Content-Type"] -like "text/html*") -and ($page.Content -match '<div id="root">')
  } catch { return $false }
}

function Wait-Healthy([int]$seconds) {
  $deadline = (Get-Date).AddSeconds($seconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-Release) { return $true }
    Start-Sleep -Seconds 5
  }
  return $false
}

function Stop-App {
  & (Join-Path $root "stop-all.ps1") | Out-Null
  # Wait until port 4000 is free so the copy below is not blocked by a running jar.
  for ($i = 0; $i -lt 30 -and (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue); $i++) { Start-Sleep -Seconds 1 }
}

function Start-App { & (Join-Path $root "start-dev.ps1") | Out-Null }

New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null

# ------------------------------------------------------------------ rollback
if ($Rollback) {
  if (-not (Test-Path $previous)) { Fail "There is no previous release ($previous)." }
  Step "Going back to the previous release"
  Stop-App
  $swap = Join-Path $releaseDir "seals-backend.swap.jar"
  if (Test-Path $current) { Move-Item -Force $current $swap }
  Move-Item -Force $previous $current
  if (Test-Path $swap) { Move-Item -Force $swap $previous }
  Start-App
  if (Wait-Healthy 240) { Write-Host "Previous release is running: http://localhost:$port/" -ForegroundColor Green; exit 0 }
  Fail "The previous release did not answer either. See backend\logs\supervisor.log."
}

# ------------------------------------------------------------------ build
foreach ($tool in "node", "npm", "java", "mvn") {
  if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { Fail "$tool is not installed or not on PATH." }
}

Step "1/5 Building the screens (frontend)"
Push-Location (Join-Path $root "frontend")
try {
  if (-not (Test-Path "node_modules")) { Invoke-Native "npm ci" { npm ci --no-audit --no-fund } }
  Invoke-Native "Documentation check" { npm run docs:check }
  Invoke-Native "Frontend build" { npm run build }
  if (-not (Test-Path "dist\index.html")) { Fail "frontend\dist\index.html was not produced." }
} finally { Pop-Location }

if ($FullTests) {
  Step "Running every backend test on throwaway databases"
  Invoke-Native "Full test suite" { & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root "backend\test-db.ps1") }
}

Step "2/5 Packaging the API and screens into one jar (runs the unit tests)"
# Built in release\build (not backend\target), so a backend running in development mode is not disturbed.
$buildDir = Join-Path $releaseDir "build"
Push-Location (Join-Path $root "backend")
try {
  if (-not $env:MAVEN_OPTS) { $env:MAVEN_OPTS = "-Xmx512m" }
  Invoke-Native "Maven package" { mvn -B -q clean package "-Dsms.build.dir=$buildDir" }
} finally { Pop-Location }
$built = Join-Path $buildDir "seals-backend.jar"
if (-not (Test-Path $built)) { Fail "$built was not produced." }

Step "3/5 Checking the jar"
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($built)
try {
  $names = $zip.Entries | ForEach-Object FullName
  if ($names -notcontains "BOOT-INF/classes/static/index.html") { Fail "The jar has no ERP screens (static/index.html missing)." }
  $assets = @($names | Where-Object { $_ -like "BOOT-INF/classes/static/assets/*.js" }).Count
  if ($assets -lt 5) { Fail "The jar has only $assets script files; the frontend build looks incomplete." }
} finally { $zip.Dispose() }
Copy-Item -Force $built $staged
$commit = (& git -C $root rev-parse --short HEAD 2>$null)
$dirty = if (& git -C $root status --porcelain 2>$null) { " (with uncommitted changes)" } else { "" }
Write-Host "OK: screens and $assets script files inside; built from commit $commit$dirty."

if ($BuildOnly) { Write-Host "Built $staged (not installed)." -ForegroundColor Green; exit 0 }

# ------------------------------------------------------------------ install
Step "4/5 Installing the release (the ERP is briefly unavailable)"
Stop-App
if (Test-Path $current) { Move-Item -Force $current $previous }
Move-Item -Force $staged $current
Set-Content -Path $info -Encoding ASCII -Value @(
  "Installed: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
  "Commit:    $commit$dirty"
)
Start-App

Step "5/5 Waiting for the new release to answer"
if (Wait-Healthy 240) {
  Write-Host ""
  Write-Host "Release $commit is running in production mode." -ForegroundColor Green
  Write-Host "  This PC:      http://localhost:$port/"
  # The PC name stays the same when the router gives the PC a new IP address; the IP is shown as a fallback.
  Write-Host "  Other PCs:    http://$($env:COMPUTERNAME):$port/   (stays the same)"
  Get-NetIPAddress -AddressFamily IPv4 -PrefixOrigin Dhcp, Manual -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.InterfaceAlias -notlike 'vEthernet*' } |
    ForEach-Object { Write-Host "                http://$($_.IPAddress):$port/   (today's IP on $($_.InterfaceAlias); can change)" }
  Write-Host "  Old address:  http://127.0.0.1:5173/ now redirects to port $port."
  exit 0
}

Write-Host "The new release did not answer within 4 minutes." -ForegroundColor Yellow
if (Test-Path $previous) {
  Write-Host "Putting the previous release back..." -ForegroundColor Yellow
  Stop-App
  $failed = Join-Path $releaseDir "seals-backend.failed.jar"
  Move-Item -Force $current $failed
  Move-Item -Force $previous $current
  Start-App
  if (Wait-Healthy 240) { Fail "New release did not start; the previous release is running again. The failed jar is $failed; see backend\logs." }
  Fail "Neither release answered. See backend\logs\supervisor.log and the newest backend-*.err.log."
}
# First release failed: remove it, so both supervisors go back to development mode.
Stop-App
Move-Item -Force $current (Join-Path $releaseDir "seals-backend.failed.jar")
Start-App
Fail "The first release did not start; development mode is running again. See backend\logs\supervisor.log and the newest backend-*.err.log."
