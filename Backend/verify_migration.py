from sqlalchemy import create_engine, text
from app.core.config import get_settings

settings = get_settings()
# Asegurarse de que SQLALCHEMY_DATABASE_URI esté definido
if not hasattr(settings, 'SQLALCHEMY_DATABASE_URI'):
    print("Error: SQLALCHEMY_DATABASE_URI no encontrado en settings.")
    exit(1)

try:
    engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
    with engine.connect() as conn:
        print("Conectando a la base de datos...")
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='products' AND column_name='video_url'"))
        row = result.fetchone()
        
        if row:
            print("\n✅ ÉXITO: La columna 'video_url' YA EXISTE en la tabla 'products'.")
            print("   La migración se realizó correctamente anteriormente.")
            print("   No necesitas ejecutar ningún script de migración adicional.")
        else:
            print("\n❌ ADVERTENCIA: La columna 'video_url' NO FUE ENCONTRADA.")
            print("   Por favor, intenta aplicar la migración manualmente.")

except Exception as e:
    print(f"\n❌ Ocurrió un error al verificar: {e}")
