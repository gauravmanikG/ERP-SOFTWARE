# Kept for compatibility: auto-start now covers the backend AND the frontend, and lives in the project root.
param([switch]$StartNow)
& (Join-Path (Split-Path $PSScriptRoot -Parent) "install-autostart.ps1") -StartNow:$StartNow
