"""
Script para limpiar datos de prueba de APPetito
Uso: python -m app.scripts.clean_test_data
"""

import sys
import os
from datetime import datetime
from sqlalchemy import text
from app.db.session import SessionLocal
from app.models.order import Order
from app.models.payment import Payment
from app.models.table import Table

def show_current_data(db):
    """Muestra resumen de datos actuales"""
    print("\n" + "="*60)
    print("📊 DATOS ACTUALES EN LA BASE DE DATOS")
    print("="*60)
    
    orders_count = db.query(Order).count()
    payments_count = db.query(Payment).count()
    tables_count = db.query(Table).count()
    occupied_tables = db.query(Table).filter(Table.status != 'available').count()
    
    print(f"📦 Órdenes: {orders_count}")
    print(f"💰 Pagos: {payments_count}")
    print(f"🪑 Mesas totales: {tables_count}")
    print(f"🔴 Mesas ocupadas: {occupied_tables}")
    print("="*60 + "\n")
    
    return orders_count > 0 or payments_count > 0

def create_backup():
    """Crea backup de la base de datos"""
    import subprocess
    from app.core.config import get_settings
    
    settings = get_settings()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = f"backup_before_clean_{timestamp}.sql"
    
    print(f"📦 Creando backup: {backup_file}")
    
    try:
        # Extraer información de la URI de la base de datos
        # Format: postgresql://user:password@host:port/dbname
        uri = settings.SQLALCHEMY_DATABASE_URI
        # Simplificación para el comando pg_dump
        # Nota: pg_dump usualmente requiere configuración de variables de entorno o .pgpass para el password
        
        print(f"⚠️  NOTA: El backup se realizará usando la configuración de {uri}")
        
        # En un entorno real, usaríamos los componentes de la URI. 
        # Aquí intentamos un comando genérico asumiendo herramientas de postgres instaladas.
        # El comando exacto puede necesitar ajustes según el entorno.
        
        cmd = f'pg_dump "{uri}" > {backup_file}'
        
        print(f"Ejecutando backup...")
        
        if sys.platform == "win32":
            subprocess.run(cmd, shell=True, check=True)
        else:
            subprocess.run(cmd, shell=True, check=True)
        
        print(f"✅ Backup creado exitosamente: {backup_file}\n")
        return True
        
    except Exception as e:
        print(f"❌ Error creando backup: {e}")
        print("⚠️  Continuar sin backup es RIESGOSO")
        response = input("¿Deseas continuar de todas formas? (escribe 'si' para confirmar): ")
        return response.lower() == 'si'

def clean_data(db):
    """Limpia los datos de prueba"""
    try:
        print("\n🧹 Iniciando limpieza de datos...")
        
        # 1. Eliminar pagos (tiene FK a orders)
        payments_deleted = db.query(Payment).delete()
        print(f"✅ Pagos eliminados: {payments_deleted}")
        
        # 2. Eliminar órdenes
        # Necesitamos eliminar items primero si no hay cascade delete configurado en todos lados
        # pero el modelo Order usualmente tiene cascade. 
        # Para estar seguros ante FK constraints manuales:
        db.execute(text("DELETE FROM order_items"))
        orders_deleted = db.query(Order).delete()
        print(f"✅ Órdenes eliminadas: {orders_deleted}")
        
        # 3. Resetear mesas
        tables = db.query(Table).all()
        for table in tables:
            table.status = 'available'
            table.current_order_id = None
        print(f"✅ {len(tables)} mesas reseteadas a 'available'")
        
        # 4. Resetear secuencias (IDs auto-incrementales)
        try:
            db.execute(text("ALTER SEQUENCE orders_id_seq RESTART WITH 1"))
            db.execute(text("ALTER SEQUENCE payments_id_seq RESTART WITH 1"))
            db.execute(text("ALTER SEQUENCE order_items_id_seq RESTART WITH 1"))
            print("✅ Secuencias de IDs reseteadas")
        except Exception as seq_err:
            print(f"⚠️ Nota: No se pudieron resetear todas las secuencias (esto es opcional): {seq_err}")
        
        # Commit de cambios
        db.commit()
        print("\n✅ ¡Limpieza completada exitosamente!")
        return True
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ ERROR durante la limpieza: {e}")
        print("🔄 Se hizo rollback, no se modificó nada")
        return False

def main():
    """Función principal"""
    print("\n" + "🧹"*30)
    print("   LIMPIADOR DE DATOS DE PRUEBA - APPetito")
    print("🧹"*30 + "\n")
    
    db = SessionLocal()
    
    try:
        # 1. Mostrar datos actuales
        has_data = show_current_data(db)
        
        if not has_data:
            print("ℹ️  No hay datos de prueba para eliminar")
            return
        
        # 2. Confirmación del usuario
        print("⚠️  ADVERTENCIA: Esta acción eliminará:")
        print("   - Todas las órdenes y sus items")
        print("   - Todos los pagos")
        print("   - Reseteará el estado de las mesas")
        print("\n⚠️  NO se eliminarán:")
        print("   - Usuarios, roles, productos, categorías, clientes, mesas\n")
        
        response = input("¿Estás SEGURO que deseas continuar? (escribe 'CONFIRMO' en mayúsculas): ")
        
        if response != "CONFIRMO":
            print("\n❌ Operación cancelada por el usuario")
            return
        
        # 3. Crear backup
        if not create_backup():
            print("\n❌ Operación cancelada: no se pudo crear backup")
            return
        
        # 4. Ejecutar limpieza
        success = clean_data(db)
        
        if success:
            print("\n" + "="*60)
            print("✨ BASE DE DATOS LISTA PARA DATOS REALES")
            print("="*60)
            print("\n💡 Próximos pasos:")
            print("   1. Verifica que todo funcione correctamente")
            print("   2. Crea tu primera orden real")
            print("   3. Prueba el flujo completo de ventas\n")
        
    except Exception as e:
        print(f"\n❌ Error inesperado: {e}")
    
    finally:
        db.close()

if __name__ == "__main__":
    main()
