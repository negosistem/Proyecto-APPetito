# Backend APPetito

Backend FastAPI para APPetito.

## Arranque

- Desde la raiz: `npm run start:backend`
- Directo: `Backend\\venv\\Scripts\\python.exe -m uvicorn app.main:app --reload --port 8000 --app-dir Backend`

## Dependencias

- Instalar con `npm run install:backend` desde la raiz del proyecto.

## Notas

- Usa `Backend/.env` para la configuracion.
- Las migraciones viven en `Backend/alembic/`.
- El punto de entrada principal es `Backend/app/main.py`.
