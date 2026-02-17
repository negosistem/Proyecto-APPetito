import sys
import os

# Add parent directory to path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal, engine, Base
from app.models.product import Product
from app.models.table import Table
from app.models.order import Order, OrderItem
from app.models.user import User # To assign orders to a waiter
from app.utils.security import get_password_hash
import random
from datetime import datetime, timedelta

def init_db():
    print("Initializing database...")
    db = SessionLocal()
    
    try:
        # Create Tables if they don't exist
        print("Creating restaurant tables...")
        if db.query(Table).count() == 0:
            tables = []
            for i in range(1, 11): # 10 Tables
                tables.append(Table(number=i, capacity=4, is_occupied=False))
            db.add_all(tables)
            db.commit()
            print(f"Created {len(tables)} tables.")
        else:
            print("Tables already exist.")

        # Create Products
        print("Creating menu items...")
        if db.query(Product).count() == 0:
            products = [
                # Entradas
                Product(name="Nachos Supremos", description="Nachos con queso, guacamole y jalapeños", price=12500, category="Entradas", is_active=True),
                Product(name="Mozzarella Sticks", description="Palitos de queso empanizados", price=8900, category="Entradas", is_active=True),
                Product(name="Alitas BBQ", description="6 Alitas bañadas en salsa BBQ", price=14500, category="Entradas", is_active=True),
                
                # Platos Principales
                Product(name="Hamburguesa Clásica", description="Carne 200g, queso cheddar, lechuga, tomate", price=18500, category="Platos principales", is_active=True),
                Product(name="Pizza Pepperoni", description="Pizza mediana con doble pepperoni", price=22000, category="Platos principales", is_active=True),
                Product(name="Pasta Carbonara", description="Spaghetti con salsa cremosa y tocineta", price=19500, category="Platos principales", is_active=True),
                Product(name="Ensalada César", description="Lechuga romana, crotones, parmesano y aderezo", price=16000, category="Platos principales", is_active=True),
                
                # Postres
                Product(name="Brownie con Helado", description="Brownie tibio con bola de helado de vainilla", price=9500, category="Postres", is_active=True),
                Product(name="Cheesecake", description="Cheesecake de frutos rojos", price=10500, category="Postres", is_active=True),
                
                # Bebidas
                Product(name="Coca Cola", description="Lata 350ml", price=4500, category="Bebidas", is_active=True),
                Product(name="Limonada Natural", description="Jarra personal", price=6000, category="Bebidas", is_active=True),
                Product(name="Cerveza Artesanal", description="Rubia o Roja", price=12000, category="Bebidas", is_active=True),
            ]
            db.add_all(products)
            db.commit()
            print(f"Created {len(products)} products.")
        else:
            print("Products already exist.")

        # Simulate Orders
        print("Simulating orders for Dashboard...")
        products = db.query(Product).all()
        tables = db.query(Table).all()
        user = db.query(User).first() # Assign to first user (admin usually)
        
        if not user:
            print("Error: No user found. Please register a user first.")
            return

        if db.query(Order).count() > 0:
             print("Orders already exist, skipping simulation.")
             # Optionally verify tables status
        else:
            # Create some historical orders (last 7 days)
            order_count = 0
            for i in range(20):
                # Random date within last 7 days
                days_ago = random.randint(0, 6)
                order_date = datetime.now() - timedelta(days=days_ago, hours=random.randint(1, 10))
                
                status = random.choice(["Listo", "Servido", "Pagado", "Cancelado"])
                table = random.choice(tables)
                
                order = Order(
                    table_id=table.id,
                    user_id=user.id,
                    status=status,
                    total=0,
                    customer_name=f"Cliente {i+1}",
                    created_at=order_date
                )
                db.add(order)
                db.commit()
                
                # Add items
                total = 0
                num_items = random.randint(1, 4)
                for _ in range(num_items):
                    prod = random.choice(products)
                    qty = random.randint(1, 2)
                    item_total = prod.price * qty
                    total += item_total
                    
                    item = OrderItem(
                        order_id=order.id,
                        product_id=prod.id,
                        quantity=qty,
                        price=prod.price
                    )
                    db.add(item)
                
                order.total = total
                db.add(order)
                order_count += 1
            
            # Create some ACTIVE orders for today
            for i in range(5):
                table = tables[i] # Use first 5 tables
                table.is_occupied = True
                db.add(table)
                
                status = random.choice(["Pendiente", "Preparando"])
                
                order = Order(
                    table_id=table.id,
                    user_id=user.id,
                    status=status,
                    total=0,
                    customer_name=f"Cliente Activo {i+1}",
                    created_at=datetime.now()
                )
                db.add(order)
                db.commit()
                
                # Add items
                total = 0
                num_items = random.randint(1, 4)
                for _ in range(num_items):
                    prod = random.choice(products)
                    qty = random.randint(1, 3)
                    item_total = prod.price * qty
                    total += item_total
                    
                    item = OrderItem(
                        order_id=order.id,
                        product_id=prod.id,
                        quantity=qty,
                        price=prod.price,
                        notes="Sin cebolla" if random.random() > 0.8 else None
                    )
                    db.add(item)
                    
                order.total = total
                db.add(order)
                order_count += 1

            db.commit()
            print(f"Created {order_count} total orders (Historical + Active).")

    except Exception as e:
        print(f"Error initializing DB: {e}")
        db.rollback()
    finally:
        db.close()
        print("Done.")

if __name__ == "__main__":
    init_db()
