# pyre-ignore-all-errors
from pydantic_settings import BaseSettings
from functools import lru_cache
from decimal import Decimal

class Settings(BaseSettings):
    PROJECT_NAME: str = "FastAPI Restaurant System"
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_SERVER: str
    POSTGRES_PORT: str
    POSTGRES_DB: str

    # JWT Settings
    SECRET_KEY: str = "your-secret-key-change-it-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    # Tax Settings (adjust for your country)
    # Dominican Republic: 0.18 (18% ITBIS)
    # Mexico: 0.16 (16% IVA)
    # Colombia: 0.19 (19% IVA)
    # No tax: 0.00
    TAX_RATE: Decimal = Decimal("0.18")

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

@lru_cache()
def get_settings():
    return Settings()
