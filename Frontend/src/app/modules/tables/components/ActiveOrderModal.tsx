import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingBag, DollarSign, Clock, CheckCircle, AlertTriangle, FileText, Ban } from 'lucide-react';
import { ordersService, Order } from '../../orders/services/ordersService';
import { Table } from '../services/tableService';

interface ActiveOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    table: Table | null;
    onOrderUpdate: () => void; // Refresh grid
}

export default function ActiveOrderModal({ isOpen, onClose, table, onOrderUpdate }: ActiveOrderModalProps) {
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initial load
    useEffect(() => {
        if (isOpen && table) {
            loadOrder();
        } else {
            setOrder(null);
            setError(null);
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
            // 404 is expected if just no order yet
            if (err?.response?.status === 404) {
                setOrder(null);
            } else {
                setError("Error al cargar el pedido");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCreateOrder = async () => {
        if (!table) return;
        try {
            setLoading(true);
            const newOrder = await ordersService.createOrder({
                table_id: table.id,
                customer_name: "Cliente Mesa " + table.number
            });
            setOrder(newOrder);
            onOrderUpdate(); // Update table status in grid
        } catch (err: any) {
            setError(err.response?.data?.detail || "Error al crear el pedido");
        } finally {
            setLoading(false);
        }
    };

    const handleCloseOrder = async () => {
        if (!order) return;
        if (!window.confirm("¿Seguro que deseas cerrar la cuenta? Esto liberará la mesa.")) return;

        try {
            setLoading(true);
            await ordersService.closeOrder(order.id);
            onClose();
            onOrderUpdate();
        } catch (err: any) {
            setError("Error al cerrar el pedido");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!order) return;
        try {
            const updated = await ordersService.updateStatus(order.id, newStatus);
            setOrder(updated);
        } catch (err) {
            setError("Error al actualizar estado");
        }
    };

    if (!isOpen || !table) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-end sm:justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
                onClick={onClose}>

                <motion.div
                    initial={{ x: "100%", opacity: 0.5 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: "100%", opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white h-full sm:h-auto sm:rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
                        <div>
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                Mesa {table.number}
                                <span className={`text-xs px-2 py-0.5 rounded-full text-slate-900 font-bold uppercase ${table.status === 'libre' ? 'bg-green-400' :
                                    table.status === 'ocupada' ? 'bg-red-400' : 'bg-slate-300'
                                    }`}>
                                    {table.status.replace('_', ' ')}
                                </span>
                            </h3>
                            <p className="text-slate-400 text-sm">
                                {table.location} • Capacidad: {table.capacity}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 bg-slate-50 relative">
                        {loading && (
                            <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500"></div>
                            </div>
                        )}

                        {error && (
                            <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2 text-sm">
                                <AlertTriangle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        {!order ? (
                            // No Active Order State
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                                <div className="bg-slate-100 p-6 rounded-full">
                                    <ShoppingBag className="w-12 h-12 text-slate-400" />
                                </div>
                                <div>
                                    <h4 className="text-lg font-medium text-slate-900">Mesa Disponible</h4>
                                    <p className="text-slate-500">No hay pedidos activos actualmente.</p>
                                </div>
                                <button
                                    onClick={handleCreateOrder}
                                    className="px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold shadow-lg hover:bg-orange-600 hover:scale-105 transition-all flex items-center gap-2"
                                >
                                    <FileText className="w-5 h-5" />
                                    Abrir Nuevo Pedido
                                </button>
                            </div>
                        ) : (
                            // Active Order View
                            <div className="space-y-6">
                                {/* Order Info Card */}
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Pedido #{order.id}</p>
                                            <h2 className="text-2xl font-bold text-slate-800 flex items-baseline gap-1">
                                                ${order.total.toLocaleString()}
                                            </h2>
                                        </div>
                                        <div className="text-right">
                                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${order.status === 'Abierto' ? 'bg-blue-100 text-blue-700' :
                                                order.status === 'En Preparación' ? 'bg-yellow-100 text-yellow-700' :
                                                    order.status === 'Entregado' ? 'bg-green-100 text-green-700' :
                                                        'bg-slate-100 text-slate-700'
                                                }`}>
                                                {order.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 text-xs font-medium">
                                        {order.status === 'Abierto' && (
                                            <button onClick={() => handleStatusChange('En Preparación')} className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors">
                                                Enviar a Cocina
                                            </button>
                                        )}
                                        {order.status === 'En Preparación' && (
                                            <button onClick={() => handleStatusChange('Entregado')} className="px-3 py-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors">
                                                Marcar Entregado
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Items List */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-medium text-slate-700 ml-1">Productos</h4>
                                        {/* Placeholder for Add Item */}
                                        <button className="text-orange-600 text-sm font-medium hover:underline">+ Agregar</button>
                                    </div>

                                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 divide-y divide-slate-50 min-h-[100px]">
                                        {order.items && order.items.length > 0 ? (
                                            order.items.map((item) => (
                                                <div key={item.id} className="p-3 flex justify-between items-center">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs">
                                                            x{item.quantity}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-slate-800 text-sm">{item.product_name || `Producto #${item.product_id}`}</p>
                                                            {item.notes && <p className="text-xs text-slate-400 italic">{item.notes}</p>}
                                                        </div>
                                                    </div>
                                                    <span className="font-medium text-slate-600">${Number(item.price * item.quantity).toFixed(2)}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="p-8 text-center text-slate-400 text-sm italic">Sin productos agregados</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    {order && (
                        <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                            <button
                                onClick={handleCloseOrder}
                                className="w-full py-3 bg-slate-900 text-white rounded-xl font-medium shadow hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                            >
                                <CheckCircle className="w-5 h-5" />
                                Cerrar Cuenta y Liberar Mesa
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
