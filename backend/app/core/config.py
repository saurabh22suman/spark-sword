"""Application configuration."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    app_name: str = "Spark-Sword"
    debug: bool = False
    
    # DuckDB settings
    duckdb_memory_limit: str = "4GB"
    
    class Config:
        env_file = ".env"


settings = Settings()
