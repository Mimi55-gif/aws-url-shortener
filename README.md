# Acortador de Enlaces en AWS (S3 + EC2 + DynamoDB + FastAPI)

Aplicación web completa para acortar direcciones URL utilizando una arquitectura distribuida en AWS:
- **Amazon S3**: Aloja y publica la interfaz web estática (`HTML`, `CSS` y `JavaScript`).
- **Amazon EC2**: Ejecuta la API REST desarrollada con **FastAPI** y **Uvicorn** gestionada mediante `systemd`.
- **Amazon DynamoDB**: Persiste cada enlace corto con su identificador `UUID v4` (`short_code`), `original_url` y `created_at`.
- **AWS IAM Role**: Proporciona credenciales temporales a la instancia EC2 mediante `Boto3` bajo el principio de mínimo privilegio (`PutItem` y `GetItem`), sin almacenar claves de AWS en el código.

---

## Estructura del Proyecto

```text
aws-url-shortener/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py        # Gestión de variables de entorno
│   │   ├── database.py      # Conexión a DynamoDB con Boto3 (Rol IAM)
│   │   ├── main.py          # Punto de entrada de FastAPI + Middleware CORS
│   │   ├── routes.py        # Endpoints REST (/shorten, /{short_code}, /urls/{short_code})
│   │   ├── schemas.py       # Modelos de validación con Pydantic
│   │   └── services.py      # Lógica de negocio (generación de UUID y consultas)
│   ├── .env.example         # Plantilla de variables de entorno
│   └── requirements.txt     # Dependencias de Python
├── frontend/
│   ├── index.html           # Interfaz de usuario (formulario y panel de consulta)
│   ├── styles.css           # Estilos responsivos
│   └── app.js               # Consumo de la API mediante fetch(), validación y portapapeles
├── deploy/
│   ├── iam-dynamodb-policy.json  # Política IAM de mínimo privilegio para DynamoDB
│   ├── s3-bucket-policy.json     # Política de lectura pública para el bucket S3
│   └── url-shortener.service     # Unidad de systemd para mantener activo el backend en EC2
├── .gitignore
└── README.md
```

---

## Endpoints de la API (FastAPI)

| Método | Ruta | Descripción | Código de Éxito |
| :--- | :--- | :--- | :--- |
| `POST` | `/shorten` | Recibe `original_url`, genera un `UUID v4`, guarda en DynamoDB y devuelve `short_code`, `original_url` y `short_url`. | `201 Created` |
| `GET` | `/{short_code}` | Busca el `UUID` en DynamoDB y ejecuta una redirección HTTP real hacia `original_url`. Devuelve `404` si no existe. | `307 Temporary Redirect` |
| `GET` | `/urls/{short_code}` | Devuelve los metadatos del enlace (`short_code`, `original_url`, `created_at`) en JSON. Devuelve `404` si no existe. | `200 OK` |
| `GET` | `/health` | Verifica el estado del servicio en EC2. | `200 OK` |

---

## Ejecución en Entorno Local

1. Entrar al directorio del backend y crear el entorno virtual:
   ```bash
   cd backend
   python -m venv venv
   # En Windows:
   venv\Scripts\activate
   # En Linux / macOS:
   source venv/bin/activate
   ```
2. Instalar dependencias:
   ```bash
   pip install -r requirements.txt
   ```
3. Copiar el archivo de variables de entorno:
   ```bash
   cp .env.example .env
   ```
4. Iniciar el servidor de desarrollo:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   La documentación interactiva estará disponible en `http://localhost:8000/docs`.
