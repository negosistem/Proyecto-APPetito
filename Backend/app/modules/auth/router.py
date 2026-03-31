from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.security import create_access_token
from app.db.session import get_db
from app.models.company import Company
from app.models.product import Product
from app.models.role import Role
from app.models.table import Table
from app.models.user import User
from app.modules.auth.schemas import RestaurantRegister, Token
from app.modules.roles.service import seed_default_roles
from app.modules.users.schemas import User as UserSchema
from app.utils.security import get_password_hash, verify_password

router = APIRouter(
    prefix="/auth",
    tags=["Auth"],
)


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )

    access_token = create_access_token(
        data={
            "sub": user.email,
            "company_id": user.id_empresa,
        }
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


@router.get("/me", response_model=UserSchema)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/register", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
def register_restaurant(
    payload: RestaurantRegister,
    db: Session = Depends(get_db),
):
    email = payload.email.lower()
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado",
        )

    existing_company = db.query(Company).filter(Company.email == email).first()
    if existing_company:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una empresa registrada con este email",
        )

    all_modules = "mesas,pedidos,cocina,finanzas,menu,clientes,staff,reportes,configuracion"

    try:
        new_company = Company(
            name=payload.restaurant_name,
            email=email,
            phone=payload.phone,
            address=payload.address,
            is_active=True,
            subscription_status="trial",
            trial_ends_at=datetime.utcnow() + timedelta(days=30),
            max_users=10,
            max_tables=20,
            max_products=100,
            tax_rate=18.00,
            currency="DOP",
        )
        db.add(new_company)
        db.flush()

        seed_default_roles(db, new_company.id, commit=False)

        admin_role = db.query(Role).filter(
            Role.name == "admin",
            Role.id_empresa == new_company.id,
        ).first()
        if not admin_role:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No se pudo inicializar el rol administrador",
            )

        new_admin = User(
            nombre=payload.owner_name,
            email=email,
            password_hash=get_password_hash(payload.password),
            role_id=admin_role.id,
            id_empresa=new_company.id,
            is_active=True,
            modules=all_modules,
        )
        db.add(new_admin)

        for table_number in range(1, 6):
            db.add(
                Table(
                    number=str(table_number),
                    capacity=4,
                    status="libre",
                    id_empresa=new_company.id,
                    is_active=True,
                )
            )

        db.add(
            Product(
                name="Agua Mineral",
                description="Producto inicial para comenzar a operar",
                price=50.00,
                category="Bebidas",
                id_empresa=new_company.id,
                is_active=True,
                prep_time_minutes=1,
            )
        )

        db.commit()
        db.refresh(new_admin)
        return new_admin
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo completar el registro inicial del restaurante",
        )
