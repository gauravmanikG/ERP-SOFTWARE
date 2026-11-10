# Kept for compatibility: removes the backend AND frontend auto-start tasks (see ..\uninstall-autostart.ps1).
& (Join-Path (Split-Path $PSScriptRoot -Parent) "uninstall-autostart.ps1")
