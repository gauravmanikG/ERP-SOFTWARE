# Stops the backend and the frontend on purpose. The auto-start keep-alive check will not bring them back
# until you run .\start-dev.ps1 (or sign in to Windows again after running start-dev once).

& (Join-Path $PSScriptRoot "backend\stop-backend.ps1")
& (Join-Path $PSScriptRoot "frontend\stop-frontend.ps1")
