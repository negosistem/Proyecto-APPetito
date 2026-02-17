@echo off
echo ================================================
echo  Iniciando Backend de APPetito SaaS
echo ================================================
echo.
echo Credenciales Super Admin:
echo   Email: admin@appetito.com
echo   Pass:  admin123
echo.
echo Documentacion: http://localhost:8000/docs
echo ================================================
echo.

cd /d "%~dp0"
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

pause
