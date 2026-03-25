import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Banknote, Smartphone, CheckCircle, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { paymentService } from '../../payments/services/paymentService';
import { PaymentSuccessModal } from './PaymentSuccessModal';
import { formatNumber } from '@/lib/formatNumber';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: {
        id: number;
        subtotal: number;
        tax: number;
        total: number;
        customer_name?: string | null;
        items: Array<{ product_name?: string; name?: string; quantity: number; price: number; subtotal?: number }>;
    } | null;
    onSuccess: () => void;
    tableNumber?: number | string | null;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, order, onSuccess, tableNumber }) => {
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
    const [amountReceived, setAmountReceived] = useState('');
    const [loading, setLoading] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [paymentData, setPaymentData] = useState<any>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showPrintConfirm, setShowPrintConfirm] = useState(false);
    const [showProcessConfirm, setShowProcessConfirm] = useState(false);

    // Reset all payment state when a new order is selected
    useEffect(() => {
        if (order?.id) {
            setPaymentMethod('cash');
            setAmountReceived('');
            setPaymentSuccess(false);
            setPaymentData(null);
            setInvoiceNumber('');
            setShowSuccessModal(false);
        }
    }, [order?.id]);

    // ESC Handler for cascading modales
    useEffect(() => {
        if (!isOpen) return;
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                if (showSuccessModal) {
                    setShowSuccessModal(false);
                    handleClose();
                } else if (showPrintConfirm) {
                    setShowPrintConfirm(false);
                } else if (showProcessConfirm) {
                    setShowProcessConfirm(false);
                } else {
                    handleClose();
                }
            }
        };
        window.addEventListener('keydown', handleEsc, { capture: true });
        return () => window.removeEventListener('keydown', handleEsc, { capture: true });
    }, [isOpen, showSuccessModal, showPrintConfirm, showProcessConfirm]);

    if (!isOpen || !order) return null;

    const totalToPay = Number(order.total);
    const change = paymentMethod === 'cash' && amountReceived
        ? parseFloat(amountReceived) - totalToPay
        : 0;

    const handleSubmit = async () => {
        if (paymentMethod === 'cash' && (!amountReceived || parseFloat(amountReceived) < totalToPay)) {
            toast.error('Monto insuficiente');
            return;
        }

        setLoading(true);
        try {
            const data = await paymentService.processPayment({
                order_id: order.id,
                tip_amount: 0,
                payment_method: paymentMethod,
                amount_received: paymentMethod === 'cash' ? parseFloat(amountReceived) : null
            });

            setInvoiceNumber(data.numero_factura);
            setPaymentData(data);
            setPaymentSuccess(true);
            setShowSuccessModal(true);
            toast.success(`Pago procesado exitosamente - Factura: ${data.numero_factura}`);

            // We no longer auto-close here, the success modal handles it or the user closes it
            onSuccess();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error procesando pago');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setPaymentSuccess(false);
        setInvoiceNumber('');
        setAmountReceived('');
        setShowPrintConfirm(false);
        setShowProcessConfirm(false);
        onClose();
    };

    // ── Pre-Factura ─────────────────────────────────────────────────────
    const handlePrintPreInvoice = () => {
        if (!order) return;

        const now = new Date();
        const dateStr = now.toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = now.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });

        // Formatter matching ActiveOrderModal
        const fmt = (n: number | string | null | undefined): string =>
            Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        // Padding function for thermal receipt alignment
        const padRight = (str: string, len: number) => {
            const s = String(str);
            return s.length >= len ? s.substring(0, len) : s + ' '.repeat(len - s.length);
        };
        const padLeft = (str: string, len: number) => {
            const s = String(str);
            return s.length >= len ? s.substring(0, len) : ' '.repeat(len - s.length) + s;
        };

        const maxItemNameLen = 14;

        const itemRows = (order.items || []).map(item => {
            const name = (item.product_name || item.name || 'Producto').substring(0, maxItemNameLen);
            const qty = padLeft(String(item.quantity), 2);
            const price = padLeft(fmt(item.price), 8);
            const sub = padLeft(fmt(item.subtotal || (Number(item.price) * item.quantity)), 9);
            return `${padRight(name, maxItemNameLen)} ${qty} x ${price} ${sub}`;
        }).join('\\n');

        const subtotal = Number(order.subtotal);
        const tax = Number(order.tax);
        const total = Number(order.total);

        const customerString = order.customer_name
            ? `Cliente: ${order.customer_name}`
            : 'Cliente: Consumidor Final';

        const tableString = tableNumber ? `Mesa: ${tableNumber}` : 'Para llevar';

        const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Pre-Factura Pedido #${order.id}</title>
  <style>
    @media print {
        @page { margin: 0; }
        body { margin: 0; padding: 0cm; }
    }
    body { 
        font-family: 'Courier New', Courier, monospace; 
        font-size: 13px; 
        line-height: 1.2;
        color: #000; 
        width: 300px; /* Thermal width max ~80mm */
        margin: 0 auto; 
        padding: 15px; 
        background: #fff;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .divider { 
        border: none; 
        border-top: 1px dashed #000; 
        margin: 8px 0; 
    }
    .text-divider {
        white-space: pre;
        text-align: center;
        margin: 4px 0;
    }
    pre {
        margin: 0;
        font-family: inherit;
        font-size: inherit;
        white-space: pre-wrap;
    }
    h2 {
        font-size: 20px;
        text-transform: uppercase;
        margin: 0 0 5px 0;
        font-weight: 900;
        letter-spacing: 1px;
    }
    .grid-totals {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 4px;
        margin-top: 8px;
    }
    .grid-totals > div:nth-child(even) {
        text-align: right;
    }
    .total-row {
        font-size: 15px;
        font-weight: 900;
        margin-top: 5px;
        padding-top: 5px;
        border-top: 1px dashed #000;
    }
    .footer-warning {
        margin-top: 15px;
        font-size: 11px;
        text-align: center;
        padding-top: 10px;
        border-top: 1px solid #000;
        font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="center">
      <h2>APPetito</h2>
      <div>PRE-FACTURA</div>
      <div>${dateStr} - ${timeStr}</div>
  </div>
  
  <div class="text-divider">--------------------------------</div>
  
  <div>Pedido #: <span class="bold">${order.id}</span></div>
  <div>${tableString}</div>
  <div>${customerString}</div>

  <div class="text-divider">--------------------------------</div>
  
  <pre class="bold">CANT DESCRIPCION        TOTAL</pre>
  <pre>${itemRows || 'Sin productos'}</pre>
  
  <div class="text-divider">--------------------------------</div>
  
  <div class="grid-totals">
      <div>Subtotal:</div>
      <div>${fmt(subtotal)}</div>
      
      ${tax > 0 ? `
      <div>ITBIS:</div>
      <div>${fmt(tax)}</div>
      ` : ''}
      
      <div class="total-row">TOTAL:</div>
      <div class="total-row">${fmt(total)}</div>
  </div>
  
  <div class="footer-warning">
    ⚠️ ESTE DOCUMENTO NO ES<br/>VÁLIDO COMO FACTURA FINAL
  </div>
</body>
</html>`;

        const win = window.open('', '_blank', 'width=420,height=620');
        if (!win) { alert('Habilita ventanas emergentes para imprimir.'); return; }
        win.document.write(html);
        win.document.close();

        // Give the browser a moment to render the HTML before calling print
        setTimeout(() => {
            win.focus();
            win.print();
            win.close();
        }, 250);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
                {/* Header */}
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Procesar Pago</h2>
                    <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X size={24} />
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {paymentSuccess ? (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="p-8 flex flex-col items-center justify-center space-y-4"
                        >
                            <CheckCircle className="w-20 h-20 text-green-500" />
                            <h3 className="text-2xl font-bold text-green-600">¡Pago Exitoso!</h3>
                            <div className="text-center space-y-2">
                                <p className="text-lg font-semibold">Número de Factura</p>
                                <p className="text-3xl font-mono font-bold text-blue-600">{invoiceNumber}</p>
                            </div>
                            {paymentMethod === 'cash' && change > 0 && (
                                <div className="bg-green-50 p-4 rounded-xl">
                                    <p className="text-green-700 font-semibold text-lg">
                                        Cambio: {formatNumber(change)}
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="form"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="p-6 space-y-6"
                        >
                            {/* Resumen de la orden */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <h3 className="font-semibold mb-3">Resumen de Orden #{order.id}</h3>
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm py-1">
                                        <span>{item.quantity}x {item.product_name || item.name}</span>
                                        <span className="text-right">{formatNumber(item.subtotal || (item.quantity * Number(item.price)))}</span>
                                    </div>
                                ))}
                                <div className="border-t mt-3 pt-3 space-y-1">
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>Subtotal:</span>
                                        <span className="text-right">{formatNumber(order.subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>ITBIS (18%):</span>
                                        <span className="text-right">{formatNumber(order.tax)}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-lg">
                                        <span>Total:</span>
                                        <span className="text-right">{formatNumber(order.total)}</span>
                                    </div>
                                </div>
                            </div>


                            {/* Método de pago */}
                            <div>
                                <label className="block font-semibold mb-3">Método de Pago</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { value: 'cash', label: 'Efectivo', icon: Banknote },
                                        { value: 'card', label: 'Tarjeta', icon: CreditCard },
                                        { value: 'transfer', label: 'Transferencia', icon: Smartphone }
                                    ].map(({ value, label, icon: Icon }) => (
                                        <button
                                            key={value}
                                            onClick={() => setPaymentMethod(value as any)}
                                            className={`p - 4 rounded - xl border - 2 flex flex - col items - center gap - 2 transition ${paymentMethod === value
                                                ? 'border-orange-500 bg-orange-50 text-orange-600'
                                                : 'border-gray-200 hover:border-gray-300'
                                                } `}
                                        >
                                            <Icon size={24} />
                                            <span className="text-sm font-medium">{label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Efectivo: monto recibido */}
                            {paymentMethod === 'cash' && (
                                <div>
                                    <label className="block font-semibold mb-2">Monto Recibido</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={amountReceived}
                                        onChange={(e) => setAmountReceived(e.target.value)}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-xl focus:border-orange-500 outline-none"
                                        placeholder="0.00"
                                    />
                                    {change > 0 && (
                                        <div className="mt-3 p-3 bg-green-50 rounded-lg">
                                            <span className="text-green-700 font-semibold">
                                                Cambio: {formatNumber(change)}
                                            </span>
                                        </div>
                                    )}
                                    {amountReceived && parseFloat(amountReceived) < totalToPay && (
                                        <div className="mt-3 p-3 bg-red-50 rounded-lg">
                                            <span className="text-red-700 font-semibold text-sm">
                                                Falta: {formatNumber(totalToPay - parseFloat(amountReceived))}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Total */}
                            <div className="bg-orange-50 rounded-xl p-4 border-2 border-orange-200">
                                <div className="flex justify-between items-center text-xl font-bold">
                                    <span>Total a Pagar:</span>
                                    <span className="text-orange-600 text-right">{formatNumber(totalToPay)}</span>
                                </div>
                            </div>

                            {/* Botón de confirmar */}
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => setShowPrintConfirm(true)}
                                    className="w-full py-4 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition text-center"
                                >
                                    Imprimir Pre-Factura
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading || (paymentMethod === 'cash' && !amountReceived)}
                                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                                >
                                    {loading ? 'Procesando...' : 'Confirmar Pago'}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Modal de éxito con opciones de impresión */}
            <PaymentSuccessModal
                isOpen={showSuccessModal}
                payment={paymentData}
                onClose={() => {
                    setShowSuccessModal(false);
                    handleClose();
                }}
            />

            {/* Modal de confirmación para pre-factura */}
            <AnimatePresence>
                {showPrintConfirm && (
                    <div className="fixed inset-0 bg-black/40 z-[80] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl w-full max-w-sm p-6 text-center shadow-xl border border-slate-100"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Printer size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">¿Imprimir Pre-Factura?</h3>
                            <p className="text-slate-500 mb-6 text-sm">
                                Se generará una pre-factura del pedido actual. El pedido no se cerrará ni será marcado como pagado.
                            </p>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setShowPrintConfirm(false)}
                                    className="py-3 px-4 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => {
                                        handlePrintPreInvoice();
                                        setShowPrintConfirm(false);
                                    }}
                                    className="py-3 px-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
                                >
                                    Imprimir
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal de confirmación para procesar pago */}
            <AnimatePresence>
                {showProcessConfirm && (
                    <div className="fixed inset-0 bg-black/40 z-[80] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl w-full max-w-sm p-6 text-center shadow-xl border border-slate-100"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">¿Procesar Pago?</h3>
                            <p className="text-slate-500 mb-6 text-sm">
                                ¿Confirmas que deseas procesar el pago e imprimir el recibo? El pedido se marcará como pagado y la mesa será liberada.
                            </p>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setShowProcessConfirm(false)}
                                    className="py-3 px-4 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                                    disabled={loading}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => {
                                        setShowProcessConfirm(false);
                                        handleSubmit();
                                    }}
                                    disabled={loading}
                                    className="py-3 px-4 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20 flex items-center justify-center"
                                >
                                    {loading ? (
                                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                    ) : "Confirmar Pago"}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
