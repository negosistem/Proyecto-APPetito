import asyncio
from sqlalchemy import text  # type: ignore
from app.db.session import engine  # type: ignore

def drop_reservations_table():
    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS reservations CASCADE;"))
        conn.commit()
    print("Dropped reservations table.")

if __name__ == "__main__":
    drop_reservations_table()
