"""
Script simplificado para aplicar cambios de Super Admin.
Usa comandos SQL directos con manejo de errores robusto.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.db.session import SessionLocal, engine

def run_sql_safe(engine, sql, description):
    """Ejecutar SQL con manejo de errores"""
    try:
        with engine.begin() as conn:
            conn.execute(text(sql))
        print(f"   ✅ {description}")
        return True
    except Exception as e:
        error_msg = str(e).lower()
        if any(word in error_msg for word in ["already exists", "ya existe", "duplicate"]):
            print(f"   ℹ️  {description} (ya existe)")
            return True
        elif "does not exist" in error_msg or "no existe" in error_msg:
            print(f"   ⚠️  {description} (no aplicable)")
            return False
        else:
            print(f"   ❌ Error en {description}: {str(e)[:100]}")
            return False


def apply_db_changes():
    """Aplicar cambios sin SQLAlchemy ORM"""
    print("\n" + "="*70)
    print("APLICANDO CAMBIOS DE SUPER ADMIN")
    print("="*70 + "\n")
    
    # Paso 1: Modificar users.id_empresa a nullable
    print("🔧 Paso 1: Modificando users.id_empresa...")
    run_sql_safe(
        engine,
        "ALTER TABLE users ALTER COLUMN id_empresa DROP NOT NULL;",
        "users.id_empresa ahora permite NULL"
    )
    
    # Paso 2: Agregar columnas a companies
    print("\n📋 Paso 2: Agregando columnas a companies...")
    columns = {
        "trial_ends_at": "TIMESTAMP",
        "suspended_at": "TIMESTAMP",
        "suspended_by": "INTEGER",
        "suspended_reason": "VARCHAR(500)",
        "max_users": "INTEGER DEFAULT 10",
        "max_tables": "INTEGER DEFAULT 20",
        "max_products": "INTEGER DEFAULT 100",
        "tax_rate": "NUMERIC(5,2) DEFAULT 18.00",
        "currency": "VARCHAR(10) DEFAULT 'DOP'",
        "invoice_prefix": "VARCHAR(20) DEFAULT 'FAC'"
    }
    
    for col_name, col_type in columns.items():
        run_sql_safe(
            engine,
            f"ALTER TABLE companies ADD COLUMN {col_name} {col_type};",
            f"Columna {col_name}"
        )
    
    # Paso 3: Crear tabla global_audit_logs
    print("\n📊 Paso 3: Creando tabla global_audit_logs...")
    run_sql_safe(
        engine,
        """
        CREATE TABLE global_audit_logs (
            id SERIAL PRIMARY KEY,
            action VARCHAR(100) NOT NULL,
            entity_type VARCHAR(50) NOT NULL,
            entity_id INTEGER,
            super_admin_id INTEGER NOT NULL,
            affected_company_id INTEGER,
            details JSONB,
            ip_address VARCHAR(45),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
            FOREIGN KEY (super_admin_id) REFERENCES users(id),
            FOREIGN KEY (affected_company_id) REFERENCES companies(id)
        );
        """,
        "Tabla global_audit_logs"
    )
    
    # Paso 4: Crear índices
    print("\n🔍 Paso 4: Creando índices...")
    run_sql_safe(engine, "CREATE INDEX idx_audit_logs_action ON global_audit_logs(action);", "Índice action")
    run_sql_safe(engine, "CREATE INDEX idx_audit_logs_created ON global_audit_logs(created_at);", "Índice created_at")
    
    # Paso 5: Foreign key de suspended_by
    print("\n🔗 Paso 5: Creando foreign key...")
    run_sql_safe(
        engine,
        "ALTER TABLE companies ADD CONSTRAINT fk_companies_suspended_by FOREIGN KEY (suspended_by) REFERENCES users(id);",
        "FK companies.suspended_by"
    )
    
    # Paso 6: Crear rol super_admin
    print("\n👑 Paso 6: Creando rol super_admin...")
    run_sql_safe(
        engine,
        """
        INSERT INTO roles (name, description) 
        VALUES ('super_admin', 'Super Administrador Global - Gestiona todas las empresas del SaaS')
        ON CONFLICT (name) DO NOTHING;
        """,
        "Rol super_admin"
    )
    
    # Paso 7: Actualizar trial para empresas existentes
    print("\n📅 Paso 7: Configurando trial...")
    run_sql_safe(
        engine,
        """
        UPDATE companies 
        SET trial_ends_at = created_at + INTERVAL '30 days'
        WHERE trial_ends_at IS NULL;
        """,
        "Trial configurado"
    )
    
    print("\n" + "="*70)
    print("✅ CAMBIOS APLICADOS")
    print("="*70)
    print("\n📝 Próximos pasos:")
    print("   1. python -m scripts.create_superadmin")
    print("   2. Iniciar backend y probar endpoints\n")


if __name__ == "__main__":
    apply_db_changes()
