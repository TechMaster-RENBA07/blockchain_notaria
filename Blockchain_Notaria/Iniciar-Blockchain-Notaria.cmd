@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Iniciar-Blockchain-Notaria.ps1"
if errorlevel 1 (
  echo.
  echo No se pudo iniciar Blockchain Notaria. Revisa el mensaje anterior.
  pause
)
endlocal
