# Trigger Reload Fix Dependencies
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import get_settings
from app.db.session import engine, Base
from app.modules import users, auth, dashboard, products, orders, tables, kitchen, customers, staff, roles, payments, finances, superadmin, reservations
from app.modules import settings as settings_module
from pathlib import Path

# Create database tables (in a real project, use migrations like Alembic)
import app.models
# Base.metadata.create_all(bind=engine)

settings = get_settings()

app = FastAPI(title=settings.PROJECT_NAME)

# Configurar CORS para permitir peticiones desde el frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # URL del frontend Vite
    allow_credentials=True,
    allow_methods=["*"],  # Permite todos los métodos (GET, POST, etc.)
    allow_headers=["*"],  # Permite todos los headers
)

# Servir archivos estáticos (uploads)
uploads_dir = Path("uploads")
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
def read_root():
    return {"message": f"Welcome to {settings.PROJECT_NAME}"}

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    from fastapi import Response
    return Response(status_code=204)

@app.get("/health")
def health_check():
    return {"status": "ok"}

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(dashboard.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(orders.router,prefix="/api")
app.include_router(tables.router, prefix="/api")
app.include_router(kitchen.router, prefix="/api")
app.include_router(customers.router, prefix="/api")
app.include_router(staff.router, prefix="/api")
app.include_router(roles.router, prefix="/api")
app.include_router(payments.router, prefix="/api")
app.include_router(finances.router, prefix="/api")
from app.modules.reservations.router import router as reservations_router
app.include_router(reservations_router, prefix="/api/reservations", tags=["Reservations"])
# 🆕 Super Admin - Gestión Global del SaaS
app.include_router(superadmin.router, prefix="/api")
# Settings - Configuración de la empresa
app.include_router(settings_module.router, prefix="/api")
