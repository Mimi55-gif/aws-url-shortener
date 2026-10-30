from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import RedirectResponse

from app.config import settings
from app.schemas import ShortenRequest, ShortenResponse, UrlInfoResponse
from app.services import create_short_link, get_link_by_code

router = APIRouter()


def _resolve_base_url(request: Request) -> str:
    """
    Determina la URL base para construir el short_url.
    Si BASE_URL está configurada y no contiene el placeholder por defecto, la utiliza;
    de lo contrario, toma el host y puerto de la solicitud HTTP entrante.
    """
    if settings.BASE_URL and "<ip-publica-ec2>" not in settings.BASE_URL:
        return settings.BASE_URL
    return str(request.base_url).rstrip("/")


@router.post(
    "/shorten",
    response_model=ShortenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear un enlace corto",
)
def shorten_url(payload: ShortenRequest, request: Request):
    """
    Endpoint 1: Recibe la URL original, genera un UUID, almacena el registro
    en DynamoDB y devuelve el enlace corto generado.
    """
    item = create_short_link(str(payload.original_url))
    base_url = _resolve_base_url(request)
    short_url = f"{base_url}/{item['short_code']}"

    return ShortenResponse(
        short_code=item["short_code"],
        original_url=item["original_url"],
        short_url=short_url,
    )


@router.get(
    "/urls/{short_code}",
    response_model=UrlInfoResponse,
    status_code=status.HTTP_200_OK,
    summary="Consultar información de un enlace",
)
def get_url_info(short_code: str):
    """
    Endpoint 3: Consulta DynamoDB y devuelve la información del enlace en formato JSON
    (short_code, original_url y created_at). Devuelve 404 si no existe.
    """
    item = get_link_by_code(short_code)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró ningún enlace con el código '{short_code}'.",
        )

    return UrlInfoResponse(
        short_code=item["short_code"],
        original_url=item["original_url"],
        created_at=item["created_at"],
    )


@router.get(
    "/{short_code}",
    status_code=status.HTTP_307_TEMPORARY_REDIRECT,
    summary="Redireccionar al destino original",
)
def redirect_to_original(short_code: str):
    """
    Endpoint 2: Recibe el UUID desde la ruta, consulta DynamoDB y responde
    con una redirección HTTP 307 Temporary Redirect hacia la URL original.
    Devuelve 404 Not Found si el UUID no existe.
    """
    item = get_link_by_code(short_code)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El enlace corto '{short_code}' no existe.",
        )

    return RedirectResponse(
        url=item["original_url"],
        status_code=status.HTTP_307_TEMPORARY_REDIRECT,
    )
