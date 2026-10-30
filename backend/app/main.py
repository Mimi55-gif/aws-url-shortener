import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routes import router

app = FastAPI(
    title="AWS URL Shortener API",
    description="API REST para acortar enlaces utilizando FastAPI, Amazon EC2 y Amazon DynamoDB.",
    version="1.0.0",
)

# Configuración de CORS para permitir peticiones desde la interfaz alojada en Amazon S3
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
def health_check():
    """Endpoint de verificación de estado del servidor."""
    return {
        "status": "ok",
        "dynamodb_table": settings.DYNAMODB_TABLE,
        "aws_region": settings.AWS_REGION,
    }


app.include_router(router)


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
