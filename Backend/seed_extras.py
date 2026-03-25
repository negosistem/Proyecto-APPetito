import os
import sys

# Add current directory to sys.path to find 'app'
sys.path.append(os.getcwd())

from app.db.session import engine, SessionLocal
from app.models.product import Product
from app.models.company import Company
from app.models.product_extra import ProductExtra, ProductIngredient

def seed_data():
    db = SessionLocal()
    try:
        # Get first company, or create one if none
        company = db.query(Company).first()
        if not company:
            print("No company found, creating one...")
            company = Company(
                nombre="Restaurante Demo",
                numero_registro="123456",
                email="demo@example.com",
                telefono="8091234567"
            )
            db.add(company)
            db.commit()
            db.refresh(company)
        
        id_empresa = company.id
        
        # Check if Mofongo Clásico exists
        product = db.query(Product).filter(Product.name == "Mofongo Clásico", Product.id_empresa == id_empresa).first()
        
        if not product:
            print("Creating Mofongo Clásico product...")
            product = Product(
                name="Mofongo Clásico",
                description="Delicioso mofongo dominicano con chicharrón, ajo y un toque de caldo.",
                price=350.0,
                category="Platos principales",
                is_active=True,
                tiempo_preparacion=15,
                id_empresa=id_empresa
            )
            db.add(product)
            db.commit()
            db.refresh(product)
        else:
            print("Mofongo Clásico already exists.")

        # Extras
        extras_data = [
            {"name": "Queso extra", "price": 50.0},
            {"name": "Aguacate", "price": 40.0},
            {"name": "Huevo frito", "price": 35.0},
            {"name": "Camarones", "price": 120.0},
            {"name": "Chicharrón extra", "price": 60.0},
        ]

        print("Adding extras...")
        for ed in extras_data:
            exists = db.query(ProductExtra).filter(
                ProductExtra.product_id == product.id, 
                ProductExtra.name == ed["name"]
            ).first()
            if not exists:
                extra = ProductExtra(
                    product_id=product.id,
                    id_empresa=id_empresa,
                    name=ed["name"],
                    price=ed["price"]
                )
                db.add(extra)

        # Ingredients (removable)
        ing_data = [
            {"name": "Ajo", "removable": True},
            {"name": "Chicharrón", "removable": False}, # Mofongo base must have chicharron
            {"name": "Cebolla", "removable": True},
            {"name": "Cilantro", "removable": True},
        ]

        print("Adding ingredients...")
        for idata in ing_data:
            exists = db.query(ProductIngredient).filter(
                ProductIngredient.product_id == product.id,
                ProductIngredient.name == idata["name"]
            ).first()
            if not exists:
                ing = ProductIngredient(
                    product_id=product.id,
                    id_empresa=id_empresa,
                    name=idata["name"],
                    removable=idata["removable"]
                )
                db.add(ing)

        db.commit()
        print("Done seeding data.")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
