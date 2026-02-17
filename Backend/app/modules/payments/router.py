from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Optional
from decimal import Decimal
import io
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib import colors

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.order import Order, OrderStatus
from app.models.payment import Payment
from app.models.table import Table, TableStatus
from .schemas import PaymentCreate, PaymentResponse, ReceiptRead, ReceiptItem

# --- Receipt Generation Helpers ---

def generate_thermal_receipt(data: dict) -> io.BytesIO:
    """Genera PDF optimizado para impresora térmica de 80mm"""
    buffer = io.BytesIO()
    width = 80 * mm
    # Aproximate height based on items to avoid huge empty space
    # 60mm header/footer + 10mm per item
    est_height = (70 + (len(data['items']) * 8)) * mm
    height = max(150 * mm, est_height) 
    
    c = canvas.Canvas(buffer, pagesize=(width, height))
    c.setFont("Courier", 9)
    
    y = height - 10 * mm
    x_center = width / 2
    
    # Header
    c.setFont("Courier-Bold", 11)
    c.drawCentredString(x_center, y, "RESTAURANTE APPETITO")
    y -= 4 * mm
    c.setFont("Courier", 8)
    c.drawCentredString(x_center, y, "Calle Principal #123")
    y -= 3 * mm
    c.drawCentredString(x_center, y, "Santo Domingo, RD")
    y -= 3 * mm
    c.drawCentredString(x_center, y, "Tel: (809) 555-1234")
    y -= 5 * mm
    
    c.line(5 * mm, y, width - 5 * mm, y)
    y -= 5 * mm
    
    # Invoice Info
    c.setFont("Courier-Bold", 9)
    c.drawString(5 * mm, y, f"Factura: {data['invoice_number']}")
    y -= 4 * mm
    c.setFont("Courier", 8)
    c.drawString(5 * mm, y, f"Fecha: {data['date']}")
    y -= 3 * mm
    c.drawString(5 * mm, y, f"Mesa: {data['table']}")
    y -= 3 * mm
    c.drawString(5 * mm, y, f"Atendio: {data['waiter']}")
    y -= 5 * mm
    
    c.line(5 * mm, y, width - 5 * mm, y)
    y -= 4 * mm
    
    # Products
    c.setFont("Courier-Bold", 9)
    c.drawString(5 * mm, y, "PRODUCTOS")
    y -= 4 * mm
    
    c.setFont("Courier", 8)
    for item in data['items']:
        line = f"{item['quantity']}x {item['name']}"
        c.drawString(5 * mm, y, line[:30])
        price_str = f"${item['subtotal']:.2f}"
        c.drawRightString(width - 5 * mm, y, price_str)
        y -= 3 * mm
        if item.get('notes'):
            c.setFont("Courier", 7)
            c.drawString(8 * mm, y, f"({item['notes']})")
            c.setFont("Courier", 8)
            y -= 3 * mm
            
    y -= 2 * mm
    c.line(5 * mm, y, width - 5 * mm, y)
    y -= 4 * mm
    
    # Totals
    c.setFont("Courier", 9)
    c.drawString(5 * mm, y, "Subtotal:")
    c.drawRightString(width - 5 * mm, y, f"${data['subtotal']:.2f}")
    y -= 3.5 * mm
    tax_pct = int((data['tax'] / data['subtotal'] * 100)) if data['subtotal'] > 0 else 18
    c.drawString(5 * mm, y, f"Impuesto ({tax_pct}%):")
    c.drawRightString(width - 5 * mm, y, f"${data['tax']:.2f}")
    y -= 4 * mm
    
    c.line(5 * mm, y, width - 5 * mm, y)
    y -= 4 * mm
    
    c.setFont("Courier-Bold", 10)
    c.drawString(5 * mm, y, "TOTAL:")
    c.drawRightString(width - 5 * mm, y, f"${(data['subtotal'] + data['tax']):.2f}")
    y -= 5 * mm
    
    if data['tip'] > 0:
        c.setFont("Courier", 9)
        c.drawString(5 * mm, y, "Propina:")
        c.drawRightString(width - 5 * mm, y, f"${data['tip']:.2f}")
        y -= 4 * mm
        c.line(5 * mm, y, width - 5 * mm, y)
        y -= 4 * mm
        c.setFont("Courier-Bold", 10)
        c.drawString(5 * mm, y, "TOTAL A PAGAR:")
        c.drawRightString(width - 5 * mm, y, f"${data['total']:.2f}")
        y -= 5 * mm

    c.setFont("Courier", 9)
    c.drawString(5 * mm, y, f"Metodo: {data['payment_method'].capitalize()}")
    y -= 4 * mm
    
    if data.get('change') and data['change'] > 0:
        c.drawString(5 * mm, y, f"Recibido:")
        c.drawRightString(width - 5 * mm, y, f"${data['amount_received']:.2f}")
        y -= 3.5 * mm
        c.setFont("Courier-Bold", 9)
        c.drawString(5 * mm, y, f"Cambio:")
        c.drawRightString(width - 5 * mm, y, f"${data['change']:.2f}")
        y -= 5 * mm
        
    y -= 3 * mm
    c.line(5 * mm, y, width - 5 * mm, y)
    y -= 5 * mm
    c.setFont("Courier-Bold", 10)
    c.drawCentredString(x_center, y, "¡GRACIAS POR SU PREFERENCIA!")
    y -= 4 * mm
    c.setFont("Courier", 8)
    c.drawCentredString(x_center, y, "www.appetito.com")
    y -= 5 * mm
    c.setFont("Courier", 7)
    c.drawString(5 * mm, y, f"Cajero: {data['cashier']}")
    y -= 3 * mm
    c.drawString(5 * mm, y, "Sistema: APPetito v1.0")
    
    c.save()
    buffer.seek(0)
    return buffer

