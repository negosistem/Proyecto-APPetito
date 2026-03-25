import os
import sys
# Add current directory to sys.path to find 'app'
sys.path.append(os.getcwd())

from app.db.session import engine
from sqlalchemy import text

def force_sync():
    try:
        with engine.connect() as conn:
            print("Dropping global_audit_logs if exists...")
            conn.execute(text("DROP TABLE IF EXISTS global_audit_logs CASCADE"))
            
            print("Dropping existing reservationstatus enum if exists...")
            conn.execute(text("DROP TABLE IF EXISTS reservations CASCADE"))
            conn.execute(text("DROP TYPE IF EXISTS reservationstatus CASCADE"))
            
            print("Creating reservationstatus enum...")
            conn.execute(text("CREATE TYPE reservationstatus AS ENUM ('pendiente', 'confirmada', 'cancelada', 'completada', 'no_show');"))
            
            print("Creating reservations table...")
            # Match the lowercase strings used in app/models/reservation.py
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS reservations (
                    id SERIAL PRIMARY KEY,
                    id_empresa INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                    id_table INTEGER REFERENCES tables(id),
                    id_customer INTEGER REFERENCES customers(id),
                    customer_name VARCHAR(100) NOT NULL,
                    customer_phone VARCHAR(20) NOT NULL,
                    party_size INTEGER NOT NULL,
                    reservation_date TIMESTAMP NOT NULL,
                    status reservationstatus NOT NULL DEFAULT 'pendiente',
                    notes TEXT,
                    arrival_time TIME,
                    created_at TIMESTAMP DEFAULT now(),
                    updated_at TIMESTAMP DEFAULT now()
                )
            """))
            
            print("Creating indexes...")
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_reservations_id ON reservations (id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_reservations_id_empresa ON reservations (id_empresa)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_reservation_company_date ON reservations (id_empresa, reservation_date)"))
            
            print("Updating alembic_version to head...")
            conn.execute(text("DELETE FROM alembic_version"))
            conn.execute(text("INSERT INTO alembic_version (version_num) VALUES ('4d2a5f0df30f')"))
            
            conn.commit()
            print("Success!")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    force_sync()
