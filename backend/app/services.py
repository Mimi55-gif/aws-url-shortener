import uuid
from datetime import datetime, timezone
from typing import Optional
from botocore.exceptions import ClientError, BotoCoreError
from fastapi import HTTPException, status

from app.database import get_dynamodb_table


def create_short_link(original_url: str) -> dict:
    """
    Genera un identificador único (UUID v4), registra la fecha de creación
    y almacena el elemento en la tabla de Amazon DynamoDB.
    """
    short_code = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()

    item = {
        "short_code": short_code,
        "original_url": str(original_url),
        "created_at": created_at,
    }

    try:
        table = get_dynamodb_table()
        table.put_item(Item=item)
    except (ClientError, BotoCoreError) as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al guardar el enlace en DynamoDB: {str(exc)}",
        ) from exc

    return item


def get_link_by_code(short_code: str) -> Optional[dict]:
    """
    Consulta un enlace en Amazon DynamoDB a partir de su clave de partición (short_code).
    Devuelve el diccionario del elemento si existe o None si no se encuentra.
    """
    try:
        table = get_dynamodb_table()
        response = table.get_item(Key={"short_code": short_code})
        return response.get("Item")
    except (ClientError, BotoCoreError) as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al consultar DynamoDB: {str(exc)}",
        ) from exc
