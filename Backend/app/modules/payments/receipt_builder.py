import io

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas


def format_amount(value: float | int | str | None) -> str:
    return f"{float(value or 0):,.2f}"


def generate_thermal_receipt(data: dict) -> io.BytesIO:
    buffer = io.BytesIO()
    width = 80 * mm
    payments_height = max(len(data.get("payments", [])), 1) * 5
    est_height = (92 + (len(data["items"]) * 8) + payments_height) * mm
    height = max(180 * mm, est_height)

    c = canvas.Canvas(buffer, pagesize=(width, height))
    c.setFont("Courier", 9)

    y = height - 10 * mm
    x_center = width / 2

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

    c.setFont("Courier-Bold", 9)
    c.drawString(5 * mm, y, f"Factura: {data['numero_factura']}")
    y -= 4 * mm
    c.setFont("Courier", 8)
    c.drawString(5 * mm, y, f"Fecha: {data['date']}")
    y -= 3 * mm
    c.drawString(5 * mm, y, f"Mesa: {data['table']}")
    y -= 3 * mm
    c.drawString(5 * mm, y, f"Cliente: {(data.get('customer_name') or 'Consumidor Final')[:20]}")
    y -= 3 * mm
    c.drawString(5 * mm, y, f"Atendio: {data['waiter']}")
    y -= 5 * mm

    c.line(5 * mm, y, width - 5 * mm, y)
    y -= 4 * mm

    c.setFont("Courier-Bold", 9)
    c.drawString(5 * mm, y, "PRODUCTOS")
    y -= 4 * mm

    c.setFont("Courier", 8)
    for item in data["items"]:
        c.drawString(5 * mm, y, f"{item['quantity']}x {item['name']}"[:30])
        c.drawRightString(width - 5 * mm, y, format_amount(item["subtotal"]))
        y -= 3 * mm
        if item.get("notes"):
            c.setFont("Courier", 7)
            c.drawString(8 * mm, y, f"({item['notes'][:25]})")
            c.setFont("Courier", 8)
            y -= 3 * mm

    y -= 2 * mm
    c.line(5 * mm, y, width - 5 * mm, y)
    y -= 4 * mm

    c.drawString(5 * mm, y, "Subtotal:")
    c.drawRightString(width - 5 * mm, y, format_amount(data["subtotal"]))
    y -= 3.5 * mm
    c.drawString(5 * mm, y, "ITBIS:")
    c.drawRightString(width - 5 * mm, y, format_amount(data["tax"]))
    y -= 3.5 * mm
    if data.get("discount", 0) > 0:
        c.drawString(5 * mm, y, "Descuento:")
        c.drawRightString(width - 5 * mm, y, format_amount(data["discount"]))
        y -= 3.5 * mm
    if data.get("tip", 0) > 0:
        c.drawString(5 * mm, y, "Propina:")
        c.drawRightString(width - 5 * mm, y, format_amount(data["tip"]))
        y -= 3.5 * mm

    c.setFont("Courier-Bold", 10)
    c.drawString(5 * mm, y, "TOTAL ORDEN:")
    c.drawRightString(width - 5 * mm, y, format_amount(data["total"]))
    y -= 5 * mm

    c.setFont("Courier-Bold", 9)
    c.drawString(5 * mm, y, "PAGOS REGISTRADOS")
    y -= 4 * mm
    c.setFont("Courier", 8)
    for payment in data.get("payments", []):
        c.drawString(5 * mm, y, f"{payment['payment_method'].capitalize()} {payment['numero_factura']}"[:28])
        c.drawRightString(width - 5 * mm, y, format_amount(payment["amount"]))
        y -= 3 * mm

    y -= 2 * mm
    c.line(5 * mm, y, width - 5 * mm, y)
    y -= 4 * mm

    c.drawString(5 * mm, y, "Pagado:")
    c.drawRightString(width - 5 * mm, y, format_amount(data["paid_amount"]))
    y -= 3.5 * mm
    c.drawString(5 * mm, y, "Pendiente:")
    c.drawRightString(width - 5 * mm, y, format_amount(data["remaining_balance"]))
    y -= 4 * mm

    c.drawString(5 * mm, y, f"Metodo actual: {data['payment_method'].capitalize()}")
    y -= 4 * mm
    if data.get("amount_received") is not None:
        c.drawString(5 * mm, y, "Recibido:")
        c.drawRightString(width - 5 * mm, y, format_amount(data["amount_received"]))
        y -= 3.5 * mm
    if data.get("change") and data["change"] > 0:
        c.drawString(5 * mm, y, "Cambio:")
        c.drawRightString(width - 5 * mm, y, format_amount(data["change"]))
        y -= 4 * mm

    c.line(5 * mm, y, width - 5 * mm, y)
    y -= 5 * mm
    c.setFont("Courier-Bold", 10)
    c.drawCentredString(
        x_center,
        y,
        "CUENTA SALDADA" if data["remaining_balance"] == 0 else "PAGO PARCIAL REGISTRADO",
    )
    y -= 4 * mm
    c.setFont("Courier", 8)
    c.drawCentredString(x_center, y, "www.appetito.com")
    y -= 5 * mm
    c.drawString(5 * mm, y, f"Cajero: {data['cashier']}")

    c.save()
    buffer.seek(0)
    return buffer


