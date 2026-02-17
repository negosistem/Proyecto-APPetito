from typing import Optional
from pydantic import BaseModel
from decimal import Decimal

class CompanySettings(BaseModel):
    """Company settings response schema"""
    tax_rate: Decimal  # Tax rate percentage (e.g., 18.00 for 18%)
    currency: str
    invoice_prefix: str
    
    class Config:
        from_attributes = True

class CompanySettingsUpdate(BaseModel):
    """Schema for updating company settings"""
    tax_rate: Optional[Decimal] = None
    currency: Optional[str] = None
    invoice_prefix: Optional[str] = None
