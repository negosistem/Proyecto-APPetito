from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.models.customer import Customer as CustomerModel
from app.modules.customers import schemas
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter(
    prefix="/customers",
    tags=["Customers"]
)

@router.get("/", response_model=List[schemas.Customer])
def get_customers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all customers for current user's company.
    """
    customers = db.query(CustomerModel).filter(
        CustomerModel.id_empresa == current_user.id_empresa
    ).all()
    return customers

@router.post("/", response_model=schemas.Customer, status_code=status.HTTP_201_CREATED)
def create_customer(
    customer_in: schemas.CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new customer for current user's company.
    """
    if customer_in.email:
        existing = db.query(CustomerModel).filter(
            CustomerModel.email == customer_in.email,
            CustomerModel.id_empresa == current_user.id_empresa
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    db_customer = CustomerModel(**customer_in.model_dump(), id_empresa=current_user.id_empresa)
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

@router.get("/{customer_id}", response_model=schemas.Customer)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    customer = db.query(CustomerModel).filter(
        CustomerModel.id == customer_id,
        CustomerModel.id_empresa == current_user.id_empresa
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return customer

@router.patch("/{customer_id}", response_model=schemas.Customer)
def update_customer(
    customer_id: int,
    customer_update: schemas.CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_customer = db.query(CustomerModel).filter(
        CustomerModel.id == customer_id,
        CustomerModel.id_empresa == current_user.id_empresa
    ).first()
    if not db_customer:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    update_data = customer_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_customer, key, value)
    
    db.commit()
    db.refresh(db_customer)
    return db_customer

@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    customer = db.query(CustomerModel).filter(
        CustomerModel.id == customer_id,
        CustomerModel.id_empresa == current_user.id_empresa
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    db.delete(customer)
    db.commit()
    return None
