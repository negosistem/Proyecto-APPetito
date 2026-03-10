import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, UtensilsCrossed } from 'lucide-react';
import { Order } from '../services/orderService';
import { formatNumber } from '@/lib/formatNumber';

interface OrderDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: Order | null;
}

export function OrderDetailModal({ isOpen, onClose, order }: OrderDetailModalProps) {
    if (!order) return null;

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 transition-opacity" />
                <Dialog.Content className="fixed left-1/2 top-[5vh] -translate-x-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 z-50 focus:outline-none">
                    <Dialog.Title className="sr-only">Detalle del Pedido #{order.id}</Dialog.Title>
                    <Dialog.Description className="sr-only">Detalles y productos del pedido</Dialog.Description>

                    {/* HEADER DEL MODAL */}
                    <div className="flex justify-between items-start border-b pb-4 mb-4">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">
                                Pedido #{order.id.toString().padStart(4, '0')}
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">
                                {new Date(order.created_at).toLocaleString()} · <span className="font-medium text-slate-700 capitalize">{
                                    order.status === 'new' ? 'En Cocina' :
                                        order.status === 'pending' ? 'Pendiente' :
                                            order.status === 'accepted' ? 'Aceptado' :
                                                order.status === 'preparing' ? 'Preparando' :
                                                    order.status === 'ready' ? 'Listo' :
                                                        order.status === 'served' ? 'Servido' :
                                                            order.status === 'paid' ? 'Pagado' :
                                                                order.status === 'cancelled' ? 'Cancelado' :
                                                                    order.status
                                }</span>
                            </p>
                        </div>
                        <Dialog.Close asChild>
                            <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors" aria-label="Cerrar">
                                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
                            </button>
                        </Dialog.Close>
                    </div>

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

                    {/* PRODUCTOS ELEGIDOS */}
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

                    {/* FOOTER */}
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
        </Dialog.Root>
    );
}
