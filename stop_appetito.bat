@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo   APPetito - Deteniendo Aplicacion
echo ========================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop_appetito.ps1"

echo.
echo Proceso finalizado.
echo.
pause
