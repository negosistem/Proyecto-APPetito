import { X, Check, Play, ChefHat } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
    order: any;
    onClose: () => void;
    onUpdate: () => void;
}

import { apiClient } from '../../../shared/services/apiClient';

export default function OrderTicket({ order, onClose, onUpdate }: Props) {

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
            // onClose(); // Keep open to update items
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

    const toggleItemState = async (itemId: number, currentState: string) => {
        const newState = currentState === 'pending' ? 'preparing' : 'ready';

        try {
            await apiClient.put(`/api/kitchen/items/${itemId}/state`, { new_state: newState });
            onUpdate();
        } catch (error) {
            alert('Error al actualizar estado del plato');
        }
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
                        <p className="text-gray-600">Mesa {order.table}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Tiempos */}
                    <div className="bg-gray-50 rounded-xl p-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-600">⏰ Llegó a Cocina</p>
                                <p className="font-bold text-lg">
                                    {order.arrived_at ? new Date(order.arrived_at).toLocaleTimeString('es-ES') : 'N/A'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">⏱️ Tiempo Transcurrido</p>
                                <p className="font-bold text-lg text-orange-600">
                                    {order.elapsed_minutes} minutos
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Items */}
                    <div>
                        <h3 className="font-semibold text-lg mb-3">PRODUCTOS:</h3>
                        <div className="space-y-3">
                            {order.items.map((item: any) => (
                                <div
                                    key={item.id}
                                    className={`border-2 rounded-xl p-4 ${item.state === 'ready' ? 'border-green-500 bg-green-50' :
                                        item.state === 'preparing' ? 'border-blue-500 bg-blue-50' :
                                            'border-gray-300 bg-white'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1">
                                            <p className="font-semibold">
                                                {item.quantity}x {item.product_name}
                                            </p>
                                            {item.notes && (
                                                <p className="text-sm text-gray-600 italic">{item.notes}</p>
                                            )}
                                            <p className="text-xs text-gray-500 mt-1">
                                                ⏱️ {item.prep_time_minutes} minutos estimados
                                            </p>
                                        </div>

                                        {/* Estado del Item */}
                                        <button
                                            onClick={() => toggleItemState(item.id, item.state)}
                                            disabled={order.status !== 'preparing'}
                                            className={`px-4 py-2 rounded-lg font-medium transition ${item.state === 'ready'
                                                ? 'bg-green-500 text-white'
                                                : item.state === 'preparing'
                                                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                                                    : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                        >
                                            {item.state === 'ready' ? '✓ Listo' :
                                                item.state === 'preparing' ? 'En Proceso' :
                                                    'Pendiente'}
                                        </button>
                                    </div>

                                    {/* Tiempo del plato */}
                                    {item.state !== 'pending' && (
                                        <div className="text-sm text-gray-600 mt-2">
                                            Tiempo: {item.item_elapsed_minutes}m / {item.prep_time_minutes}m
                                        </div>
                                    )}
                                </div>
                            ))}
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
                            <button
                                onClick={handleStart}
                                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 font-semibold"
                            >
                                <Play size={20} />
                                Iniciar Preparación
                            </button>
                        )}

                        {order.status === 'preparing' && (
                            <button
                                onClick={handleComplete}
                                disabled={order.progress.percentage < 100}
                                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                                <ChefHat size={20} />
                                Marcar como Listo
                            </button>
                        )}

                        {order.status === 'ready' && (
                            <div className="w-full bg-green-100 text-green-700 py-3 rounded-xl text-center font-semibold">
                                ✓ Orden Lista para Servir
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
