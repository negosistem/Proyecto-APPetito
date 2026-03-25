import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, UtensilsCrossed, Lock, Printer, Eye, Download, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';
import { Order } from '../services/orderService';
import { formatNumber } from '@/lib/formatNumber';
import { useAuth } from '@/app/modules/auth/context/AuthContext';
import { toast } from 'sonner';

interface OrderDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: Order | null;
    onOrderReopened?: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const statusLabel = (status: string) => {
    const map: Record<string, string> = {
        new: 'En Cocina', pending: 'Pendiente', accepted: 'Aceptado',
        preparing: 'Preparando', ready: 'Listo', served: 'Servido',
        paid: 'Pagado', cancelled: 'Cancelado',
    };
    return map[status] || status;
};

export function OrderDetailModal({ isOpen, onClose, order, onOrderReopened }: OrderDetailModalProps) {
    const { user } = useAuth();
    const isAdmin = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'administrador' || user?.role?.toLowerCase() === 'super_admin';

    const [showReopenModal, setShowReopenModal] = useState(false);
    const [motivoReapertura, setMotivoReapertura] = useState('');
    const [isReopening, setIsReopening] = useState(false);
    const [isLoadingReceipt, setIsLoadingReceipt] = useState(false);

    const isPaid = order?.status === 'paid';
    const isCancelled = order?.status === 'cancelled';

    const getPaymentId = async (): Promise<number | null> => {
        if (!order) return null;
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${API_URL}/api/payments/order/${order.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) return null;
            const data = await res.json();
            return data.id;
        } catch { return null; }
    };

    const handleViewReceipt = async (format: 'html' | 'pdf' | 'thermal') => {
        setIsLoadingReceipt(true);
        try {
            const paymentId = await getPaymentId();
            if (!paymentId) { toast.error('No se encontró el pago asociado'); return; }
            const token = localStorage.getItem('access_token');
            const url = `${API_URL}/api/payments/${paymentId}/receipt?format=${format}`;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) throw new Error('Error al generar recibo');

            if (format === 'html') {
                const html = await res.text();
                const win = window.open('', '_blank');
                if (win) { win.document.write(html); win.document.close(); }
            } else {
                const blob = await res.blob();
                const blobUrl = URL.createObjectURL(blob);
                window.open(blobUrl, '_blank');
            }
        } catch {
            toast.error('No se pudo cargar el recibo');
        } finally {
            setIsLoadingReceipt(false);
        }
    };

    const handleDownloadPDF = async () => {
        setIsLoadingReceipt(true);
        try {
            const paymentId = await getPaymentId();
            if (!paymentId) { toast.error('No se encontró el pago asociado'); return; }
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${API_URL}/api/payments/${paymentId}/invoice/pdf`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error();
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `Factura-Pedido-${order?.id}.pdf`;
            a.click(); URL.revokeObjectURL(url);
        } catch {
            toast.error('Error al descargar la factura');
        } finally {
            setIsLoadingReceipt(false);
        }
    };

    const handleReopen = async () => {
        if (!order || motivoReapertura.trim().length < 5) return;
        setIsReopening(true);
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${API_URL}/api/orders/${order.id}/reopen`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ motivo: motivoReapertura })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Error al reabrir el pedido');
            }
            toast.success('✅ Pedido reabierto exitosamente');
            setShowReopenModal(false);
            setMotivoReapertura('');
            onOrderReopened?.();
            onClose();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setIsReopening(false);
        }
    };

    if (!order) return null;

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 transition-opacity" />
                <Dialog.Content className="fixed left-1/2 top-[5vh] -translate-x-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 z-50 focus:outline-none">
                    <Dialog.Title className="sr-only">Detalle del Pedido #{order.id}</Dialog.Title>
                    <Dialog.Description className="sr-only">Detalles y productos del pedido</Dialog.Description>

                    {/* HEADER */}
                    <div className="flex justify-between items-start border-b pb-4 mb-4">
                        <div className="flex items-center gap-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-xl font-bold text-slate-900">
                                        Pedido #{order.id.toString().padStart(4, '0')}
                                    </h2>
                                    {isPaid && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">
                                            <Lock className="w-3 h-3" /> PAGADO
                                        </span>
                                    )}
                                    {isCancelled && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                                            CANCELADO
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-slate-500 mt-1">
                                    {new Date(order.created_at).toLocaleString()} · <span className="font-medium text-slate-700">{statusLabel(order.status)}</span>
                                </p>
                            </div>
                        </div>
                        <Dialog.Close asChild>
                            <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors" aria-label="Cerrar">
                                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
                            </button>
                        </Dialog.Close>
                    </div>

                    {/* PAID LOCK BANNER */}
                    {isPaid && (
                        <div className="mb-5 bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-start gap-3">
                            <Lock className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-purple-800">Este pedido está pagado y bloqueado</p>
                                <p className="text-xs text-purple-600 mt-0.5">No se pueden realizar modificaciones. Puedes ver o imprimir el recibo.</p>
                            </div>
                        </div>
                    )}

                    {/* RECEIPT ACTIONS (only for paid orders) */}
                    {isPaid && (
                        <div className="mb-5 bg-slate-50 border border-slate-200 rounded-xl p-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Recibo / Factura</h3>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => handleViewReceipt('html')}
                                    disabled={isLoadingReceipt}
                                    className="flex flex-col items-center gap-1 p-3 bg-white border border-slate-200 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-all text-xs font-semibold text-slate-700 hover:text-orange-600"
                                >
                                    <Eye className="w-4 h-4" />
                                    Vista previa
                                </button>
                                <button
                                    onClick={() => handleViewReceipt('thermal')}
                                    disabled={isLoadingReceipt}
                                    className="flex flex-col items-center gap-1 p-3 bg-white border border-slate-200 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-all text-xs font-semibold text-slate-700 hover:text-orange-600"
                                >
                                    {isLoadingReceipt ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                                    Imprimir Ticket
                                </button>
                                <button
                                    onClick={handleDownloadPDF}
                                    disabled={isLoadingReceipt}
                                    className="flex flex-col items-center gap-1 p-3 bg-white border border-slate-200 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-all text-xs font-semibold text-slate-700 hover:text-orange-600"
                                >
                                    <Download className="w-4 h-4" />
                                    Descargar PDF
                                </button>
                            </div>

                            {/* Admin Reopen Button */}
                            {isAdmin && (
                                <div className="mt-3 pt-3 border-t border-slate-200">
                                    <button
                                        onClick={() => setShowReopenModal(true)}
                                        className="flex items-center gap-2 text-sm text-amber-700 border border-amber-300 bg-amber-50 rounded-lg px-4 py-2 hover:bg-amber-100 transition-colors font-medium"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        Reabrir pedido
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* INFO DEL CLIENTE */}
                    <div className="bg-slate-50 p-4 rounded-xl mb-6 border border-slate-100">
                        <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Información del Cliente</h3>
                        <div className="flex flex-col gap-1">
                            <p className="text-sm">
                                <span className="font-medium text-slate-700">Nombre:</span>{' '}
                                <span className="text-slate-900">{order.customer_name || 'Consumidor Final'}</span>
                            </p>
                            <p className="text-sm">
                                <span className="font-medium text-slate-700">Mesa o dirección:</span>{' '}
                                <span className="text-slate-900">
                                    {order.table_id ? `Mesa ${order.table_id}` : 'Para llevar'}
                                </span>
                            </p>
                        </div>
                    </div>

                    {/* PRODUCTOS */}
                    <div className="mb-6">
                        <h3 className="text-sm font-bold text-slate-900 mb-3 block">Productos Elegidos</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {order.items?.map((item, idx) => {
                                const imageUrl = (item as any).image || (item as any).image_url;
                                return (
                                    <div key={item.id || idx} className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex flex-col gap-2">
                                        {imageUrl ? (
                                            <img src={imageUrl} alt={item.product_name || 'Producto'} className="w-full h-24 object-cover rounded-lg mb-2" />
                                        ) : (
                                            <div className="w-full h-24 bg-gray-200 rounded-lg mb-2 flex items-center justify-center text-gray-400">
                                                <UtensilsCrossed className="w-8 h-8 opacity-50" />
                                            </div>
                                        )}
                                        <h4 className="font-semibold text-gray-800 text-sm line-clamp-2" title={item.product_name || 'Producto'}>
                                            {item.product_name || `Producto #${item.product_id}`}
                                        </h4>
                                        <div className="mt-auto space-y-1">
                                            <div className="flex justify-between items-center text-xs text-gray-500">
                                                <span>Cantidad: {item.quantity}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs text-gray-500">
                                                <span>Precio unitario:</span>
                                                <span className="font-medium text-gray-900 text-right">{formatNumber(item.price)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs text-gray-500 pt-1 border-t border-gray-200 mt-1">
                                                <span>Subtotal:</span>
                                                <span className="font-medium text-gray-900 text-right">{formatNumber(item.price * item.quantity)}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {!order.items?.length && (
                                <p className="text-sm text-slate-500 col-span-2 py-4 bg-slate-50 rounded-lg text-center">
                                    No hay productos en este pedido.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* TOTALS */}
                    <div className="border-t pt-4 mt-4 space-y-2">
                        {order.subtotal !== undefined && order.subtotal !== null && (
                            <div className="flex justify-between text-sm">
                                <span>Subtotal</span>
                                <span>{formatNumber(order.subtotal)}</span>
                            </div>
                        )}
                        {order.tax !== undefined && order.tax !== null && order.tax > 0 && (
                            <div className="flex justify-between text-sm text-gray-500">
                                <span>Impuesto</span>
                                <span>{formatNumber(order.tax)}</span>
                            </div>
                        )}
                        {order.discount !== undefined && order.discount !== null && order.discount > 0 && (
                            <div className="flex justify-between text-sm text-green-600">
                                <span>Descuento</span>
                                <span>-{formatNumber(order.discount)}</span>
                            </div>
                        )}
                        {order.tip !== undefined && order.tip !== null && order.tip > 0 && (
                            <div className="flex justify-between text-sm text-gray-500">
                                <span>Propina</span>
                                <span>{formatNumber(order.tip)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-base border-t pt-2">
                            <span>Total</span>
                            <span>{formatNumber(order.total)}</span>
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>

            {/* REOPEN CONFIRMATION MODAL */}
            {showReopenModal && (
                <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">Reabrir pedido #{order.id}</h3>
                                <p className="text-xs text-slate-500">Esta acción puede afectar la facturación.</p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-600 mb-4">
                            ¿Estás seguro que deseas reabrir este pedido? El estado cambiará a <strong>Pendiente</strong> y quedará desbloqueado para edición.
                        </p>
                        <div className="mb-4">
                            <label className="text-xs font-bold text-slate-600 block mb-1">Motivo *</label>
                            <textarea
                                value={motivoReapertura}
                                onChange={e => setMotivoReapertura(e.target.value)}
                                placeholder="Ej: Error en los ítems del pedido..."
                                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
                                minLength={5}
                            />
                            {motivoReapertura.length > 0 && motivoReapertura.length < 5 && (
                                <p className="text-xs text-red-500 mt-1">Mínimo 5 caracteres</p>
                            )}
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => { setShowReopenModal(false); setMotivoReapertura(''); }}
                                className="text-sm px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleReopen}
                                disabled={motivoReapertura.trim().length < 5 || isReopening}
                                className="text-sm px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                            >
                                {isReopening ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                Confirmar reapertura
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Dialog.Root>
    );
}
