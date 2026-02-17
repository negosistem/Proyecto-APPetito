@echo off
echo ========================================
echo   APPetito - Iniciando Aplicacion
echo ========================================
echo.

REM Verificar si el entorno virtual existe
if not exist "venv\Scripts\activate.bat" (
    echo [ERROR] No se encontro el entorno virtual.
    echo Por favor ejecuta: python -m venv venv
    pause
    exit /b 1
)

REM Activar entorno virtual
call venv\Scripts\activate.bat

echo [1/3] Iniciando Backend FastAPI en puerto 8000...
start "APPetito Backend" cmd /k "venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"

timeout /t 3 /nobreak > nul

echo [2/3] Iniciando Frontend React en puerto 5173...
cd "..\Frontend"
start "APPetito Frontend" cmd /k "npm run dev"

timeout /t 2 /nobreak > nul

echo [3/3] Abriendo navegador...
timeout /t 5 /nobreak > nul
start http://localhost:5173

echo.
echo ========================================
echo   APPetito Iniciado Correctamente!
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo API Docs: http://localhost:8000/docs
echo.
echo Presiona cualquier tecla para cerrar esta ventana
echo (Los servidores seguiran ejecutandose)
pause > nul
