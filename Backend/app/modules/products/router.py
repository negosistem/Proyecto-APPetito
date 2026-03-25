from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.models.product import Product as ProductModel, ProductImage as ProductImageModel
from app.models.product_extra import ProductExtra as ProductExtraModel, ProductIngredient as ProductIngredientModel
from app.modules.products import schemas
from app.core.dependencies import get_current_user
from app.models.user import User
from app.utils.file_upload import save_upload_file

router = APIRouter(
    prefix="/products",
    tags=["Products"]
)

@router.post("/upload-media", response_model=dict)
async def upload_media(
    file: UploadFile = File(...),
    file_type: str = "image",
    current_user: User = Depends(get_current_user)
):
    """
    Upload a media file (image or video) for a product.
    Returns the URL of the uploaded file.
    """
    if file_type not in ["image", "video"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="file_type debe ser 'image' o 'video'"
        )
    
    try:
        file_url = await save_upload_file(file, file_type)
        return {"url": file_url}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al subir archivo: {str(e)}"
        )


@router.post("/{product_id}/upload-images", response_model=List[str])
async def upload_images(
    product_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload multiple images for a product. Max 5 images total.
    """
    # Verify product ownership
    product = db.query(ProductModel).filter(
        ProductModel.id == product_id,
        ProductModel.id_empresa == current_user.id_empresa
    ).first()
    
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")
    
    # Check current count
    current_images_count = db.query(ProductImageModel).filter(ProductImageModel.product_id == product_id).count()
    if current_images_count + len(files) > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Máximo 5 imágenes permitidas. El producto ya tiene {current_images_count}."
        )
    
    new_urls = []
    for index, file in enumerate(files):
        if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Archivo {file.filename} no es válido. Solo jpg, png, webp."
            )
        
        try:
            url = await save_upload_file(file, "image")
            new_urls.append(url)
            
            db_image = ProductImageModel(
                url=url,
                product_id=product_id,
                order=current_images_count + index
            )
            db.add(db_image)
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al procesar {file.filename}: {str(e)}"
            )
    
    db.commit()
    db.refresh(product)
    return [img.url for img in product.images]


@router.get("/", response_model=List[schemas.Product])
def get_products(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get products for the menu of the current user's company.
    If include_inactive is False (default), only active products are returned.
    """
    query = db.query(ProductModel).filter(
        ProductModel.id_empresa == current_user.id_empresa
    )
    
    if not include_inactive:
        query = query.filter(ProductModel.is_active == True)
        
    return query.all()

@router.post("/", response_model=schemas.Product, status_code=status.HTTP_201_CREATED)
def create_product(
    product: schemas.ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new product in the menu for the current user's company.
    """
    product_data = product.model_dump()
    images_data = product_data.pop("images", [])
    extras_data = product_data.pop("extras", []) or []
    ingredients_data = product_data.pop("ingredients", []) or []
    
    # Automatically assign company from authenticated user
    db_product = ProductModel(**product_data, id_empresa=current_user.id_empresa)
    db.add(db_product)
    db.flush() # Get ID
    
    # Add images if any
    for img in images_data:
        db_image = ProductImageModel(**img, product_id=db_product.id)
        db.add(db_image)
        
    # Add extras if any
    for ext in extras_data:
        db_extra = ProductExtraModel(**ext, product_id=db_product.id, id_empresa=current_user.id_empresa)
        db.add(db_extra)
        
    # Add ingredients if any
    for ing in ingredients_data:
        db_ingredient = ProductIngredientModel(**ing, product_id=db_product.id, id_empresa=current_user.id_empresa)
        db.add(db_ingredient)
        
    db.commit()
    db.refresh(db_product)
    return db_product

@router.get("/{product_id}", response_model=schemas.Product)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific product by ID, only if it belongs to the current user's company.
    """
    product = db.query(ProductModel).filter(
        ProductModel.id == product_id,
        ProductModel.id_empresa == current_user.id_empresa
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado"
        )
    return product

@router.patch("/{product_id}", response_model=schemas.Product)
def update_product(
    product_id: int,
    product_update: schemas.ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a product in the menu, only if it belongs to the current user's company.
    """
    db_product = db.query(ProductModel).filter(
        ProductModel.id == product_id,
        ProductModel.id_empresa == current_user.id_empresa
    ).first()
    
    if not db_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado"
        )
    
    update_data = product_update.model_dump(exclude_unset=True)
    images_data = update_data.pop("images", None)
    extras_data = update_data.pop("extras", None)
    ingredients_data = update_data.pop("ingredients", None)

    for key, value in update_data.items():
        setattr(db_product, key, value)
    
    # Update gallery if images provided
    if images_data is not None:
        # Clear existing
        db.query(ProductImageModel).filter(ProductImageModel.product_id == product_id).delete()
        # Add new
        for img in images_data:
            db_image = ProductImageModel(**img, product_id=product_id)
            db.add(db_image)
            
    # Update extras if provided
    if extras_data is not None:
        db.query(ProductExtraModel).filter(ProductExtraModel.product_id == product_id).delete()
        for ext in extras_data:
            db_extra = ProductExtraModel(**ext, product_id=product_id, id_empresa=current_user.id_empresa)
            db.add(db_extra)
            
    # Update ingredients if provided
    if ingredients_data is not None:
        db.query(ProductIngredientModel).filter(ProductIngredientModel.product_id == product_id).delete()
        for ing in ingredients_data:
            db_ingredient = ProductIngredientModel(**ing, product_id=product_id, id_empresa=current_user.id_empresa)
            db.add(db_ingredient)
    
    db.commit()
    db.refresh(db_product)
    return db_product

@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a product from the menu, only if it belongs to the current user's company.
    """
    db_product = db.query(ProductModel).filter(
        ProductModel.id == product_id,
        ProductModel.id_empresa == current_user.id_empresa
    ).first()
    
    if not db_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado"
        )
    
    try:
        db.delete(db_product)
        db.commit()
    except Exception as e:
        db.rollback()
        # Check if it's an integrity error (foreign key violation)
        if "foreign key constraint" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se puede eliminar el producto porque está asociado a órdenes o registros existentes."
            )
        raise e
    
    return None


# ─────────────────────────────────────────────────────────
# ── Product Extras CRUD ──────────────────────────────────
# ─────────────────────────────────────────────────────────

@router.post("/{product_id}/extras", response_model=schemas.ProductExtraResponse, status_code=status.HTTP_201_CREATED)
def create_product_extra(
    product_id: int,
    extra: schemas.ProductExtraCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add an extra option to a product."""
    product = db.query(ProductModel).filter(
        ProductModel.id == product_id,
        ProductModel.id_empresa == current_user.id_empresa
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    db_extra = ProductExtraModel(
        product_id=product_id,
        id_empresa=current_user.id_empresa,
        **extra.model_dump()
    )
    db.add(db_extra)
    db.commit()
    db.refresh(db_extra)
    return db_extra


@router.delete("/extras/{extra_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product_extra(
    extra_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a product extra."""
    extra = db.query(ProductExtraModel).filter(
        ProductExtraModel.id == extra_id,
        ProductExtraModel.id_empresa == current_user.id_empresa
    ).first()
    if not extra:
        raise HTTPException(status_code=404, detail="Extra no encontrado")
    db.delete(extra)
    db.commit()
    return None


# ─────────────────────────────────────────────────────────
# ── Product Ingredients CRUD ─────────────────────────────
# ─────────────────────────────────────────────────────────

@router.post("/{product_id}/ingredients", response_model=schemas.ProductIngredientResponse, status_code=status.HTTP_201_CREATED)
def create_product_ingredient(
    product_id: int,
    ingredient: schemas.ProductIngredientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add an ingredient to a product."""
    product = db.query(ProductModel).filter(
        ProductModel.id == product_id,
        ProductModel.id_empresa == current_user.id_empresa
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    db_ingredient = ProductIngredientModel(
        product_id=product_id,
        id_empresa=current_user.id_empresa,
        **ingredient.model_dump()
    )
    db.add(db_ingredient)
    db.commit()
    db.refresh(db_ingredient)
    return db_ingredient


@router.delete("/ingredients/{ingredient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product_ingredient(
    ingredient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a product ingredient."""
    ingredient = db.query(ProductIngredientModel).filter(
        ProductIngredientModel.id == ingredient_id,
        ProductIngredientModel.id_empresa == current_user.id_empresa
    ).first()
    if not ingredient:
        raise HTTPException(status_code=404, detail="Ingrediente no encontrado")
    db.delete(ingredient)
    db.commit()
    return None
