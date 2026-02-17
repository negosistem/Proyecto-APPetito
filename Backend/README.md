# 🍽️ APPetito - Sistema de Gestión de Restaurantes

## 🚀 Inicio Rápido con F5

### Opción 1: Iniciar Todo con F5 (Recomendado)

1. Presiona `F5` en VS Code
2. Selecciona: **🔥 APPetito Completo (Backend + Frontend)**
3. Espera a que ambos servidores inicien
4. Abre tu navegador en `http://localhost:5173`

### Opción 2: Iniciar Componentes Individualmente

**Solo Backend:**
- Presiona `F5` → Selecciona **🚀 Backend FastAPI**
- El backend estará en `http://localhost:8000`

**Solo Frontend:**
- Presiona `F5` → Selecciona **🎨 Frontend React**
- El frontend estará en `http://localhost:5173`

## 📋 Tareas Disponibles (Ctrl+Shift+P → "Tasks: Run Task")

- **🔥 Iniciar APPetito Completo** - Inicia backend y frontend juntos
- **🚀 Iniciar Backend FastAPI** - Solo el backend
- **🎨 Iniciar Frontend React** - Solo el frontend
- **👤 Crear Usuario de Prueba** - Genera un usuario aleatorio

## 🔐 Credenciales de Prueba

Última cuenta creada:
- **Email:** `test9049@appetito.com`
- **Contraseña:** `password123`

Para crear más usuarios de prueba:
```bash
python create_random_user.py
```

## 🛠️ Estructura del Proyecto

```
APPetito2.0/                    # Backend FastAPI
├── app/
│   ├── models/                 # Modelos de base de datos
│   ├── routes/                 # Endpoints API
│   ├── schemas/                # Schemas Pydantic
│   └── main.py                 # Aplicación principal
└── create_random_user.py       # Script para crear usuarios

Material prototito appetito/    # Frontend React
├── src/
│   └── app/
│       ├── pages/              # Login, Register, etc.
│       └── context/            # AuthContext
└── package.json
```

## 🌐 URLs

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **Documentación API:** http://localhost:8000/docs
- **Base de Datos:** PostgreSQL en localhost:5432

## 📦 Instalación Manual (si es necesario)

### Backend
```bash
cd "APPetito2.0"
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
```

### Frontend
```bash
cd "Material prototito appetito"
npm install
```

## 🎯 Flujo de Trabajo

1. **Presiona F5** para iniciar todo
2. **Abre** http://localhost:5173
3. **Regístrate** o usa las credenciales de prueba
4. **Inicia sesión** y accede al dashboard

## 🐛 Debugging

- **Backend:** Los breakpoints en Python funcionarán automáticamente
- **Frontend:** Usa las DevTools del navegador
- **Logs:** Revisa la terminal integrada de VS Code

## 📝 Notas

- El backend se recarga automáticamente al guardar archivos Python
- El frontend se recarga automáticamente con HMR (Hot Module Replacement)
- Los cambios en la base de datos requieren migraciones con Alembic

---

**¡Listo para desarrollar! 🚀**
