from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.company import Company
from app.models.user import User
from app.modules.settings import schemas
from app.core.dependencies import get_current_user

router = APIRouter(
    prefix="/settings",
    tags=["Settings"]
)

@router.get("/company", response_model=schemas.CompanySettings)
def get_company_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get current company settings (tax rate, currency, invoice prefix).
    """
    company = db.query(Company).filter(Company.id == current_user.id_empresa).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    return schemas.CompanySettings(
        tax_rate=company.tax_rate,
        currency=company.currency,
        invoice_prefix=company.invoice_prefix
    )

@router.patch("/company", response_model=schemas.CompanySettings)
def update_company_settings(
    settings_update: schemas.CompanySettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update company settings.
    Only admin/superadmin can update these settings.
    """
    # Get company
    company = db.query(Company).filter(Company.id == current_user.id_empresa).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    # Check if user is admin or superadmin
    if current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden modificar la configuración"
        )
    
    # Update fields if provided
    if settings_update.tax_rate is not None:
        # Validate tax rate is between 0 and 100
        if settings_update.tax_rate < 0 or settings_update.tax_rate > 100:
            raise HTTPException(
                status_code=400,
                detail="La tasa de impuesto debe estar entre 0 y 100"
            )
        company.tax_rate = settings_update.tax_rate
    
    if settings_update.currency is not None:
        company.currency = settings_update.currency
    
    if settings_update.invoice_prefix is not None:
        company.invoice_prefix = settings_update.invoice_prefix
    
    db.commit()
    db.refresh(company)
    
    return schemas.CompanySettings(
        tax_rate=company.tax_rate,
        currency=company.currency,
        invoice_prefix=company.invoice_prefix
    )
