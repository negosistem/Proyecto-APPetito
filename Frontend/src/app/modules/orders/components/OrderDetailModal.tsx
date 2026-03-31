import React, { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
    AlertTriangle,
    Download,
    Eye,
    Loader2,
    Lock,
    Printer,
    RefreshCw,
    UtensilsCrossed,
    X,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/app/modules/auth/context/AuthContext';
import { formatNumber } from '@/lib/formatNumber';
import { Order, orderService } from '../services/orderService';
import { groupModifiers } from '../utils/modifiers';

interface OrderDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: Order | null;
    onOrderReopened?: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const MIN_REOPEN_REASON_LENGTH = 5;

const statusLabel = (status: string) => {
    const map: Record<string, string> = {
        new: 'En Cocina',
        pending: 'Pendiente',
        accepted: 'Aceptado',
        preparing: 'Preparando',
        ready: 'Listo',
        served: 'Servido',
        paid: 'Pagado',
        cancelled: 'Cancelado',
    };
    return map[status] || status;
};

export function OrderDetailModal({
    isOpen,
    onClose,
    order,
    onOrderReopened,
}: OrderDetailModalProps) {
    const { user } = useAuth();

    const [showReopenModal, setShowReopenModal] = useState(false);
    const [motivoReapertura, setMotivoReapertura] = useState('');
    const [isReopening, setIsReopening] = useState(false);
    const [isLoadingReceipt, setIsLoadingReceipt] = useState(false);

    const roleName = (user?.role || '').toLowerCase();
    const isAdmin =
        roleName === 'admin' ||
        roleName === 'administrador' ||
        roleName === 'super_admin';

    const isPaid = order?.status === 'paid';
    const isCancelled = order?.status === 'cancelled';
    const canReopenOrder = Boolean(isPaid && isAdmin);
    const trimmedReopenReason = motivoReapertura.trim();
    const canSubmitReopen =
        trimmedReopenReason.length >= MIN_REOPEN_REASON_LENGTH && !isReopening;

    useEffect(() => {
        if (!isOpen) {
            setShowReopenModal(false);
            setMotivoReapertura('');
            setIsReopening(false);
        }
    }, [isOpen]);

    useEffect(() => {
        setShowReopenModal(false);
        setMotivoReapertura('');
        setIsReopening(false);
    }, [order?.id]);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('access_token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const closeReopenModal = () => {
        if (isReopening) {
            return;
        }
        setShowReopenModal(false);
        setMotivoReapertura('');
    };

    const getPaymentId = async (): Promise<number | null> => {
        if (!order) {
            return null;
        }

        try {
            const response = await fetch(`${API_URL}/api/payments/order/${order.id}`, {
                headers: getAuthHeaders(),
            });
            if (!response.ok) {
                return null;
            }

            const data = await response.json();
            return data.id;
        } catch {
            return null;
        }
    };

    const handleViewReceipt = async (format: 'html' | 'pdf' | 'thermal') => {
        setIsLoadingReceipt(true);
        try {
            const paymentId = await getPaymentId();
            if (!paymentId) {
                toast.error('No se encontró el pago asociado.');
                return;
            }

            const url = `${API_URL}/api/payments/${paymentId}/receipt?format=${format}`;
            const response = await fetch(url, { headers: getAuthHeaders() });
            if (!response.ok) {
                throw new Error('Error al generar recibo');
            }

            if (format === 'html') {
                const html = await response.text();
                const windowRef = window.open('', '_blank');
                if (windowRef) {
                    windowRef.document.write(html);
                    windowRef.document.close();
                }
                return;
            }

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');
        } catch {
            toast.error('No se pudo cargar el recibo.');
        } finally {
            setIsLoadingReceipt(false);
        }
    };

    const handleDownloadPDF = async () => {
        setIsLoadingReceipt(true);
        try {
            const paymentId = await getPaymentId();
            if (!paymentId) {
                toast.error('No se encontró el pago asociado.');
                return;
            }

            const response = await fetch(
                `${API_URL}/api/payments/${paymentId}/receipt?format=pdf`,
                { headers: getAuthHeaders() },
            );
            if (!response.ok) {
                throw new Error('Error al descargar la factura');
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `Factura-Pedido-${order?.id}.pdf`;
            anchor.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error('Error al descargar la factura.');
        } finally {
            setIsLoadingReceipt(false);
        }
    };

    const handleReopen = async () => {
        if (!order || !canSubmitReopen) {
            return;
        }

        setIsReopening(true);
        try {
            await orderService.reopenOrder(order.id, trimmedReopenReason);
            toast.success('Pedido reabierto exitosamente.');
            setShowReopenModal(false);
            setMotivoReapertura('');
            onOrderReopened?.();
            onClose();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error al reabrir el pedido.');
        } finally {
            setIsReopening(false);
        }
    };

    if (!order) {
        return null;
    }

    return (
        <Dialog.Root
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
        >
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 transition-opacity" />
                <Dialog.Content className="fixed left-1/2 top-[5vh] z-50 max-h-[90vh] w-full max-w-2xl -translate-x-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl focus:outline-none">
                    <Dialog.Title className="sr-only">Detalle del pedido #{order.id}</Dialog.Title>
                    <Dialog.Description className="sr-only">
                        Detalles, productos y documentos del pedido seleccionado.
                    </Dialog.Description>

                    <div className="mb-4 flex items-start justify-between border-b pb-4">
                        <div className="flex items-center gap-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-xl font-bold text-slate-900">
                                        Pedido #{order.id.toString().padStart(4, '0')}
                                    </h2>
                                    {isPaid && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-700">
                                            <Lock className="h-3 w-3" /> PAGADO
                                        </span>
                                    )}
                                    {isCancelled && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                                            CANCELADO
                                        </span>
                                    )}
                                </div>
                                <p className="mt-1 text-sm text-slate-500">
                                    {new Date(order.created_at).toLocaleString()} ·{' '}
                                    <span className="font-medium text-slate-700">
                                        {statusLabel(order.status)}
                                    </span>
                                </p>
                            </div>
                        </div>
                        <Dialog.Close asChild>
                            <button
                                className="rounded-lg p-2 transition-colors hover:bg-slate-100"
                                aria-label="Cerrar"
                            >
                                <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                            </button>
                        </Dialog.Close>
                    </div>

                    {isPaid && (
                        <div className="mb-5 flex items-start gap-3 rounded-xl border border-purple-200 bg-purple-50 p-4">
                            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-purple-500" />
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-purple-800">
                                    Este pedido está pagado y bloqueado
                                </p>
                                <p className="mt-0.5 text-xs text-purple-600">
                                    No se pueden realizar modificaciones. Puedes ver o imprimir el
                                    recibo.
                                </p>
                            </div>
                        </div>
                    )}

                    {isPaid && (
                        <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <h3 className="mb-3 text-xs font-bold uppercase text-slate-500">
                                Recibo / Factura
                            </h3>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => handleViewReceipt('html')}
                                    disabled={isLoadingReceipt}
                                    className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-700 transition-all hover:border-orange-400 hover:bg-orange-50 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <Eye className="h-4 w-4" />
                                    Vista previa
                                </button>
                                <button
                                    onClick={() => handleViewReceipt('thermal')}
                                    disabled={isLoadingReceipt}
                                    className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-700 transition-all hover:border-orange-400 hover:bg-orange-50 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isLoadingReceipt ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Printer className="h-4 w-4" />
                                    )}
                                    Imprimir ticket
                                </button>
                                <button
                                    onClick={handleDownloadPDF}
                                    disabled={isLoadingReceipt}
                                    className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-700 transition-all hover:border-orange-400 hover:bg-orange-50 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <Download className="h-4 w-4" />
                                    Descargar PDF
                                </button>
                            </div>

                            {canReopenOrder && (
                                <div className="mt-3 border-t border-slate-200 pt-3">
                                    <button
                                        onClick={() => setShowReopenModal(true)}
                                        disabled={isLoadingReceipt}
                                        className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                        Reabrir pedido
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mb-6 rounded-xl border border-slate-100 bg-slate-50 p-4">
                        <h3 className="mb-2 text-xs font-bold uppercase text-slate-500">
                            Información del Cliente
                        </h3>
                        <div className="flex flex-col gap-1">
                            <p className="text-sm">
                                <span className="font-medium text-slate-700">Nombre:</span>{' '}
                                <span className="text-slate-900">
                                    {order.customer_name || 'Consumidor final'}
                                </span>
                            </p>
                            <p className="text-sm">
                                <span className="font-medium text-slate-700">
                                    Mesa o dirección:
                                </span>{' '}
                                <span className="text-slate-900">
                                    {order.table_id ? `Mesa ${order.table_id}` : 'Para llevar'}
                                </span>
                            </p>
                        </div>
                    </div>

                    <div className="mb-6">
                        <h3 className="mb-3 block text-sm font-bold text-slate-900">
                            Productos Elegidos
                        </h3>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {order.items?.map((item, idx) => {
                                const imageUrl = (item as any).image || (item as any).image_url;
                                const groupedModifiers = groupModifiers(item.modifiers_snapshot);
                                const hasStructuredModifiers =
                                    groupedModifiers.additions.length > 0 ||
                                    groupedModifiers.removals.length > 0 ||
                                    groupedModifiers.notes.length > 0;
                                return (
                                    <div
                                        key={item.id || idx}
                                        className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50 p-4"
                                    >
                                        {imageUrl ? (
                                            <img
                                                src={imageUrl}
                                                alt={item.product_name || 'Producto'}
                                                className="mb-2 h-24 w-full rounded-lg object-cover"
                                            />
                                        ) : (
                                            <div className="mb-2 flex h-24 w-full items-center justify-center rounded-lg bg-gray-200 text-gray-400">
                                                <UtensilsCrossed className="h-8 w-8 opacity-50" />
                                            </div>
                                        )}
                                        <h4
                                            className="line-clamp-2 text-sm font-semibold text-gray-800"
                                            title={item.product_name || 'Producto'}
                                        >
                                            {item.product_name || `Producto #${item.product_id}`}
                                        </h4>
                                        {hasStructuredModifiers && (
                                            <div className="space-y-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                                                {groupedModifiers.additions.map((modifier, index) => (
                                                    <div key={`add-${index}`} className="text-emerald-700">
                                                        + {modifier.name}
                                                    </div>
                                                ))}
                                                {groupedModifiers.removals.map((modifier, index) => (
                                                    <div key={`remove-${index}`} className="text-red-600">
                                                        - Sin {modifier.name}
                                                    </div>
                                                ))}
                                                {groupedModifiers.notes.map((modifier, index) => (
                                                    <div key={`note-${index}`} className="italic text-slate-600">
                                                        "{modifier.name}"
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {!hasStructuredModifiers && item.notes && (
                                            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs italic text-slate-600">
                                                {item.notes}
                                            </div>
                                        )}
                                        <div className="mt-auto space-y-1">
                                            <div className="flex items-center justify-between text-xs text-gray-500">
                                                <span>Cantidad: {item.quantity}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-gray-500">
                                                <span>Precio unitario:</span>
                                                <span className="text-right font-medium text-gray-900">
                                                    {formatNumber(item.price)}
                                                </span>
                                            </div>
                                            <div className="mt-1 flex items-center justify-between border-t border-gray-200 pt-1 text-xs text-gray-500">
                                                <span>Subtotal:</span>
                                                <span className="text-right font-medium text-gray-900">
                                                    {formatNumber(item.price * item.quantity)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {!order.items?.length && (
                                <p className="col-span-2 rounded-lg bg-slate-50 py-4 text-center text-sm text-slate-500">
                                    No hay productos en este pedido.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="mt-4 space-y-2 border-t pt-4">
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
                        {order.discount !== undefined &&
                            order.discount !== null &&
                            order.discount > 0 && (
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
                        <div className="flex justify-between border-t pt-2 text-base font-bold">
                            <span>Total</span>
                            <span>{formatNumber(order.total)}</span>
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>

            <Dialog.Root
                open={showReopenModal}
                onOpenChange={(open) => {
                    if (!open) {
                        closeReopenModal();
                    }
                }}
            >
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-[1px]" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 z-[61] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl focus:outline-none">
                        <Dialog.Title className="flex items-center gap-3 text-base font-semibold text-slate-900">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                                <AlertTriangle className="h-5 w-5" />
                            </span>
                            Reabrir pedido #{order.id}
                        </Dialog.Title>
                        <Dialog.Description className="mt-3 text-sm leading-6 text-slate-600">
                            Esta acción cambiará el pedido a <strong>Pendiente</strong> para
                            permitir ajustes posteriores. Registra un motivo claro para la auditoría.
                        </Dialog.Description>

                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                            Esta acción puede impactar la facturación y el estado operativo de la mesa.
                        </div>

                        <div className="mt-4">
                            <label
                                htmlFor="reopen-reason"
                                className="mb-1 block text-xs font-bold text-slate-600"
                            >
                                Motivo
                            </label>
                            <textarea
                                id="reopen-reason"
                                value={motivoReapertura}
                                onChange={(event) => setMotivoReapertura(event.target.value)}
                                placeholder="Ej: error en los ítems del pedido o cambio autorizado por gerencia."
                                className="h-24 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                                minLength={MIN_REOPEN_REASON_LENGTH}
                                disabled={isReopening}
                            />
                            <div className="mt-2 flex items-center justify-between">
                                <p className="text-xs text-slate-500">
                                    Mínimo {MIN_REOPEN_REASON_LENGTH} caracteres.
                                </p>
                                <p className="text-xs text-slate-400">
                                    {trimmedReopenReason.length}/{MIN_REOPEN_REASON_LENGTH}
                                </p>
                            </div>
                            {motivoReapertura.length > 0 &&
                                trimmedReopenReason.length < MIN_REOPEN_REASON_LENGTH && (
                                    <p className="mt-1 text-xs text-red-500">
                                        El motivo debe tener al menos {MIN_REOPEN_REASON_LENGTH}{' '}
                                        caracteres.
                                    </p>
                                )}
                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                onClick={closeReopenModal}
                                disabled={isReopening}
                                className="rounded-lg border border-slate-200 px-4 py-2 text-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleReopen}
                                disabled={!canSubmitReopen}
                                className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isReopening ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-4 w-4" />
                                )}
                                Confirmar reapertura
                            </button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </Dialog.Root>
    );
}
