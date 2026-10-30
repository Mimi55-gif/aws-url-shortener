from pydantic import BaseModel, HttpUrl, Field


class ShortenRequest(BaseModel):
    """Esquema de entrada para solicitar la creación de un enlace corto."""

    original_url: HttpUrl = Field(
        ...,
        description="URL original completa (debe incluir http:// o https://)",
        examples=["https://www.example.com/articulos/arquitectura-cloud"],
    )


class ShortenResponse(BaseModel):
    """Esquema de respuesta al crear un enlace corto."""

    short_code: str = Field(..., description="Identificador único generado mediante UUID v4")
    original_url: str = Field(..., description="Dirección web original")
    short_url: str = Field(..., description="Enlace corto completo listo para compartir")


class UrlInfoResponse(BaseModel):
    """Esquema de respuesta al consultar la información de un enlace existente."""

    short_code: str = Field(..., description="Identificador único (UUID)")
    original_url: str = Field(..., description="Dirección web original")
    created_at: str = Field(..., description="Fecha y hora de creación en formato ISO 8601 (UTC)")