def generate_pdf_receipt(data: dict) -> io.BytesIO:
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    y = height - 20 * mm
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(width / 2, y, "RESTAURANTE APPETITO - RECIBO DE PAGO")
    y -= 8 * mm

    c.setFont("Helvetica", 10)
    c.drawCentredString(width / 2, y, "Calle Principal #123, Santo Domingo, RD | Tel: (809) 555-1234")
    y -= 12 * mm

    c.drawString(20 * mm, y, f"Factura: {data['numero_factura']}")
    c.drawRightString(width - 20 * mm, y, f"Fecha: {data['date']}")
    y -= 5 * mm
    c.drawString(20 * mm, y, f"Cliente: {data.get('customer_name') or 'Consumidor Final'}")
    c.drawRightString(width - 20 * mm, y, f"Mesa: {data['table']}")
    y -= 5 * mm
    c.drawString(20 * mm, y, f"Atendio: {data['waiter']}")
    c.drawRightString(width - 20 * mm, y, f"Cajero: {data.get('cashier', 'N/A')}")
    y -= 10 * mm

    c.line(20 * mm, y, width - 20 * mm, y)
    y -= 5 * mm
    c.setFont("Helvetica-Bold", 10)
    c.drawString(25 * mm, y, "Producto")
    c.drawCentredString(width / 2 + 20 * mm, y, "Cant.")
    c.drawRightString(width - 25 * mm, y, "Total")
    y -= 3 * mm
    c.line(20 * mm, y, width - 20 * mm, y)
    y -= 7 * mm

    c.setFont("Helvetica", 10)
    for item in data["items"]:
        c.drawString(25 * mm, y, item["name"])
        c.drawCentredString(width / 2 + 20 * mm, y, str(item["quantity"]))
        c.drawRightString(width - 25 * mm, y, format_amount(item["subtotal"]))
        y -= 6 * mm

    y -= 4 * mm
    c.setFont("Helvetica-Bold", 11)
    c.drawString(20 * mm, y, "Pagos realizados")
    y -= 6 * mm
    c.setFont("Helvetica", 9)
    for payment in data.get("payments", []):
        c.drawString(25 * mm, y, f"{payment['payment_method'].capitalize()} - {payment['numero_factura']}")
        c.drawRightString(width - 25 * mm, y, format_amount(payment["amount"]))
        y -= 5 * mm

    y -= 5 * mm
    c.line(width / 2 + 20 * mm, y, width - 20 * mm, y)
    y -= 7 * mm

    summary_rows = [
        ("Subtotal:", data["subtotal"]),
        ("ITBIS:", data["tax"]),
    ]
    if data.get("discount", 0) > 0:
        summary_rows.append(("Descuento:", data["discount"]))
    if data.get("tip", 0) > 0:
        summary_rows.append(("Propina:", data["tip"]))
    summary_rows.extend(
        [
            ("Total orden:", data["total"]),
            ("Pagado:", data["paid_amount"]),
            ("Pendiente:", data["remaining_balance"]),
        ]
    )

    c.setFont("Helvetica", 10)
    for label, value in summary_rows:
        c.drawString(width / 2 + 30 * mm, y, label)
        c.drawRightString(width - 25 * mm, y, format_amount(value))
        y -= 6 * mm

    y -= 8 * mm
    c.setFont("Helvetica-Oblique", 10)
    c.drawCentredString(
        width / 2,
        y,
        "Cuenta saldada" if data["remaining_balance"] == 0 else "Pago parcial registrado",
    )

    c.save()
    buffer.seek(0)
    return buffer


def generate_html_receipt(data: dict) -> str:
    items_html = ""
    max_name_len = 14
    for item in data["items"]:
        name = item["name"][:max_name_len]
        qty = str(item["quantity"]).rjust(2)
        price = format_amount(item["price"]).rjust(8)
        sub = format_amount(item["subtotal"]).rjust(9)
        items_html += f"{name.ljust(max_name_len)} {qty} x {price} {sub}\\n"
        if item.get("notes"):
            items_html += f"  ({item['notes'][:25]})\\n"

    payments_html = "\\n".join(
        f"{payment['payment_method'].capitalize():<12} {payment['numero_factura']:<16} {format_amount(payment['amount']).rjust(10)}"
        for payment in data.get("payments", [])
    ) or "Sin pagos registrados"

    summary_lines = [
        f"Subtotal:              {format_amount(data['subtotal'])}",
        f"ITBIS:                 {format_amount(data['tax'])}",
    ]
    if data.get("discount", 0) > 0:
        summary_lines.append(f"Descuento:             {format_amount(data['discount'])}")
    if data.get("tip", 0) > 0:
        summary_lines.append(f"Propina:               {format_amount(data['tip'])}")
    summary_lines.extend(
        [
            f"TOTAL ORDEN:           {format_amount(data['total'])}",
            f"Pagado:                {format_amount(data['paid_amount'])}",
            f"Pendiente:             {format_amount(data['remaining_balance'])}",
            f"Metodo actual:         {data['payment_method'].capitalize()}",
        ]
    )
    if data.get("amount_received") is not None:
        summary_lines.append(f"Recibido:              {format_amount(data['amount_received'])}")
    if data.get("change") and data["change"] > 0:
        summary_lines.append(f"Cambio:                {format_amount(data['change'])}")

    footer_message = "CUENTA SALDADA" if data["remaining_balance"] == 0 else "PAGO PARCIAL REGISTRADO"

    return f"""
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
                width: 300px;
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
        <button class="no-print btn-print" onclick="window.print()">IMPRIMIR RECIBO</button>

        <div class="center">
            <h2>APPetito</h2>
            <div>Calle Principal #123</div>
            <div>Santo Domingo, RD</div>
            <div>Tel: (809) 555-1234</div>
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

        <pre class="bold">METODO FACTURA             MONTO</pre>
        <pre>{payments_html}</pre>

        <div class="text-divider">--------------------------------</div>

        <pre>{chr(10).join(summary_lines)}</pre>

        <div class="text-divider">--------------------------------</div>

        <div class="center bold">{footer_message}</div>
        <div class="center">Atendido por: {data['waiter']}</div>
        <div class="center">Cajero: {data['cashier']}</div>
    </body>
    </html>
    """
