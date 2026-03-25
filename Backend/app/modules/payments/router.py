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
from app.core.dependencies import get_current_user, require_admin
from app.models.user import User
from app.models.order import Order, OrderStatus
from app.models.payment import Payment, PaymentMethod, PaymentStatus
from app.models.credit_note import CreditNote
from app.models.table import Table, TableStatus
from .schemas import PaymentCreate, PaymentResponse, ReceiptRead, ReceiptItem, CancelPaymentRequest
from .service import generar_numero_factura, generar_numero_nota_credito

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
    c.drawString(5 * mm, y, f"Factura: {data['numero_factura']}")
    y -= 4 * mm
    c.setFont("Courier", 8)
    c.drawString(5 * mm, y, f"Fecha: {data['date']}")
    y -= 3 * mm
    c.drawString(5 * mm, y, f"Mesa: {data['table']}")
    y -= 3 * mm
    customer_name = data.get('customer_name') or 'Consumidor Final'
    c.drawString(5 * mm, y, f"Cliente: {customer_name[:20]}")
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
    y -= 8 * mm
    
    c.setFont("Helvetica", 10)
    c.drawCentredString(width/2, y, "Calle Principal #123, Santo Domingo, RD | Tel: (809) 555-1234")
    y -= 12 * mm

    c.drawString(20 * mm, y, f"Factura: {data['numero_factura']}")
    c.drawRightString(width - 20 * mm, y, f"Fecha: {data['date']}")
    y -= 5 * mm
    customer_name = data.get('customer_name') or 'Consumidor Final'
    c.drawString(20 * mm, y, f"Cliente: {customer_name}")
    c.drawRightString(width - 20 * mm, y, f"Mesa: {data['table']}")
    y -= 5 * mm
    c.drawString(20 * mm, y, f"Atendió: {data['waiter']}")
    c.drawRightString(width - 20 * mm, y, f"Cajero: {data.get('cashier', 'N/A')}")
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
    """Genera HTML para vista previa en formato de Ticket Térmico POS (58mm/80mm)"""
    
    # Custom alignment helper functions
    def padLeft(val, length):
        s = str(val)
        return s if len(s) >= length else " " * (length - len(s)) + s
        
    def padRight(val, length):
        s = str(val)
        return s if len(s) >= length else s + " " * (length - len(s))

    items_html = ""
    max_name_len = 14
    for item in data['items']:
        name = item['name'][:max_name_len]
        qty = padLeft(str(item['quantity']), 2)
        price = padLeft(f"${item['price']:.2f}", 8)
        sub = padLeft(f"${item['subtotal']:.2f}", 9)
        
        items_html += f"{padRight(name, max_name_len)} {qty} x {price} {sub}\\n"
        if item.get('notes'):
            items_html += f"  ({item['notes'][:25]})\\n"

    change_html = f"\\nRecibido:              ${data['amount_received']:.2f}\\nCambio:                ${data['change']:.2f}" if data.get('change', 0) > 0 else ""
    tip_html = f"\\nPropina:               ${data['tip']:.2f}" if data['tip'] > 0 else ""

    html_content = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Recibo {data['numero_factura']}</title>
        <style>
            @media print {{
                @page {{ margin: 0; }}
                body {{ margin: 0; padding: 0; }}
                .no-print {{ display: none !important; }}
            }}
            body {{ 
                font-family: 'Courier New', Courier, monospace; 
                font-size: 13px; 
                line-height: 1.2;
                color: #000; 
                width: 300px; /* Thermal width max ~80mm */
                margin: 0 auto; 
                padding: 15px; 
                background: #fff;
            }}
            .center {{ text-align: center; }}
            .bold {{ font-weight: bold; }}
            .text-divider {{
                white-space: pre;
                text-align: center;
                margin: 4px 0;
            }}
            pre {{
                margin: 0;
                font-family: inherit;
                font-size: inherit;
                white-space: pre-wrap;
            }}
            h2 {{
                font-size: 20px;
                text-transform: uppercase;
                margin: 0 0 5px 0;
                font-weight: 900;
                letter-spacing: 1px;
            }}
            .header-info {{ font-size: 11px; margin-bottom: 8px; }}
            .footer-info {{ font-size: 11px; margin-top: 15px; text-align: center; }}
            .btn-print {{
                width: 100%;
                padding: 15px;
                background: #1e293b;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                margin-bottom: 25px;
                font-weight: bold;
                font-size: 14px;
            }}
        </style>
    </head>
    <body onload="window.focus()">
        <button class="no-print btn-print" onclick="window.print()">🖨️ IMPRIMIR RECIBO</button>
        
        <div class="center">
            <h2>APPetito</h2>
            <div class="header-info">
                Calle Principal #123<br>
                Santo Domingo, RD<br>
                Tel: (809) 555-1234
            </div>
            <div class="bold" style="margin-top: 5px;">RECIBO DE PAGO</div>
            <div>{data['date']}</div>
        </div>
        
        <div class="text-divider">--------------------------------</div>
        
        <div>Factura #: <span class="bold">{data['numero_factura']}</span></div>
        <div>{data['table']}</div>
        <div>Cliente: {data.get('customer_name') or 'Consumidor Final'}</div>
        
        <div class="text-divider">--------------------------------</div>
        
        <pre class="bold">CANT DESCRIPCION        TOTAL</pre>
        <pre>{items_html or 'Sin productos'}</pre>
        
        <div class="text-divider">--------------------------------</div>
        
        <pre>Subtotal:              ${data['subtotal']:.2f}
