import { useEffect } from 'react';
import { X, Check, Play, ChefHat } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
    order: any;
    onClose: () => void;
    onUpdate: () => void;
    tick: number;
}

import { apiClient } from '../../../shared/services/apiClient';

export default function OrderTicket({ order, onClose, onUpdate, tick }: Props) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleAccept = async () => {
        try {
            await apiClient.put(`/api/kitchen/orders/${order.id}/accept`, {});
            onUpdate();
            onClose(); // Auto-close on accept
        } catch (error) {
            alert('Error al aceptar orden');
        }
    };

    const handleStart = async () => {
        try {
            await apiClient.put(`/api/kitchen/orders/${order.id}/start`, {});
            onUpdate();
            onClose(); // Automatically close as requested by user
        } catch (error) {
            alert('Error al iniciar preparación');
        }
    };

    const handleComplete = async () => {
        try {
            await apiClient.put(`/api/kitchen/orders/${order.id}/complete`, {});
            onUpdate();
            onClose();
        } catch (error) {
            alert('Error al completar orden');
        }
    };

    const setItemState = async (itemId: number, newState: string) => {
        try {
            await apiClient.put(`/api/kitchen/items/${itemId}/state`, { new_state: newState });
            onUpdate();
        } catch (error) {
            alert('Error al actualizar estado del plato');
        }
    };

    const isItemOverdue = (item: any) => {
        // Alertas solo si está en proceso
        if (item.state !== 'preparing' || !item.started_at) return false;

        const startedMillis = new Date(item.started_at).getTime();
        const elapsedMinutes = (Date.now() - startedMillis) / 60000;

        const limit = item.prep_time_minutes || 10;
        return elapsedMinutes > limit;
    };

    const getDishTimerLabels = (item: any) => {
        if (!item.started_at) return "00:00";

        // Si ya terminó, mostrar tiempo final estático
        const endTime = item.completed_at ? new Date(item.completed_at).getTime() : Date.now();
        const diff = Math.floor((endTime - new Date(item.started_at).getTime()) / 1000);

        if (diff < 0) return "00:00";
        const m = Math.floor(diff / 60);
        const s = diff % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
                {/* Header */}
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold">🔔 Orden #{order.order_number}</h2>
                        <p className="text-gray-600 font-medium text-lg">{order.table ? `Mesa ${order.table}` : 'Para llevar'}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Se eliminó la sección de tiempos por solicitud del usuario */}

                    {/* Items */}
                    <div>
                        <h3 className="font-semibold text-lg mb-3">PRODUCTOS:</h3>
                        <div className="space-y-3">
                            {order.items.map((item: any) => {
                                const overdue = isItemOverdue(item);
                                return (
                                    <div
                                        key={item.id}
                                        className={`border-2 rounded-xl p-4 transition-all ${overdue ? 'border-red-500 bg-red-50 animate-pulse' :
                                            item.state === 'ready' ? 'border-green-500 bg-green-50' :
                                                item.state === 'preparing' ? 'border-blue-500 bg-blue-50' :
                                                    'border-gray-300 bg-white'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex-1 pr-4">
                                                <p className={`font-bold text-xl ${overdue ? 'text-red-700' : 'text-slate-800'}`}>
                                                    {item.quantity}x {item.product_name}
                                                    {overdue && <span className="text-sm shadow-sm ml-3 text-white bg-red-500 px-2.5 py-0.5 rounded-full not-italic">Atrasado</span>}
                                                </p>
                                                {item.notes && (
                                                    <p className="text-base text-gray-600 italic mt-1 bg-yellow-50 inline-block px-2 py-1 rounded border border-yellow-100">{item.notes}</p>
                                                )}
                                                <p className="text-xs text-gray-500 mt-1">
                                                    ⏱️ {item.prep_time_minutes > 0 ? `${item.prep_time_minutes} minutos estimados` : 'Sin tiempo est.'}
                                                </p>
                                            </div>

                                            {/* 3 Reversible Item States */}
                                            <div className="flex gap-1 shrink-0">
                                                <button
                                                    onClick={() => setItemState(item.id, 'pending')}
                                                    disabled={order.status !== 'preparing'}
                                                    className={`text-xs px-3 py-2 rounded-lg font-bold transition-all ${item.state === 'pending' || !item.state
                                                        ? 'bg-gray-600 text-white'
                                                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                                        } disabled:opacity-50`}
                                                >
                                                    Pendiente
                                                </button>
                                                <button
                                                    onClick={() => setItemState(item.id, 'preparing')}
                                                    disabled={order.status !== 'preparing'}
                                                    className={`text-xs px-3 py-2 rounded-lg font-bold transition-all ${item.state === 'preparing'
                                                        ? 'bg-blue-600 text-white shadow-sm'
                                                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                                        } disabled:opacity-50`}
                                                >
                                                    En Proceso
                                                </button>
                                                <button
                                                    onClick={() => setItemState(item.id, 'ready')}
                                                    disabled={order.status !== 'preparing'}
                                                    className={`text-xs px-3 py-2 rounded-lg font-bold transition-all ${item.state === 'ready'
                                                        ? 'bg-green-600 text-white shadow-sm'
                                                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                        } disabled:opacity-50`}
                                                >
                                                    Listo
                                                </button>
                                            </div>
                                        </div>

                                        {/* Tiempo del plato */}
                                        {(item.state === 'preparing' || item.state === 'ready') && item.started_at && (
                                            <div className={`text-sm mt-2 flex items-center gap-2 ${overdue ? 'text-red-700 font-bold animate-bounce' :
                                                item.state === 'ready' ? 'text-green-700 font-medium' : 'text-blue-600 font-medium'}`}>
                                                <span>⏱️ {item.state === 'ready' ? 'Tiempo total:' : 'Tiempo en proceso:'} {getDishTimerLabels(item)}</span>
                                                <span className="text-xs bg-gray-100 rounded px-1 text-gray-500">
                                                    / {item.prep_time_minutes || 10}m est.
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="bg-blue-50 rounded-xl p-4">
                        <p className="text-sm text-gray-700 mb-2">
                            Progreso General: {order.progress.percentage}%
                        </p>
                        <div className="w-full bg-gray-300 rounded-full h-4">
                            <div
                                className="bg-blue-600 h-4 rounded-full transition-all flex items-center justify-center text-xs text-white font-bold"
                                style={{ width: `${order.progress.percentage}%` }}
                            >
                                {order.progress.percentage > 10 && `${order.progress.percentage}%`}
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-2 text-center">
                            {order.progress.completed} de {order.progress.total} productos listos
                        </p>
                    </div>

                    {/* Botones de Acción */}
                    <div className="flex gap-3">
                        {order.status === 'new' && (
                            <>
                                <button
                                    onClick={handleAccept}
                                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 font-semibold"
                                >
                                    <Check size={20} />
                                    Aceptar Orden
                                </button>
                                <button
                                    onClick={() => {/* Rechazar */ }}
                                    className="px-6 py-3 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 font-semibold"
                                >
                                    Rechazar
                                </button>
                            </>
                        )}

                        {order.status === 'accepted' && (
                            <div className="flex gap-2 w-full">
                                <button
                                    onClick={async () => {
                                        await apiClient.put(`/api/kitchen/orders/${order.id}/revert-to-new`, {});
                                        onUpdate();
                                        onClose();
                                    }}
                                    className="px-4 py-3 border border-red-300 text-red-600 rounded-xl hover:bg-red-50 font-semibold transition"
                                >
                                    ← Volver a Nuevo
                                </button>
                                <button
                                    onClick={handleStart}
                                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 font-semibold transition"
                                >
                                    <Play size={20} />
                                    Pasar a Cocina
                                </button>
                            </div>
                        )}

                        {order.status === 'preparing' && (
                            <div className="flex gap-2 w-full">
                                <button
                                    onClick={async () => {
                                        await apiClient.put(`/api/kitchen/orders/${order.id}/revert-to-accepted`, {});
                                        onUpdate();
                                        onClose();
                                    }}
                                    className="px-4 py-3 border border-amber-300 text-amber-600 rounded-xl hover:bg-amber-50 font-semibold transition"
                                >
                                    ← Volver a Aceptado
                                </button>
                                <button
                                    onClick={handleComplete}
                                    disabled={order.progress.percentage < 100}
                                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                                >
                                    <ChefHat size={20} />
                                    Marcar como Listo
                                </button>
                            </div>
                        )}

                        {order.status === 'ready' && (
                            <div className="flex gap-2 w-full">
                                <button
                                    onClick={async () => {
                                        await apiClient.put(`/api/kitchen/orders/${order.id}/revert-to-preparing`, {});
                                        onUpdate();
                                        onClose();
                                    }}
                                    className="px-4 py-3 border border-orange-300 text-orange-600 rounded-xl hover:bg-orange-50 font-semibold transition"
                                >
                                    ← Volver a Preparando
                                </button>
                                <div className="flex-1 bg-green-100 text-green-700 py-3 rounded-xl text-center font-semibold">
                                    ✓ Orden Lista para Servir
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