def generate_pdf_receipt(data: dict) -> io.BytesIO:
    """Genera PDF estándar A4"""
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    
    # Simple standardized layout
    y = height - 20 * mm
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(width/2, y, "RESTAURANTE APPETITO - RECIBO DE PAGO")
    y -= 10 * mm
    
    c.setFont("Helvetica", 10)
    c.drawString(20 * mm, y, f"Factura: {data['invoice_number']}")
    c.drawRightString(width - 20 * mm, y, f"Fecha: {data['date']}")
    y -= 5 * mm
    c.drawString(20 * mm, y, f"Mesa: {data['table']}")
    c.drawRightString(width - 20 * mm, y, f"Atendió: {data['waiter']}")
    y -= 10 * mm
    
    # Table Header
    c.line(20 * mm, y, width - 20 * mm, y)
    y -= 5 * mm
    c.setFont("Helvetica-Bold", 10)
    c.drawString(25 * mm, y, "Producto")
    c.drawCentredString(width/2 + 20 * mm, y, "Cant.")
    c.drawRightString(width - 25 * mm, y, "Total")
    y -= 3 * mm
    c.line(20 * mm, y, width - 20 * mm, y)
    y -= 7 * mm
    
    c.setFont("Helvetica", 10)
    for item in data['items']:
        c.drawString(25 * mm, y, item['name'])
        c.drawCentredString(width/2 + 20 * mm, y, str(item['quantity']))
        c.drawRightString(width - 25 * mm, y, f"${item['subtotal']:.2f}")
        y -= 6 * mm
    
    y -= 5 * mm
    c.line(width/2 + 30 * mm, y, width - 20 * mm, y)
    y -= 7 * mm
    
    c.drawString(width/2 + 30 * mm, y, "Subtotal:")
    c.drawRightString(width - 25 * mm, y, f"${data['subtotal']:.2f}")
    y -= 6 * mm
    c.drawString(width/2 + 30 * mm, y, "ITBIS (18%):")
    c.drawRightString(width - 25 * mm, y, f"${data['tax']:.2f}")
    y -= 6 * mm
    if data['tip'] > 0:
        c.drawString(width/2 + 30 * mm, y, "Propina:")
        c.drawRightString(width - 25 * mm, y, f"${data['tip']:.2f}")
        y -= 6 * mm
        
    c.setFont("Helvetica-Bold", 12)
    c.drawString(width/2 + 30 * mm, y, "TOTAL:")
    c.drawRightString(width - 25 * mm, y, f"${data['total']:.2f}")
    
    y -= 20 * mm
    c.setFont("Helvetica-Oblique", 10)
    c.drawCentredString(width/2, y, "¡GRACIAS POR SU PREFERENCIA!")
    
    c.save()
    buffer.seek(0)
    return buffer

