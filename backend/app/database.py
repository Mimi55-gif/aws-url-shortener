import boto3
from app.config import settings


def get_dynamodb_table():
    """
    Obtiene la referencia a la tabla de Amazon DynamoDB utilizando Boto3.

    En Amazon EC2, Boto3 utiliza automáticamente las credenciales temporales
    proporcionadas por el rol IAM asociado a la instancia (sin almacenar claves
    de acceso en el código fuente).
    """
    dynamodb = boto3.resource("dynamodb", region_name=settings.AWS_REGION)
    return dynamodb.Table(settings.DYNAMODB_TABLE)
