from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.order import Order, OrderItem, OrderStatus, OrderItemState
from app.models.table import Table, TableStatus
from app.models.product import Product
from app.models.user import User
from app.modules.orders import schemas
from app.core.dependencies import get_current_user

router = APIRouter(
    prefix="/orders",
    tags=["Orders"]
)

# Helper to check active order within company
def check_existing_active_order(table_id: int, id_empresa: int, db: Session):
    existing = db.query(Order).filter(
        Order.table_id == table_id,
        Order.id_empresa == id_empresa,
        Order.status != OrderStatus.PAID,
        Order.status != OrderStatus.CANCELLED
    ).first()
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"La mesa ya tiene un pedido activo (ID: {existing.id})"
        )

@router.get("/", response_model=List[schemas.Order])
def get_orders(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all orders for current user's company.
    """
    orders = db.query(Order).filter(
        Order.id_empresa == current_user.id_empresa
    ).order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
    return orders

@router.post("/", response_model=schemas.Order, status_code=status.HTTP_201_CREATED)
def create_order(
    order_data: schemas.OrderCreate = Body(...), 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new order with items.
    Calculates subtotal, tax, and total automatically.
    Sets Table status to OCUPADA.
    AUTOMATICALLY SENDS TO KITCHEN.
    """
    from decimal import Decimal
    from app.core.config import get_settings
    
    settings = get_settings()
    
    # 1. Handle table assignment
    actual_table_id = order_data.table_id
    table = None
    
    # If table_id is 0, it means "automatic" - find a free table within company
    if actual_table_id == 0:
        table = db.query(Table).filter(
            Table.status == TableStatus.LIBRE,
            Table.id_empresa == current_user.id_empresa
        ).first()
        if table:
            actual_table_id = table.id
        else:
            # No free tables, make it takeaway
            actual_table_id = None
    elif actual_table_id:
        # Specific table requested - validate it belongs to company
        table = db.query(Table).filter(
            Table.id == actual_table_id,
            Table.id_empresa == current_user.id_empresa
        ).first()
        if not table:
            raise HTTPException(status_code=404, detail="Mesa no encontrada")
        
        # Check for active order
        check_existing_active_order(actual_table_id, current_user.id_empresa, db)
    
    # 3. Validate that order has items
    # ALLOW EMPTY ORDER (To just open table)
    # if not order_data.items or len(order_data.items) == 0:
    #     raise HTTPException(status_code=400, detail="La orden debe tener al menos un producto")

    # Determine initial status
    # If items exist -> NEW (Send to kitchen)
    # If no items -> PENDING (Just open table, don't bother kitchen)
    initial_status = OrderStatus.NEW if order_data.items and len(order_data.items) > 0 else OrderStatus.PENDING
    
    # 4. Create Order (without totals yet) - assign company
    # 🆕 KITCHEN UPDATE: Set status to NEW and kitchen_received_at only if items exist
    new_order = Order(
        table_id=actual_table_id,
        customer_id=order_data.customer_id,
        user_id=current_user.id,
        customer_name=order_data.customer_name,
        status=initial_status, 
        kitchen_received_at=func.now() if initial_status == OrderStatus.NEW else None, # ← TIMESTAMP only if going to kitchen
        subtotal=Decimal("0"),
        tax=Decimal("0"),
        tip=Decimal("0"),
        discount=Decimal("0"),
        total=Decimal("0"),
        id_empresa=current_user.id_empresa
    )
    db.add(new_order)
    db.flush()  # Get the order ID
    
    # 5. Create order items and calculate subtotal
    subtotal = Decimal("0")
    
    for item_data in order_data.items:
        # Get product
        product = db.query(Product).filter(Product.id == item_data.product_id).first()
        if not product:
            raise HTTPException(
                status_code=404, 
                detail=f"Producto con ID {item_data.product_id} no encontrado"
            )
        
        # Calculate item subtotal
        item_price = Decimal(str(product.price))
        item_subtotal = item_price * item_data.quantity
        
        # Create order item with snapshot and company
        order_item = OrderItem(
            order_id=new_order.id,
            product_id=product.id,
            product_name=product.name,  # Snapshot
            quantity=item_data.quantity,
            price=item_price,  # Snapshot
            subtotal=item_subtotal,
            notes=item_data.notes,
            # 🆕 Transfer prep_time
            prep_time_minutes=product.prep_time_minutes, 
            id_empresa=current_user.id_empresa
        )
        db.add(order_item)
        db.flush() # Need ID for state
        
        # 🆕 Create OrderItemState
        item_state = OrderItemState(
            order_item_id=order_item.id,
            state='pending'
        )
        db.add(item_state)
        
        subtotal += item_subtotal
    
    # 6. Get company tax rate and calculate tax, tip, and total
    from app.models.company import Company
    company = db.query(Company).filter(Company.id == current_user.id_empresa).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    # Calculate tax using company's tax rate
    tax_rate = Decimal(str(company.tax_rate)) / Decimal("100")  # Convert percentage to decimal
    tax = subtotal * tax_rate
    
    # Calculate tip if requested (default 10%)
    tip = Decimal("0")
    if order_data.apply_tip:
        tip = subtotal * Decimal("0.10")  # 10% tip
    
    # Calculate total: subtotal + tax + tip - discount
    total = subtotal + tax + tip - new_order.discount
    
    # 7. Update order totals
    new_order.subtotal = subtotal
    new_order.tax = tax
    new_order.tip = tip
    new_order.total = total
    
    # 8. Update Table Status
    if actual_table_id and table:
        table.status = TableStatus.OCUPADA
        db.add(table)

    db.commit()
    db.refresh(new_order)
    return new_order

@router.get("/table/{table_id}/active", response_model=schemas.Order)
def get_table_active_order(
    table_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get the current active order for a table within company.
    """
    order = db.query(Order).filter(
        Order.table_id == table_id,
        Order.id_empresa == current_user.id_empresa,
        Order.status != OrderStatus.PAID,
        Order.status != OrderStatus.CANCELLED
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="No hay pedido activo en esta mesa")
    
    return order

@router.get("/{order_id}", response_model=schemas.Order)
def get_order(
    order_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.id_empresa == current_user.id_empresa
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return order

@router.get("/{order_id}/details", response_model=schemas.OrderDetailResponse)
def get_order_details(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed order information for payment modal.
    Includes items, table info, and financial breakdown.
    """
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.id_empresa == current_user.id_empresa
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    # Build response with table number
    table_number = None
    if order.table:
        table_number = f"Mesa {order.table.number}"
    
    return schemas.OrderDetailResponse(
        id=order.id,
        table_id=order.table_id,
        table_number=table_number,
        customer_name=order.customer_name,
        subtotal=order.subtotal,
        tax=order.tax,
        tip=order.tip,
        discount=order.discount,
        total=order.total,
        items=order.items,
        status=order.status,
        created_at=order.created_at
    )

@router.post("/{order_id}/items", response_model=schemas.Order)
def add_order_items(
    order_id: int,
    items: List[schemas.OrderItemCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Add items to an order.
    Updates the total amount automatically.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    if order.status in [OrderStatus.PAID, OrderStatus.CANCELLED]:
        raise HTTPException(status_code=400, detail="No se pueden agregar items a un pedido cerrado o cancelado")

    items_to_add = []
    total_added = 0.0

    for item_data in items:
        product = db.query(Product).filter(Product.id == item_data.product_id).first()
        if not product:
            continue # Or raise error
        
        # Create OrderItem with company
        item_total = product.price * item_data.quantity
        new_item = OrderItem(
            order_id=order.id,
            product_id=product.id,
            quantity=item_data.quantity,
            price=product.price, # Snapshot price
            notes=item_data.notes,
            id_empresa=current_user.id_empresa
        )
        items_to_add.append(new_item)
        total_added += item_total

    if items_to_add:
        db.add_all(items_to_add)
        order.total += total_added
        db.commit()
        db.refresh(order)
    
    return order

@router.patch("/{order_id}/status", response_model=schemas.Order)
def update_order_status(
    order_id: int,
    status_update: schemas.OrderUpdate, # Only expecting status here usually
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.id_empresa == current_user.id_empresa
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    if status_update.status:
        # Business logic for status changes could go here
        # e.g. check allowed transitions
        
        if status_update.status == OrderStatus.PAID:
             order.closed_at = datetime.now()
             # Optionally free the table? Or keep it OCUPADA until paid?
             # User said: "Si una mesa ya tiene un pedido en estado abierto o en preparación... hasta que cerrado"
             # Usually "Cerrado" enables new order.
             # We might want to set table to LIBRE if it was OCUPADA, or keep it OCUPADA contextually.
             # Let's assume closing order frees up the "system" to take new order, but physical table state is managed manually or inferred.
             # For now, just close order.
             pass
             
        order.status = status_update.status

    db.commit()
    db.refresh(order)
    return order

@router.post("/{order_id}/close", response_model=schemas.Order)
def close_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Close the order and optionally free the table.
    """
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.id_empresa == current_user.id_empresa
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    if order.status == OrderStatus.PAID:
        return order

    order.status = OrderStatus.PAID
    order.closed_at = datetime.now()
    
    # Create Payment record if it doesn't exist
    from app.models.payment import Payment, PaymentMethod
    from decimal import Decimal
    
    existing_payment = db.query(Payment).filter(Payment.order_id == order.id).first()
    if not existing_payment:
        new_payment = Payment(
            order_id=order.id,
            subtotal=Decimal(str(order.total)),
            tip_amount=Decimal("0.00"),
            total_amount=Decimal(str(order.total)),
            payment_method=PaymentMethod.CASH, # Default
            processed_by=current_user.id,
            id_empresa=current_user.id_empresa
        )
        db.add(new_payment)
    
    # Auto-free table if it was occupied
    if order.table and order.table.status == TableStatus.OCUPADA:
        order.table.status = TableStatus.LIBRE

    db.commit()
    db.refresh(order)
    return order
