import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Configuración de la aplicación cargada desde variables de entorno."""

    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    DYNAMODB_TABLE: str = os.getenv("DYNAMODB_TABLE", "UrlShortenerLinks")
    BASE_URL: str = os.getenv("BASE_URL", "").rstrip("/")
    PORT: int = int(os.getenv("PORT", "8000"))

    @property
    def cors_origins(self) -> list[str]:
        raw = os.getenv("CORS_ORIGINS", "*").strip()
        if raw == "*":
            return ["*"]
        return [origin.strip().rstrip("/") for origin in raw.split(",") if origin.strip()]


settings = Settings()
