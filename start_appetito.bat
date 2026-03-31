@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo   APPetito - Iniciando Aplicacion
echo ========================================
echo.
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://127.0.0.1:5173
echo API Docs: http://127.0.0.1:8000/docs
echo.

echo [1/3] Iniciando Backend...
start "APPetito Backend" cmd /k "cd /d \"%~dp0\" && npm run start:backend"

timeout /t 3 /nobreak > nul

echo [2/3] Iniciando Frontend...
start "APPetito Frontend" cmd /k "cd /d \"%~dp0\" && npm run start:frontend"

timeout /t 5 /nobreak > nul

echo [3/3] Abriendo navegador...
start http://127.0.0.1:5173

echo.
echo APPetito iniciado.
echo Para detenerlo usa stop_appetito.bat o npm run stop
echo.
pause
