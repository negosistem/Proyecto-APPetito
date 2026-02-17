from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.core.config import get_settings

# 1. Get settings
settings = get_settings()

# 2. Database URL
# We use the explicit postgresql+psycopg2 scheme from config
SQLALCHEMY_DATABASE_URL = settings.SQLALCHEMY_DATABASE_URI

# 3. Create Engine
# pool_pre_ping=True checks connections before using them, preventing stale connection errors
engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)

# 4. SessionLocal
# This is the factory for creating new database sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 5. Declarative Base (SQLAlchemy 2.0 style)
# Later, all models will inherit from this class
class Base(DeclarativeBase):
    pass

# 6. Dependency
# This function will be used in FastAPI endpoints to get a database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
