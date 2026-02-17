@echo off
echo ========================================
echo   APPetito - Iniciando Aplicacion (RAIZ)
echo ========================================
echo.

REM Iniciar Backend
echo [1/3] Iniciando Backend FastAPI...
start "APPetito Backend" cmd /k "cd Backend && venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"

timeout /t 3 /nobreak > nul

REM Iniciar Frontend
echo [2/3] Iniciando Frontend React...
start "APPetito Frontend" cmd /k "cd Frontend && npm run dev"

timeout /t 5 /nobreak > nul

REM Abrir navegador
echo [3/3] Abriendo navegador...
start http://localhost:5173

echo.
echo ========================================
echo   APPetito Iniciado Correctamente!
echo ========================================
pause