ITBIS (18%):           ${data['tax']:.2f}{tip_html}
<span style="font-size: 15px; font-weight: bold;">TOTAL:                 ${data['total']:.2f}</span>
Metodo: {data['payment_method'].capitalize()}{change_html}</pre>
        
        <div class="text-divider">--------------------------------</div>
        
        <div class="footer-info">
            <p class="bold" style="font-size:13px">¡GRACIAS POR SU PREFERENCIA!</p>
            <p>Atendido por: {data['waiter']}<br>Cajero: {data['cashier']}</p>
        </div>
    </body>
    </html>
    """
    return html_content

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
        
        # 2. Validar estado de la orden (no debe estar cancelada ni ya pagada)
        if order.status in [OrderStatus.CANCELLED, OrderStatus.PAID]:
            raise HTTPException(
                400, 
                f"No se puede cobrar una orden en estado '{order.status}'. Estado v\u00e1lido: cualquier estado activo."
            )
        
        # 3. Verificar que no esté ya pagada
        existing_payment = db.query(Payment).filter(Payment.order_id == order.id).first()
        if existing_payment:
            raise HTTPException(400, "Esta orden ya fue pagada")
        
        # 4. Generar número de factura único
        numero_factura = generar_numero_factura(db, current_user.id_empresa)
        
        # 5. Calcular montos (usar valores de la orden que ya incluyen tax)
        subtotal = order.subtotal
        tax = order.tax
        total_with_tip = order.total + payment_data.tip_amount
        change = None
        
        if payment_data.payment_method == PaymentMethod.CASH:
            if payment_data.amount_received is None:
                raise HTTPException(400, "amount_received es requerido para pagos en efectivo")
            if payment_data.amount_received < total_with_tip:
                raise HTTPException(
                    400, 
                    f"Monto recibido insuficiente. Total: ${total_with_tip}, Recibido: ${payment_data.amount_received}"
                )
            change = payment_data.amount_received - total_with_tip
        
        # 6. Crear registro de pago con empresa
        new_payment = Payment(
            order_id=order.id,
            numero_factura=numero_factura,
            status=PaymentStatus.CONFIRMED,
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
        table = None
        if order.table_id:
            table = db.query(Table).filter(
                Table.id == order.table_id,
                Table.id_empresa == current_user.id_empresa
            ).first()
            
            if table:
                # Cambiar estado a LIBRE
                table.status = TableStatus.LIBRE
                print(f"Mesa {table.number} liberada automáticamente por pago de orden {order.id}")
        
        # 9. Commit de transacción
        db.commit()
        db.refresh(new_payment)
        
        # Construct response with table_number
        response = PaymentResponse.model_validate(new_payment)
        if table:
            response.table_number = str(table.number)
            
        return response
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        import traceback
        print(f"ERROR en process_payment: {str(e)}")
        print(traceback.format_exc())
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
        "numero_factura": payment.numero_factura,
        "date": payment.created_at.strftime("%d/%m/%Y %H:%M:%S"),
        "table": f"Mesa {order.table.number}" if order.table else "Para llevar",
        "waiter": order.user.nombre if order.user else "N/A",
        "cashier": payment.processed_by_user.nombre if payment.processed_by_user else "N/A",
        "customer_name": order.customer_name if hasattr(order, 'customer_name') else None,
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
        filename = f"ticket-{payment.numero_factura}.pdf"
    else:  # pdf/A4
        pdf_buffer = generate_pdf_receipt(receipt_data)
        filename = f"recibo-{payment.numero_factura}.pdf"
        
    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename={filename}"
        }
    )

@router.post("/{payment_id}/cancel")
async def cancel_payment(
    payment_id: int,
    body: CancelPaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    # 1. Buscar el pago filtrando por empresa
    pago = db.scalars(
        select(Payment)
        .where(Payment.id == payment_id)
        .where(Payment.id_empresa == current_user.id_empresa)
    ).first()

    if not pago:
        raise HTTPException(404, "Pago no encontrado")

    # 2. Verificar que no esté ya cancelado
    if pago.status == PaymentStatus.CANCELLED:
        raise HTTPException(409, "Este pago ya fue cancelado anteriormente")

    # 3. Verificar que no tenga nota de crédito ya emitida
    nc_existente = db.scalars(
        select(CreditNote).where(CreditNote.payment_id == payment_id)
    ).first()

    if nc_existente:
        raise HTTPException(409, f"Ya existe la nota de crédito {nc_existente.numero_nc}")

    # 4. Crear nota de crédito + marcar pago como cancelado
    try:
        numero_nc = generar_numero_nota_credito(db, current_user.id_empresa)

        nota_credito = CreditNote(
            payment_id    = payment_id,
            id_empresa    = current_user.id_empresa,
            numero_nc     = numero_nc,
            motivo        = body.motivo,
            monto         = float(pago.total_amount),
            cancelado_por = current_user.id,
        )
        db.add(nota_credito)

        pago.status = PaymentStatus.CANCELLED

        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(500, "Error al procesar la cancelación")

    return {
        "mensaje": "Pago cancelado exitosamente",
        "numero_factura_original": pago.numero_factura,
        "nota_credito": numero_nc,
    }

@router.put("/{payment_id}")
async def update_payment(payment_id: int):
    raise HTTPException(
        403,
        "Los pagos confirmados son documentos fiscales inmutables. "
        "Para anular, use el endpoint de cancelación."
    )

@router.delete("/{payment_id}")
async def delete_payment(payment_id: int):
    raise HTTPException(
        403,
        "Los pagos no pueden eliminarse. "
        "Para anular, emita una nota de crédito."
    )
