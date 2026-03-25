from sqlalchemy.orm import Session
from app.models.role import Role

def seed_default_roles(db: Session, id_empresa: int, commit: bool = True) -> None:
    """
    Seed idempotent of default roles for a specific enterprise.
    """
    default_roles = [
        {
            "name": "admin",
            "description": "Administrador del restaurante",
            "permissions": {"all": True}
        },
        {
            "name": "gerente",
            "description": "Gerente de operaciones",
            "permissions": {
                "dashboard": True, "staff": True, "finances": True, "orders": True,
                "products": True, "tables": True, "customers": True, "settings": False
            }
        },
        {
            "name": "cajero",
            "description": "Cajero encargado de cobros",
            "permissions": {"orders": True, "payments": True, "tables": True, "customers": True}
        },
        {
            "name": "mesero",
            "description": "Mesero atención a clientes",
            "permissions": {"orders": True, "tables": True, "products": False, "customers": True}
        },
        {
            "name": "cocina",
            "description": "Personal de cocina",
            "permissions": {"kitchen": True, "orders": False, "products": False}
        }
    ]

    for role_data in default_roles:
        existing_role = db.query(Role).filter(
            Role.name == role_data["name"],
            Role.id_empresa == id_empresa
        ).first()

        if not existing_role:
            new_role = Role(
                name=role_data["name"],
                description=role_data["description"],
                permissions=role_data["permissions"],
                id_empresa=id_empresa,
                is_active=True
            )
            db.add(new_role)
    
    
    if commit:
        db.commit()
    else:
        db.flush()
