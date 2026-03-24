import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
    X, ShoppingBag, CheckCircle, AlertTriangle, FileText,
    Printer, ChevronRight, Users, CreditCard, Ban
} from 'lucide-react';
import { ordersService, Order } from '../../orders/services/ordersService';
import { PaymentModal } from '../../orders/components/PaymentModal';
import { Table } from '../services/tableService';

interface ActiveOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    table: Table | null;
    onOrderUpdate: () => void;
}

// ── Clean number formatter — NO currency symbols ──────────────────────────
const fmt = (n: number | string | null | undefined): string =>
    Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ActiveOrderModal({ isOpen, onClose, table, onOrderUpdate }: ActiveOrderModalProps) {
    const navigate = useNavigate();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showConfirmClose, setShowConfirmClose] = useState(false);

    // Payment modal state
    const [showPayment, setShowPayment] = useState(false);
    const [orderDetails, setOrderDetails] = useState<any>(null);

    useEffect(() => {
        if (isOpen && table) {
            loadOrder();
        } else {
            setOrder(null);
            setError(null);
            setShowConfirmClose(false);
            setShowPayment(false);
            setOrderDetails(null);
        }
    }, [isOpen, table]);

    const loadOrder = async () => {
        if (!table) return;
        setLoading(true);
        setError(null);
        try {
            const activeOrder = await ordersService.getActiveOrder(table.id);
            setOrder(activeOrder);
        } catch (err: any) {
            if (err?.response?.status === 404 || err?.status === 404) {
                setOrder(null);
            } else {
                setError('info');
            }
        } finally {
            setLoading(false);
        }
    };

    // ── Open new order ────────────────────────────────────────────────────
    const handleOpenOrder = async () => {
        if (!table) return;
        setLoading(true);
        setError(null);
        try {
            const newOrder = await ordersService.createOrder({
                table_id: table.id,
                customer_name: `Mesa ${table.number}`,
            });
            setOrder(newOrder);
            onOrderUpdate();
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'No se pudo abrir el pedido');
        } finally {
            setLoading(false);
        }
    };

    // ── Open Cobrar → PaymentModal ────────────────────────────────────────
    const handleCobrar = async () => {
        if (!order) return;
        setLoading(true);
        try {
            // Fetch full details needed by PaymentModal (subtotal/tax breakdown)
            const details = await ordersService.getOrderDetails(order.id);
            setOrderDetails(details);
            setShowPayment(true);
        } catch (err: any) {
            setError('No se pudieron cargar los detalles del pedido');
        } finally {
            setLoading(false);
        }
    };

    // ── Close order (quick, no payment) ──────────────────────────────────
    const handleCloseOrder = async () => {
        if (!order) return;
        setLoading(true);
        setError(null);
        try {
            await ordersService.closeOrder(order.id);
            setShowConfirmClose(false);
            onClose();
            onOrderUpdate();
        } catch (err: any) {
            setError('Error al cerrar el pedido');
        } finally {
            setLoading(false);
        }
    };

    // ── Print pre-bill (no currency symbols) ────────────────────────────
    const handlePrint = () => {
        if (!order || !table) return;

        const now = new Date();
        const dateStr = now.toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = now.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });

        const itemRows = (order.items || []).map(item => `
            <tr>
                <td style="padding:6px 4px;border-bottom:1px solid #eee">${item.product_name || `Producto #${item.product_id}`}</td>
                <td style="padding:6px 4px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
                <td style="padding:6px 4px;border-bottom:1px solid #eee;text-align:right">${fmt(item.price)}</td>
                <td style="padding:6px 4px;border-bottom:1px solid #eee;text-align:right">${fmt(Number(item.price) * item.quantity)}</td>
            </tr>
        `).join('');

        const subtotal = Number((order as any).subtotal ?? order.total);
        const tax = Number((order as any).tax ?? 0);
        const tip = Number((order as any).tip ?? 0);
        const total = Number(order.total ?? 0);

        const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Pre-cuenta Mesa ${table.number}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Courier New', monospace; font-size: 13px; color: #111; padding: 20px; max-width: 360px; margin: auto; }
    h1 { font-size: 20px; text-align: center; margin-bottom: 2px; }
    .center { text-align: center; }
    .divider { border: none; border-top: 1px dashed #999; margin: 10px 0; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th { font-size: 11px; text-transform: uppercase; color: #555; padding: 4px; text-align: left; }
    th:nth-child(2) { text-align: center; }
    th:nth-child(3), th:nth-child(4) { text-align: right; }
    .totals td { padding: 4px; }
    .totals .label { color: #555; font-size: 12px; }
    .totals .amount { text-align: right; }
    .grand-total td { font-size: 16px; font-weight: bold; padding-top: 8px; }
    .footer { margin-top: 18px; text-align: center; font-size: 11px; color: #888; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>PRE-CUENTA</h1>
  <p class="center" style="font-size:12px;color:#555;margin-top:2px">${dateStr} · ${timeStr}</p>
  <hr class="divider"/>
  <p><strong>Mesa:</strong> ${table.number}</p>
  <p><strong>Pedido #:</strong> ${order.id}</p>
  ${order.customer_name ? `<p><strong>Cliente:</strong> ${order.customer_name}</p>` : ''}
  <hr class="divider"/>
  <table>
    <thead>
      <tr>
        <th>Producto</th><th>Cant.</th><th>P.Unit</th><th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows || '<tr><td colspan="4" style="text-align:center;padding:10px;color:#aaa">Sin productos</td></tr>'}
    </tbody>
  </table>
  <hr class="divider"/>
  <table class="totals">
    <tr><td class="label">Subtotal</td><td class="amount">${fmt(subtotal)}</td></tr>
    ${tax > 0 ? `<tr><td class="label">ITBIS</td><td class="amount">${fmt(tax)}</td></tr>` : ''}
    ${tip > 0 ? `<tr><td class="label">Propina</td><td class="amount">${fmt(tip)}</td></tr>` : ''}
    <tr class="grand-total"><td>TOTAL</td><td class="amount">${fmt(total)}</td></tr>
  </table>
  <hr class="divider"/>
  <div class="footer">
    <p>⚠️ Este es un documento de pre-cuenta.</p>
    <p>El pago no ha sido procesado.</p>
  </div>
</body>
</html>`;

        const win = window.open('', '_blank', 'width=420,height=620');
        if (!win) { alert('Habilita ventanas emergentes para imprimir.'); return; }
        win.document.write(html);
        win.document.close();
        win.focus();
        win.print();
        win.close();
    };

    // ── Status badge ─────────────────────────────────────────────────────
    const statusLabel = (status: string) => {
        const map: Record<string, { text: string; cls: string }> = {
            new: { text: 'Nuevo', cls: 'bg-blue-100 text-blue-700' },
            accepted: { text: 'Aceptado', cls: 'bg-yellow-100 text-yellow-700' },
            preparing: { text: 'En Cocina', cls: 'bg-orange-100 text-orange-700' },
            ready: { text: 'Listo', cls: 'bg-green-100 text-green-700' },
            served: { text: 'Servido', cls: 'bg-teal-100 text-teal-700' },
            pending: { text: 'Pendiente', cls: 'bg-slate-100 text-slate-600' },
        };
        const s = map[status] ?? { text: status, cls: 'bg-slate-100 text-slate-600' };
        return <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${s.cls}`}>{s.text}</span>;
    };

    if (!isOpen || !table) return null;

    const subtotal = Number((order as any)?.subtotal ?? order?.total ?? 0);
    const tax = Number((order as any)?.tax ?? 0);
    const tip = Number((order as any)?.tip ?? 0);
    const total = Number(order?.total ?? 0);

    // Shape required by PaymentModal
    const paymentOrderShape = orderDetails
        ? {
            id: orderDetails.id,
            subtotal: Number(orderDetails.subtotal ?? orderDetails.total),
            tax: Number(orderDetails.tax ?? 0),
            total: Number(orderDetails.total),
            items: (orderDetails.items ?? []).map((it: any) => ({
                product_name: it.product_name,
                quantity: it.quantity,
                price: Number(it.price),
                subtotal: Number(it.subtotal ?? (it.price * it.quantity)),
            })),
        }
        : null;

    return (
        <>
            <AnimatePresence>
                <div
                    className="fixed inset-0 z-50 flex items-center justify-end sm:justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ x: '100%', opacity: 0.5 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white h-full sm:h-auto sm:max-h-[90vh] sm:rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
                    >
                        {/* ── Header ──────────────────────────────────── */}
                        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    Mesa {table.number}
                                    <span className={`text-xs px-2 py-0.5 rounded-full text-slate-900 font-bold uppercase
                                        ${table.status === 'libre' ? 'bg-green-400' :
                                            table.status === 'ocupada' ? 'bg-red-400' :
                                                table.status === 'reservada' ? 'bg-yellow-300' : 'bg-slate-400'}`}>
                                        {table.status.replace('_', ' ')}
                                    </span>
                                </h3>
                                <p className="text-slate-400 text-sm flex items-center gap-1">
                                    <Users className="w-3 h-3" /> Cap. {table.capacity}
                                    {table.location ? ` · ${table.location}` : ''}
                                </p>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* ── Body ────────────────────────────────────── */}
                        <div className="flex-1 overflow-y-auto bg-slate-50 relative">
                            {loading && (
                                <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500" />
                                </div>
                            )}
                            {error && (
                                <div className="m-4 bg-orange-50 border border-orange-200 text-orange-700 p-4 rounded-xl flex items-center gap-3 text-sm">
                                    <ShoppingBag className="w-5 h-5 shrink-0 text-orange-500" />
                                    <span>Para agregar productos, debes realizar el pedido desde el módulo de <strong>Pedidos</strong>.</span>
                                </div>
                            )}

                            {/* ─ NO ORDER ─ */}
                            {!order ? (
                                <div className="flex flex-col items-center justify-center text-center space-y-5 py-16 px-6">
                                    <div className="bg-orange-50 p-6 rounded-full">
                                        <ShoppingBag className="w-14 h-14 text-orange-400" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-semibold text-slate-800">No hay pedido activo</h4>
                                        <p className="text-slate-500 text-sm mt-1">
                                            Para crear un pedido para la <strong>Mesa {table.number}</strong>, dirígete al módulo de Pedidos.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => { onClose(); navigate('/dashboard/pedidos'); }}
                                        className="px-7 py-3 bg-orange-500 text-white rounded-xl font-semibold shadow-lg hover:bg-orange-600 active:scale-95 transition-all flex items-center gap-2"
                                    >
                                        <FileText className="w-5 h-5" />
                                        Ir a Pedidos
                                    </button>
                                </div>
                            ) : (
                                /* ─ ACTIVE ORDER ─ */
                                <div className="p-5 space-y-5">
                                    {/* Order header card */}
                                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Pedido #{order.id}</p>
                                                <p className="text-3xl font-black text-slate-800 mt-0.5">{fmt(total)}</p>
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    {new Date(order.created_at).toLocaleString('es-DO', {
                                                        hour: '2-digit', minute: '2-digit',
                                                        day: 'numeric', month: 'short'
                                                    })}
                                                </p>
                                            </div>
                                            {statusLabel(order.status as string)}
                                        </div>
                                    </div>

                                    {/* Ocultar banner de pagado/cancelado y mostrar info */}
                                    {order.status === 'paid' && (
                                        <div className="bg-green-50 border border-green-200 text-green-700 font-medium p-4 rounded-xl flex items-center justify-between shadow-sm mt-3">
                                            <div className="flex items-center gap-3">
                                                <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                                                <span className="text-sm">Pedido pagado · No modificable</span>
                                            </div>
                                            <button 
                                                onClick={handlePrint}
                                                className="text-xs bg-white border border-green-200 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100 font-bold transition-colors">
                                                Reimprimir
                                            </button>
                                        </div>
                                    )}
                                    {order.status === 'cancelled' && (
                                        <div className="bg-red-50 border border-red-200 text-red-700 font-medium p-4 rounded-xl flex items-center gap-3 shadow-sm mt-3">
                                            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                                            <span className="text-sm">Pedido cancelado · No modificable</span>
                                        </div>
                                    )}

                                    {/* Items list */}
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Productos</h4>
                                        <div className="bg-white rounded-xl border border-slate-100 shadow-sm divide-y divide-slate-50">
                                            {order.items && order.items.length > 0 ? (
                                                order.items.map((item) => (
                                                    <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center text-xs font-black shrink-0">
                                                                {item.quantity}x
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-slate-800 text-sm leading-tight">
                                                                    {item.product_name || `Producto #${item.product_id}`}
                                                                </p>
                                                                {item.notes && <p className="text-xs text-slate-400 italic">{item.notes}</p>}
                                                            </div>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <p className="font-semibold text-slate-700 text-sm">{fmt(Number(item.price) * item.quantity)}</p>
                                                            <p className="text-[11px] text-slate-400">{fmt(item.price)} c/u</p>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="py-10 text-center text-slate-400 text-sm italic">Sin productos agregados</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Totals */}
                                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-2">
                                        <div className="flex justify-between text-sm text-slate-500">
                                            <span>Subtotal</span><span>{fmt(subtotal)}</span>
                                        </div>
                                        {tax > 0 && (
                                            <div className="flex justify-between text-sm text-slate-500">
                                                <span>ITBIS</span><span>{fmt(tax)}</span>
                                            </div>
                                        )}
                                        {tip > 0 && (
                                            <div className="flex justify-between text-sm text-slate-500">
                                                <span>Propina</span><span>{fmt(tip)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between font-black text-lg text-slate-900 pt-2 border-t border-slate-100">
                                            <span>TOTAL</span><span>{fmt(total)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Footer Actions ────────────────────────────── */}
                        {order && (
                            <div className="p-4 bg-white border-t border-slate-100 shrink-0 space-y-2">
                                {/* ★ COBRAR button — always shown, prominent */}
                                <button
                                    onClick={handleCobrar}
                                    disabled={loading || order.status === 'paid' || order.status === 'cancelled'}
                                    className={`w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold shadow-lg hover:shadow-orange-200 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 text-base ${(order.status === 'paid' || order.status === 'cancelled') ? 'opacity-50 cursor-not-allowed hidden' : ''}`}
                                >
                                    <CreditCard className="w-5 h-5" />
                                    Cobrar
                                </button>

                                {/* Secondary actions row */}
                                <div className={`flex gap-2 ${(order.status === 'paid' || order.status === 'cancelled') ? 'hidden' : ''}`}>
                                    <button
                                        onClick={handlePrint}
                                        disabled={order.status === 'paid' || order.status === 'cancelled'}
                                        className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition-all flex items-center justify-center gap-1.5 text-sm"
                                    >
                                        <Printer className="w-4 h-4" />
                                        Pre-cuenta
                                    </button>

                                    {!showConfirmClose ? (
                                        <button
                                            onClick={() => setShowConfirmClose(true)}
                                            disabled={order.status === 'paid' || order.status === 'cancelled'}
                                            className="flex-1 py-2.5 border border-slate-300 text-slate-500 rounded-xl font-medium hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5 text-sm"
                                        >
                                            <Ban className="w-4 h-4" />
                                            Cerrar sin cobrar
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleCloseOrder}
                                            disabled={loading || order.status === 'paid' || order.status === 'cancelled'}
                                            className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all flex items-center justify-center gap-1.5 text-sm disabled:opacity-60"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                            Confirmar
                                        </button>
                                    )}
                                </div>
                                {showConfirmClose && (
                                    <button onClick={() => setShowConfirmClose(false)} className="w-full py-1 text-xs text-slate-400 hover:text-slate-600">
                                        ← Cancelar cierre
                                    </button>
                                )}
                            </div>
                        )}
                    </motion.div>
                </div>
            </AnimatePresence>

            {/* ── Payment Modal (opens on top of this modal) ─────────── */}
            <PaymentModal
                isOpen={showPayment}
                onClose={() => setShowPayment(false)}
                order={paymentOrderShape}
                tableNumber={table.number}
                onSuccess={() => {
                    setShowPayment(false);
                    onClose();
                    onOrderUpdate();
                }}
            />
        </>
    );
}