def generate_html_receipt(data: dict) -> str:
    """Genera HTML para vista previa"""
    items_html = "".join([
        f"<tr><td>{item['quantity']}x {item['name']}</td><td style='text-align:right'>${item['price']:.2f}</td><td style='text-align:right'>${item['subtotal']:.2f}</td></tr>"
        + (f"<tr><td colspan='3' style='font-size:11px;color:#666;padding-left:15px'>({item['notes']})</td></tr>" if item.get('notes') else "")
        for item in data['items']
    ])
    
    tip_row = f"<tr><td colspan='2'>Propina:</td><td style='text-align:right'>${data['tip']:.2f}</td></tr>" if data['tip'] > 0 else ""
    change_html = f"<tr><td colspan='2'>Recibido:</td><td style='text-align:right'>${data['amount_received']:.2f}</td></tr><tr><td colspan='2'><strong>Cambio:</strong></td><td style='text-align:right;color:green'><strong>${data['change']:.2f}</strong></td></tr>" if data.get('change', 0) > 0 else ""

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: 'Courier New', monospace; max-width: 400px; margin: 20px auto; padding: 20px; border: 1px solid #ccc; }}
            .header {{ text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 15px; }}
            th {{ border-bottom: 1px solid #000; text-align: left; }}
            .totals {{ border-top: 2px solid #000; margin-top: 10px; padding-top: 10px; }}
            .grand-total {{ font-size: 1.2em; font-weight: bold; border-top: 1px double #000; }}
            @media print {{ .no-print {{ display: none; }} }}
        </style>
    </head>
    <body onload="window.focus()">
        <button class="no-print" onclick="window.print()" style="width:100%;padding:10px;background:#ff6b00;color:white;border:none;border-radius:5px;cursor:pointer;margin-bottom:20px">🖨️ IMPRIMIR RECIBO</button>
        <div class="header">
            <h3>RESTAURANTE APPETITO</h3>
            <p>Calle Principal #123<br>Tel: (809) 555-1234</p>
        </div>
        <p><strong>Factura:</strong> {data['invoice_number']}<br>
           <strong>Fecha:</strong> {data['date']}<br>
           <strong>Mesa:</strong> {data['table']}<br>
           <strong>Atendió:</strong> {data['waiter']}</p>
        <table>
            <thead><tr><th>Producto</th><th style="text-align:right">P.Unit</th><th style="text-align:right">Total</th></tr></thead>
            <tbody>{items_html}</tbody>
        </table>
        <table class="totals">
            <tr><td colspan="2">Subtotal:</td><td style="text-align:right">${data['subtotal']:.2f}</td></tr>
            <tr><td colspan="2">Impuesto (18%):</td><td style="text-align:right">${data['tax']:.2f}</td></tr>
            <tr class="grand-total"><td colspan="2">TOTAL:</td><td style="text-align:right">${(data['subtotal'] + data['tax']):.2f}</td></tr>
            {tip_row}
            {"<tr style='font-size:1.1em;font-weight:bold'><td colspan='2'>TOTAL A PAGAR:</td><td style='text-align:right'>$" + f"{data['total']:.2f}" + "</td></tr>" if data['tip'] > 0 else ""}
            <tr><td colspan="3" style="padding-top:10px"><strong>Método:</strong> {data['payment_method'].capitalize()}</td></tr>
            {change_html}
        </table>
        <div style="text-align:center;margin-top:20px;border-top:1px solid #000;padding-top:10px">
            <p>¡GRACIAS POR SU PREFERENCIA!<br>Cajero: {data['cashier']}</p>
        </div>
    </body>
    </html>
    """

router = APIRouter(prefix="/payments", tags=["payments"])

@router.post("/process", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def process_payment(
    payment_data: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Procesar pago de una orden, generar número de factura y liberar mesa automáticamente
    """
    from datetime import datetime
    
    try:
        # 1. Obtener orden con bloqueo para evitar concurrencia y validar empresa
        order = db.query(Order).filter(
            Order.id == payment_data.order_id,
            Order.id_empresa == current_user.id_empresa
        ).with_for_update().first()
        
        if not order:
            raise HTTPException(404, "Orden no encontrada")
        
        # 2. Validar estado de la orden
        if order.status != OrderStatus.SERVED:
            raise HTTPException(
                400, 
                f"La orden debe estar en estado 'served'. Estado actual: {order.status}"
            )
        
        # 3. Verificar que no esté ya pagada
        existing_payment = db.query(Payment).filter(Payment.order_id == order.id).first()
        if existing_payment:
            raise HTTPException(400, "Esta orden ya fue pagada")
        
        # 4. Generar número de factura único
        today = datetime.now().strftime("%Y%m%d")
        
        # Obtener último número de factura del día con lock (dentro de la empresa)
        last_payment = db.query(Payment).filter(
            Payment.invoice_number.like(f"FAC-{today}-%"),
            Payment.id_empresa == current_user.id_empresa
        ).order_by(Payment.id.desc()).with_for_update().first()
        
        if last_payment:
            # Extraer número y sumar 1
            last_num = int(last_payment.invoice_number.split("-")[-1])
            new_num = last_num + 1
        else:
            new_num = 1
        
        invoice_number = f"FAC-{today}-{new_num:05d}"  # FAC-20260210-00001
        
        # 5. Calcular montos (usar valores de la orden que ya incluyen tax)
        subtotal = order.subtotal
        tax = order.tax
        total_with_tip = order.total + payment_data.tip_amount
        change = None
        
        if payment_data.payment_method == "cash":
            if payment_data.amount_received < total_with_tip:
                raise HTTPException(
                    400, 
                    f"Monto recibido insuficiente. Total: ${total_with_tip}, Recibido: ${payment_data.amount_received}"
                )
            change = payment_data.amount_received - total_with_tip
        
        # 6. Crear registro de pago con empresa
        new_payment = Payment(
            order_id=order.id,
            invoice_number=invoice_number,
            subtotal=subtotal,
            tax=tax,
            tip_amount=payment_data.tip_amount,
            total_amount=total_with_tip,
            payment_method=payment_data.payment_method,
            amount_received=payment_data.amount_received,
            change_given=change,
            processed_by=current_user.id,
            id_empresa=current_user.id_empresa
        )
        db.add(new_payment)
        
        # 7. Actualizar estado de la orden
        order.status = OrderStatus.PAID
        order.closed_at = datetime.now()
        
        # 8. Liberar mesa automáticamente
        # 8. Liberar mesa automáticamente
        if order.table_id:
            table = db.query(Table).filter(
                Table.id == order.table_id,
                Table.id_empresa == current_user.id_empresa
            ).first()
            
            if table:
                # Cambiar estado a LIBRE
                table.status = TableStatus.LIBRE
                # Si existiera current_order_id lo limpiaríamos aquí, pero el modelo no lo tiene
                print(f"Mesa {table.number} liberada automáticamente por pago de orden {order.id}")
        
        # 9. Commit de transacción
        db.commit()
        db.refresh(new_payment)
        
        # Construct response with table_number
        response = PaymentResponse.model_validate(new_payment)
        if table:
            response.table_number = table.number
            
        return response
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Error procesando pago: {str(e)}")

@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtener detalles de un pago"""
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.id_empresa == current_user.id_empresa
    ).first()
    if not payment:
        raise HTTPException(404, "Pago no encontrado")
    return payment

@router.get("/order/{order_id}", response_model=PaymentResponse)
def get_payment_by_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtener pago de una orden específica"""
    payment = db.query(Payment).filter(
        Payment.order_id == order_id,
        Payment.id_empresa == current_user.id_empresa
    ).first()
    if not payment:
        raise HTTPException(404, "No se encontró pago para esta orden")
    return payment

@router.get("/{payment_id}/receipt")
def get_receipt(
    payment_id: int,
    format: str = "pdf",  # pdf, thermal, html
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generar recibo de pago en diferentes formatos:
    - pdf: Documento A4 estándar
    - thermal: Ticket de 80mm optimizado
    - html: Vista previa interactiva
    """
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.id_empresa == current_user.id_empresa
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
        
    order = payment.order
    
    # Datos unificados para generadores
    receipt_data = {
        "invoice_number": payment.invoice_number,
        "date": payment.created_at.strftime("%d/%m/%Y %H:%M:%S"),
        "table": f"Mesa {order.table.number}" if order.table else "Para llevar",
        "waiter": order.user.nombre if order.user else "N/A",
        "cashier": payment.processed_by_user.nombre if payment.processed_by_user else "N/A",
        "items": [
            {
                "quantity": item.quantity,
                "name": item.product_name,
                "price": float(item.price),
                "subtotal": float(item.subtotal),
                "notes": item.notes
            }
            for item in order.items
        ],
        "subtotal": float(payment.subtotal),
        "tax": float(payment.tax),
        "tip": float(payment.tip_amount),
        "total": float(payment.total_amount),
        "payment_method": payment.payment_method.value,
        "amount_received": float(payment.amount_received) if payment.amount_received else None,
        "change": float(payment.change_given) if payment.change_given else None
    }
    
    if format == "html":
        return HTMLResponse(content=generate_html_receipt(receipt_data))
    
    if format == "thermal":
        pdf_buffer = generate_thermal_receipt(receipt_data)
        filename = f"ticket-{payment.invoice_number}.pdf"
    else:  # pdf/A4
        pdf_buffer = generate_pdf_receipt(receipt_data)
        filename = f"recibo-{payment.invoice_number}.pdf"
        
    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename={filename}"
        }
    )
