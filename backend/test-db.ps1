# Runs EVERY backend test, including the database tests that a plain "mvn test" skips:
#   - startup / master-data / docs tests on a brand-new EMPTY database (SMS_INIT_TEST_DATABASE_URL);
#   - purchase-order, sourcing and receipt tests on a throwaway COPY of sms_seals (SMS_TEST_DATABASE_URL).
# Both databases are dropped afterwards. The live sms_seals database is only read (pg_dump) and never written;
# every database test also refuses to run against it.
#
#   backend\test-db.ps1              run everything
#   backend\test-db.ps1 -NoCopy      skip the purchase tests (no copy of live data is made)
#   backend\test-db.ps1 -Test Name   run one test class (Maven -Dtest=Name)

param([switch]$NoCopy, [string]$Test)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (Test-Path .env) {
  Get-Content .env | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
    $name, $value = $_ -split '=', 2
    Set-Item -Path "Env:$($name.Trim())" -Value $value.Trim()
  }
}
$user = if ($env:SPRING_DATASOURCE_USERNAME) { $env:SPRING_DATASOURCE_USERNAME } else { "postgres" }
$password = if ($env:SPRING_DATASOURCE_PASSWORD) { $env:SPRING_DATASOURCE_PASSWORD } else { "postgres" }
$psql = (Get-Command psql -ErrorAction SilentlyContinue).Source
if (-not $psql) { $psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe" }
$pgDump = Join-Path (Split-Path $psql) "pg_dump.exe"
if (-not (Test-Path $pgDump)) { $pgDump = (Get-Command pg_dump -ErrorAction SilentlyContinue).Source }
$pgHost = "localhost"; $pgPort = 5434

$stamp = Get-Date -Format "yyyyMMddHHmmss"
$empty = "sms_test_$stamp"
$copy = "sms_copy_$stamp"
$dump = Join-Path $env:TEMP "sms_test_dump_$stamp.sql"
$env:PGPASSWORD = $password

function Invoke-Psql([string]$Database, [string]$Sql) {
  & $psql -h $pgHost -p $pgPort -U $user -d $Database -X -q -v ON_ERROR_STOP=1 -c $Sql
  if ($LASTEXITCODE -ne 0) { throw "psql failed: $Sql" }
}

$result = 1
try {
  Invoke-Psql postgres "CREATE DATABASE $empty;"
  $env:SMS_INIT_TEST_DATABASE_URL = "jdbc:postgresql://${pgHost}:$pgPort/$empty"
  $env:SMS_INIT_TEST_DATABASE_USERNAME = $user
  $env:SMS_INIT_TEST_DATABASE_PASSWORD = $password

  if ($NoCopy) {
    Write-Host "Skipping the purchase tests (-NoCopy)."
    Remove-Item Env:SMS_TEST_DATABASE_URL -ErrorAction SilentlyContinue
  } else {
    if (-not $pgDump) { throw "pg_dump not found (needed to copy sms_seals). Use -NoCopy to skip the purchase tests." }
    Write-Host "Copying sms_seals into $copy (read-only on the live database)..."
    Invoke-Psql postgres "CREATE DATABASE $copy;"
    & $pgDump -h $pgHost -p $pgPort -U $user -d sms_seals --no-owner --no-privileges -f $dump
    if ($LASTEXITCODE -ne 0) { throw "pg_dump of sms_seals failed" }
    & $psql -h $pgHost -p $pgPort -U $user -d $copy -X -q -v ON_ERROR_STOP=1 -f $dump | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Restoring the copy into $copy failed" }
    $env:SMS_TEST_DATABASE_URL = "jdbc:postgresql://${pgHost}:$pgPort/$copy"
    $env:SMS_TEST_DATABASE_USERNAME = $user
    $env:SMS_TEST_DATABASE_PASSWORD = $password
  }

  # Maven and the JVM write warnings to stderr; with "Stop" Windows PowerShell would treat them as failures.
  $ErrorActionPreference = "Continue"
  if ($Test) { mvn -B test "-Dtest=$Test" } else { mvn -B test }
  $result = $LASTEXITCODE
} finally {
  $ErrorActionPreference = "Continue"
  if (Test-Path $dump) { Remove-Item $dump -Force }
  & $psql -h $pgHost -p $pgPort -U $user -d postgres -X -q -c "DROP DATABASE IF EXISTS $empty WITH (FORCE);"
  & $psql -h $pgHost -p $pgPort -U $user -d postgres -X -q -c "DROP DATABASE IF EXISTS $copy WITH (FORCE);"
}
exit $result
