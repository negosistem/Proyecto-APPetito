import asyncio
from app.db.session import engine, Base
import app.models.reservation

def create_reservations_table():
    # Solo crea las tablas que faltan (en este caso, reservations)
    Base.metadata.create_all(bind=engine)
    print("Reservations table created successfully using SQLAlchemy.")

if __name__ == "__main__":
    create_reservations_table()
