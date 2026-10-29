# Runs every backend test, including the database tests that a plain "mvn test" skips.
# Creates a throwaway database, runs the startup and master-data tests against it, then drops it.
# The live sms_seals database is never touched (the tests refuse to run against it).
# Purchase-order integration tests need a copy of live data and are not run here.

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

$db = "sms_test_" + (Get-Date -Format "yyyyMMddHHmmss")
$env:PGPASSWORD = $password
& $psql -h localhost -p 5434 -U $user -d postgres -X -q -c "CREATE DATABASE $db;"
if ($LASTEXITCODE -ne 0) { throw "Could not create the test database $db" }

try {
  $env:SMS_INIT_TEST_DATABASE_URL = "jdbc:postgresql://localhost:5434/$db"
  $env:SMS_INIT_TEST_DATABASE_USERNAME = $user
  $env:SMS_INIT_TEST_DATABASE_PASSWORD = $password
  # Maven and the JVM write warnings to stderr; with "Stop" Windows PowerShell would treat them as failures.
  $ErrorActionPreference = "Continue"
  mvn test
  $result = $LASTEXITCODE
  $ErrorActionPreference = "Stop"
} finally {
  & $psql -h localhost -p 5434 -U $user -d postgres -X -q -c "DROP DATABASE IF EXISTS $db WITH (FORCE);"
}
exit $result
