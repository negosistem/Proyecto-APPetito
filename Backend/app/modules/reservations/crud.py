from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_, and_
from datetime import datetime, timedelta
from app.models.reservation import Reservation, ReservationStatus
from app.models.table import Table
from app.modules.reservations.schemas import ReservationCreate, ReservationUpdate

def get_reservations(
    db: Session, 
    id_empresa: int, 
    fecha: Optional[datetime] = None, 
    status: Optional[ReservationStatus] = None, 
    search: Optional[str] = None,
    id_customer: Optional[int] = None
) -> List[Reservation]:
    query = db.query(Reservation).filter(Reservation.id_empresa == id_empresa)
    
    if fecha:
        start_of_day = datetime(fecha.year, fecha.month, fecha.day)
        end_of_day = start_of_day + timedelta(days=1)
        query = query.filter(Reservation.reservation_date >= start_of_day, Reservation.reservation_date < end_of_day)
        
    if status is not None:
        query = query.filter(Reservation.status == status)
        
    if id_customer is not None:
        query = query.filter(Reservation.id_customer == id_customer)
        
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                Reservation.customer_name.ilike(search_filter),
                Reservation.customer_phone.ilike(search_filter)
            )
        )
        
    return query.order_by(desc(Reservation.reservation_date)).all()

def get_reservations_today(db: Session, id_empresa: int) -> List[Reservation]:
    now = datetime.utcnow()
    start_of_day = datetime(now.year, now.month, now.day)
    end_of_day = start_of_day + timedelta(days=1)
    
    return db.query(Reservation).filter(
        Reservation.id_empresa == id_empresa,
        Reservation.reservation_date >= start_of_day,
        Reservation.reservation_date < end_of_day
    ).order_by(Reservation.reservation_date.asc()).all()

def get_reservation(db: Session, reservation_id: int, id_empresa: int) -> Optional[Reservation]:
    return db.query(Reservation).filter(
        Reservation.id == reservation_id, 
        Reservation.id_empresa == id_empresa
    ).first()

def check_table_overlap(db: Session, id_empresa: int, id_table: int, res_date: datetime, exclude_id: Optional[int] = None) -> bool:
    """Verifica si hay solape de ±2 horas para la mesa dada."""
    start_time = res_date - timedelta(hours=2)
    end_time = res_date + timedelta(hours=2)
    
    query = db.query(Reservation).filter(
        Reservation.id_empresa == id_empresa,
        Reservation.id_table == id_table,
        Reservation.status.in_([ReservationStatus.PENDING, ReservationStatus.CONFIRMED]),
        Reservation.reservation_date > start_time,
        Reservation.reservation_date < end_time
    )
    
    if exclude_id is not None:
        query = query.filter(Reservation.id != exclude_id)
        
    return db.query(query.exists()).scalar()

def create_reservation(db: Session, reservation: ReservationCreate, id_empresa: int) -> Reservation:
    db_reservation = Reservation(
        id_empresa=id_empresa,
        **reservation.model_dump()
    )
    db.add(db_reservation)
    db.commit()
    db.refresh(db_reservation)
    return db_reservation

def update_reservation(db: Session, db_reservation: Reservation, update_data: ReservationUpdate) -> Reservation:
    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(db_reservation, key, value)
    db.commit()
    db.refresh(db_reservation)
    return db_reservation

def cancel_reservation(db: Session, db_reservation: Reservation) -> Reservation:
    db_reservation.status = ReservationStatus.CANCELLED
    db.commit()
    db.refresh(db_reservation)
    return db_reservation

def change_status(db: Session, db_reservation: Reservation, status: ReservationStatus) -> Reservation:
    db_reservation.status = status
    db.commit()
    db.refresh(db_reservation)
    return db_reservation
