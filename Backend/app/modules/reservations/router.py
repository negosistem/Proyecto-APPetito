from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date
from pydantic import BaseModel

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.reservation import ReservationStatus
from . import schemas, crud

router = APIRouter()

def serialize_reservation(res) -> dict:
    # Enriquece cada resultado con table.name -> table_name
    data = {"id_empresa": res.id_empresa, "id_table": res.id_table, "id_customer": res.id_customer, "customer_name": res.customer_name, "customer_phone": res.customer_phone, "party_size": res.party_size, "reservation_date": res.reservation_date, "status": res.status, "notes": res.notes, "arrival_time": res.arrival_time, "created_at": res.created_at, "id": res.id}
    if res.table:
        data["table_name"] = res.table.number # A table's text name is usually mapped to 'number' in model
    else:
        data["table_name"] = None
    return data

def check_role(user: User, allowed_roles: List[str]):
    # El modelo Role tiene un atributo name. 
    # Aseguramos que el usuario tiene un rol cargado.
    if not user.role or user.role.name not in allowed_roles:
        raise HTTPException(status_code=403, detail="No tienes permisos suficientes para esta acción")

class StatusPatch(BaseModel):
    status: ReservationStatus


@router.get("/", response_model=List[schemas.ReservationResponse])
def get_reservations_list(
    fecha: Optional[date] = None,
    status: Optional[ReservationStatus] = Query(None),
    search: Optional[str] = Query(None),
    id_customer: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_role(current_user, ["admin", "mesero", "cajero", "super_admin"])
    
    if not current_user.id_empresa:
        raise HTTPException(status_code=400, detail="Usuario no asociado a ninguna empresa")
        
    reservations = crud.get_reservations(
        db, 
        id_empresa=current_user.id_empresa, 
        fecha=datetime(fecha.year, fecha.month, fecha.day) if fecha else None, 
        status=status, 
        search=search,
        id_customer=id_customer
    )
    return [serialize_reservation(r) for r in reservations]

@router.get("/today", response_model=List[schemas.ReservationResponse])
def get_today_reservations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_role(current_user, ["admin", "mesero", "cajero", "super_admin"])
    
    if not current_user.id_empresa:
        raise HTTPException(status_code=400, detail="Usuario no asociado a ninguna empresa")
        
    reservations = crud.get_reservations_today(db, id_empresa=current_user.id_empresa)
    return [serialize_reservation(r) for r in reservations]

@router.get("/{reservation_id}", response_model=schemas.ReservationResponse)
def get_single_reservation(
    reservation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_role(current_user, ["admin", "mesero", "cajero", "super_admin"])
    
    if not current_user.id_empresa:
        raise HTTPException(status_code=400, detail="Usuario no asociado a ninguna empresa")
        
    res = crud.get_reservation(db, reservation_id=reservation_id, id_empresa=current_user.id_empresa)
    if not res:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
        
    return serialize_reservation(res)


@router.post("/", response_model=schemas.ReservationResponse, status_code=status.HTTP_201_CREATED)
def create_new_reservation(
    reservation: schemas.ReservationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_role(current_user, ["admin", "mesero", "super_admin"])
    
    if not current_user.id_empresa:
        raise HTTPException(status_code=400, detail="Usuario no asociado a ninguna empresa")
        
    # Anti-solape Validation
    if reservation.id_table is not None:
        conflict = crud.check_table_overlap(
            db, 
            id_empresa=current_user.id_empresa, 
            id_table=reservation.id_table, 
            res_date=reservation.reservation_date
        )
        if conflict:
            raise HTTPException(status_code=409, detail="Mesa ocupada en ese horario")
            
    res = crud.create_reservation(db=db, reservation=reservation, id_empresa=current_user.id_empresa)
    return serialize_reservation(res)


@router.put("/{reservation_id}", response_model=schemas.ReservationResponse)
def update_existing_reservation(
    reservation_id: int,
    reservation: schemas.ReservationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_role(current_user, ["admin", "mesero", "super_admin"])
    
    if not current_user.id_empresa:
        raise HTTPException(status_code=400, detail="Usuario no asociado a ninguna empresa")
        
    db_reservation = crud.get_reservation(db, reservation_id=reservation_id, id_empresa=current_user.id_empresa)
    if not db_reservation:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
        
    # Re-eval anti-solape si id_table o date cambian
    new_table_id = reservation.id_table if reservation.id_table is not None else db_reservation.id_table
    new_date = reservation.reservation_date if reservation.reservation_date is not None else db_reservation.reservation_date
    
    if (reservation.id_table is not None or reservation.reservation_date is not None) and new_table_id is not None:
        conflict = crud.check_table_overlap(
            db, 
            id_empresa=current_user.id_empresa, 
            id_table=new_table_id, 
            res_date=new_date,
            exclude_id=reservation_id
        )
        if conflict:
            raise HTTPException(status_code=409, detail="Mesa ocupada en ese horario")

    res = crud.update_reservation(db=db, db_reservation=db_reservation, update_data=reservation)
    return serialize_reservation(res)


@router.patch("/{reservation_id}/status", response_model=schemas.ReservationResponse)
def patch_reservation_status(
    reservation_id: int,
    status_update: StatusPatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_role(current_user, ["admin", "mesero", "super_admin"])
    
    if not current_user.id_empresa:
        raise HTTPException(status_code=400, detail="Usuario no asociado a ninguna empresa")
        
    db_reservation = crud.get_reservation(db, reservation_id=reservation_id, id_empresa=current_user.id_empresa)
    if not db_reservation:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
        
    res = crud.change_status(db, db_reservation, status_update.status)
    return serialize_reservation(res)


@router.delete("/{reservation_id}", response_model=schemas.ReservationResponse)
def delete_reservation_soft(
    reservation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Only Admin
    check_role(current_user, ["admin", "super_admin"])
    
    if not current_user.id_empresa:
        raise HTTPException(status_code=400, detail="Usuario no asociado a ninguna empresa")
        
    db_reservation = crud.get_reservation(db, reservation_id=reservation_id, id_empresa=current_user.id_empresa)
    if not db_reservation:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
        
    res = crud.cancel_reservation(db, db_reservation)
    return serialize_reservation(res)
