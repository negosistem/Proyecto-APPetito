"""
Utilidad para manejo de subida de archivos (imágenes y videos)
"""
import os
import uuid
from pathlib import Path
from typing import Optional, Tuple
from fastapi import UploadFile, HTTPException, status

# Configuración
UPLOAD_DIR = Path("uploads/products")
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_VIDEO_TYPES = {"video/mp4"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".mp4"}


def ensure_upload_directory():
    """Crear directorio de uploads si no existe"""
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def validate_file_type(file: UploadFile, allowed_types: set) -> bool:
    """Validar que el tipo de archivo sea permitido"""
    if file.content_type not in allowed_types:
        return False
    
    # Validar también por extensión
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        return False
    
    return True


def generate_unique_filename(original_filename: str) -> str:
    """Generar nombre único para el archivo"""
    file_ext = Path(original_filename).suffix.lower()
    unique_name = f"{uuid.uuid4()}{file_ext}"
    return unique_name


async def save_upload_file(file: UploadFile, file_type: str = "image") -> str:
    """
    Guardar archivo subido y retornar la URL
    
    Args:
        file: Archivo subido
        file_type: Tipo de archivo ("image" o "video")
    
    Returns:
        URL del archivo guardado
    
    Raises:
        HTTPException: Si el archivo no es válido
    """
    # Validar tipo de archivo
    allowed_types = ALLOWED_IMAGE_TYPES if file_type == "image" else ALLOWED_VIDEO_TYPES
    if not validate_file_type(file, allowed_types):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo de archivo no permitido. Solo se permiten: {', '.join(allowed_types)}"
        )
    
    # Leer contenido del archivo
    contents = await file.read()
    file_size = len(contents)
    
    # Validar tamaño
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Archivo demasiado grande. Tamaño máximo: {MAX_FILE_SIZE / (1024 * 1024)}MB"
        )
    
    # Asegurar que existe el directorio
    ensure_upload_directory()
    
    # Generar nombre único
    unique_filename = generate_unique_filename(file.filename)
    file_path = UPLOAD_DIR / unique_filename
    
    # Guardar archivo
    with open(file_path, "wb") as f:
        f.write(contents)
    
    # Retornar URL relativa
    return f"/uploads/products/{unique_filename}"


async def delete_file(file_url: str) -> bool:
    """
    Eliminar archivo del sistema de archivos
    
    Args:
        file_url: URL del archivo (ej: /uploads/products/abc123.jpg)
    
    Returns:
        True si se eliminó exitosamente, False si no existe
    """
    try:
        # Extraer el nombre del archivo de la URL
        filename = Path(file_url).name
        file_path = UPLOAD_DIR / filename
        
        if file_path.exists():
            file_path.unlink()
            return True
        return False
    except Exception:
        return False
