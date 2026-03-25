import enum
from sqlalchemy import Column, Integer, String, Float, Numeric, ForeignKey, DateTime, Boolean, Enum as SAEnum
from sqlalchemy.orm import relationship
 from sqlalchemy.sql import func
from app.db.session import Base
from app.models.table import Table
from app.models.product import Product
from app.models.user import User

class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    NEW = "new"
    ACCEPTED = "accepted"
    PREPARING = "preparing"
    READY = "ready"
    SERVED = "served"
    PAID = "paid"
    CANCELLED = "cancelled"

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    table_id = Column(Integer, ForeignKey("tables.id"), nullable=True) # Can be null for takeaway
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True) # Optional customer reference
    user_id = Column(Integer, ForeignKey("users.id")) # Waiter who created it
    
    status = Column(
        SAEnum(OrderStatus, values_callable=lambda obj: [item.value for item in obj]), 
        default=OrderStatus.PENDING, 
        index=True
    )
    
    # Multi-tenancy: Company relationship
    id_empresa = Column(Integer, ForeignKey('companies.id'), nullable=False, index=True)
    empresa = relationship("Company")
    
    # Financial fields
    subtotal = Column(Numeric(10, 2), default=0)  # Sum of items before tax
    tax = Column(Numeric(10, 2), default=0)       # Tax amount (e.g., 18% ITBIS)
    tip = Column(Numeric(10, 2), default=0)       # Optional tip (e.g., 10%)
    discount = Column(Numeric(10, 2), default=0)  # Optional discount
    total = Column(Numeric(10, 2), default=0)     # subtotal + tax + tip - discount
    aplica_impuesto = Column(Boolean, default=True) # Manual tax toggle
    
    customer_name = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    closed_at = Column(DateTime(timezone=True), nullable=True)

    # Kitchen timestamps
    kitchen_received_at = Column(DateTime(timezone=True), nullable=True)
    kitchen_accepted_at = Column(DateTime(timezone=True), nullable=True)
    kitchen_started_at = Column(DateTime(timezone=True), nullable=True)
    kitchen_completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Kitchen notes
    kitchen_notes = Column(String(500), nullable=True)

    # Relationships
    table = relationship("Table")
    user = relationship("User")
    customer = relationship("Customer")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payment = relationship("Payment", back_populates="order", uselist=False)

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"))
    product_id = Column(Integer, ForeignKey("products.id"))
    
    # Snapshot fields - preserve product info at time of order
    product_name = Column(String(255), nullable=False)
    quantity = Column(Integer, default=1)
    price = Column(Numeric(10, 2), nullable=False) # Price at the time of order (unit price)
    subtotal = Column(Numeric(10, 2), nullable=False) # quantity * price
    notes = Column(String, nullable=True) # Notes like "sin cebolla"
    
    # Multi-tenancy: Company relationship
    id_empresa = Column(Integer, ForeignKey('companies.id'), nullable=False, index=True)
    empresa = relationship("Company")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    order = relationship("Order", back_populates="items")
    product = relationship("Product")
    state = relationship("OrderItemState", back_populates="order_item", uselist=False, cascade="all, delete-orphan")

    # Kitchen fields
    prep_time_minutes = Column(Integer, default=10)

class OrderItemState(Base):
    """Individual state for each order item"""
    __tablename__ = "order_item_states"
    
    id = Column(Integer, primary_key=True, index=True)
    order_item_id = Column(Integer, ForeignKey("order_items.id", ondelete="CASCADE"), nullable=False)
    
    # Item State
    state = Column(
        SAEnum('pending', 'preparing', 'ready', name='item_state_enum'),
        default='pending',
        nullable=False
    )
    
    # Timestamps
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Chef assignment (optional)
    chef_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    order_item = relationship("OrderItem", back_populates="state")
    chef = relationship("User")
