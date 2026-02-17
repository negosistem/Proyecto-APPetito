"""
Utilidades para manejo de multi-tenancy (multi-inquilino).
Proporciona funciones helper para filtrado automático por empresa.
"""
from typing import TypeVar, Type
from fastapi import HTTPException, status
from sqlalchemy.orm import Query
from app.models.user import User

# Type variable para modelos SQLAlchemy
ModelType = TypeVar('ModelType')


def filter_by_company(query: Query, model: Type[ModelType], user: User) -> Query:
    """
    Filtra una query de SQLAlchemy para incluir solo registros de la empresa del usuario.
    
    🆕 MODIFICADO: Super Admin NO es filtrado (ve TODAS las empresas)
    
    Args:
        query: Query de SQLAlchemy
        model: Modelo a filtrar (debe tener atributo 'id_empresa')
        user: Usuario autenticado
        
    Returns:
        Query filtrado por empresa
        
    Ejemplo:
        query = db.query(Product)
        filtered_query = filter_by_company(query, Product, current_user)
        # Result: SELECT * FROM products WHERE id_empresa = 1
    """
    # 🆕 Super Admin ve TODO (no filtrar)
    if user.role and user.role.name == "super_admin":
        return query
    
    # Validar que el modelo tiene id_empresa
    if not hasattr(model, 'id_empresa'):
        raise ValueError(f"El modelo {model.__name__} no tiene atributo 'id_empresa'")
    
    if not user.id_empresa:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El usuario no tiene empresa asignada"
        )
    
    return query.filter(model.id_empresa == user.id_empresa)


def ensure_company_access(item: ModelType, user: User, resource_name: str = "recurso") -> None:
    """
    Valida que un registro pertenece a la empresa del usuario.
    Lanza HTTPException 403 si no pertenece.
    
    🆕 MODIFICADO: Super Admin tiene acceso a TODO
    
    Args:
        item: Objeto del modelo a validar
        user: Usuario autenticado
        resource_name: Nombre del recurso para el mensaje de error
        
    Raises:
        HTTPException 403: Si el usuario no tiene acceso al recurso
        
    Ejemplo:
        product = db.query(Product).filter(Product.id == product_id).first()
        ensure_company_access(product, current_user, "producto")
    """
    if not item:
        return
    
    # 🆕 Super Admin puede acceder a TODO
    if user.role and user.role.name == "super_admin":
        return
    
    if not hasattr(item, 'id_empresa'):
        raise ValueError(f"El objeto no tiene atributo 'id_empresa'")
    
    if not user.id_empresa:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El usuario no tiene empresa asignada"
        )
    
    if item.id_empresa != user.id_empresa:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"No tienes acceso a este {resource_name}"
        )


def set_company(obj: ModelType, user: User) -> ModelType:
    """
    Asigna automáticamente id_empresa a un objeto desde el usuario autenticado.
    
    🆕 MODIFICADO: Super Admin NO puede usar esta función (debe asignar empresa explícitamente)
    
    Args:
        obj: Objeto del modelo a asignar empresa
        user: Usuario autenticado
        
    Returns:
        Objeto con id_empresa asignado
        
    Ejemplo:
        new_product = Product(**product_data)
        set_company(new_product, current_user)
        # new_product.id_empresa = current_user.id_empresa
    """
    # 🆕 Super Admin debe especificar empresa explícitamente
    if user.role and user.role.name == "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin debe especificar la empresa explícitamente al crear recursos"
        )
    
    if not hasattr(obj, 'id_empresa'):
        raise ValueError(f"El objeto no tiene atributo 'id_empresa'")
    
    if not user.id_empresa:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El usuario no tiene empresa asignada"
        )
    
    obj.id_empresa = user.id_empresa
    return obj
