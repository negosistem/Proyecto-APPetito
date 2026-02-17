# Guía de Inicio: Proyecto APPetito

Aquí tienes los pasos para iniciar el proyecto manualmente en el futuro.

## Requisitos Previos
- Tener instalado **Python 3.x**.
- Tener instalado **Node.js** y **npm**.

## Pasos para el Inicio Manual

### 1. Iniciar el Backend (FastAPI)
Abre una terminal en la carpeta raíz del proyecto y ejecuta:
```powershell
cd Backend
# Si usas PowerShell
.\venv\Scripts\Activate.ps1
# Luego inicia el servidor
python -m uvicorn app.main:app --reload --port 8000
```
*El backend estará disponible en: `http://localhost:8000`*

### 2. Iniciar el Frontend (React + Vite)
Abre una **segunda** terminal en la carpeta raíz y ejecuta:
```powershell
cd Frontend
npm run dev
```
*El frontend estará disponible en: `http://localhost:5173`*

---

## Método Rápido (Archivo .bat)
He visto que tienes un archivo llamado `start_appetito.bat` en la raíz. Puedes simplemente hacer **doble clic** en él para que ambos se inicien automáticamente.

> [!TIP]
> Si el archivo `.bat` te da problemas, usa los comandos manuales descritos arriba.

---

## Verificación
Una vez iniciados:
1. Abre tu navegador en `http://localhost:5173`.
2. El backend debe estar respondiendo en `http://localhost:8000/docs` (documentación API).
