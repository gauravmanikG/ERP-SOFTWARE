# Starts the Spring Boot API against local PostgreSQL on port 5434
# (persistent Windows service postgresql-x64-18).

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

Write-Host "Connecting to: $env:SPRING_DATASOURCE_URL"
mvn spring-boot:run
