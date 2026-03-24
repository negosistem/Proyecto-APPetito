import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Play, AlertCircle, ChefHat } from 'lucide-react';
import { apiClient } from '../../../shared/services/apiClient';

interface Props {
    title: string;
    color: 'red' | 'yellow' | 'blue' | 'green';
    orders: any[];
    count: number;
    onOrderClick: (order: any) => void;
    onUpdate?: () => void;
    tick: number;
}

export default function KanbanColumn({ title, color, orders, count, onOrderClick, onUpdate, tick }: Props) {
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const colorClasses = {
        red: 'bg-red-100 text-red-700 border-red-300',
        yellow: 'bg-yellow-100 text-yellow-700 border-yellow-300',
        blue: 'bg-blue-100 text-blue-700 border-blue-300',
        green: 'bg-green-100 text-green-700 border-green-300'
    };

    const ticketBorderColors = {
        red: 'border-red-500 shadow-red-200',
        yellow: 'border-yellow-500 shadow-yellow-200',
        blue: 'border-blue-500 shadow-blue-200',
        green: 'border-green-500 shadow-green-200'
    };

    const handleAccept = async (e: React.MouseEvent, orderId: number) => {
        e.stopPropagation();
        try {
            await apiClient.put(`/api/kitchen/orders/${orderId}/accept`, {});
            if (onUpdate) onUpdate();
        } catch { }
    };

    const handleStart = async (e: React.MouseEvent, orderId: number) => {
        e.stopPropagation();
        try {
            await apiClient.put(`/api/kitchen/orders/${orderId}/start`, {});
            if (onUpdate) onUpdate();
        } catch { }
    };

    // Calculate Alerts (Overdue in Preparing)
    const isColumnPreparing = title === 'PREPARANDO';
    let countAlertas = 0;

    const isItemOverdue = (order: any, item: any) => {
        // Alertas solo en estado 'preparing'
        if (item.state !== 'preparing' || !item.started_at) return false;

        const startedMillis = new Date(item.started_at).getTime();
        const elapsedMinutes = (Date.now() - startedMillis) / 60000;

        const limit = item.prep_time_minutes || 10;
        return elapsedMinutes > limit;
    };

    const getDishTimer = (item: any) => {
        if (!item.started_at) return "00:00";

        // Si ya terminó, mostrar tiempo final. Si no, tiempo actual.
        const endTime = item.completed_at ? new Date(item.completed_at).getTime() : Date.now();
        const diff = Math.floor((endTime - new Date(item.started_at).getTime()) / 1000);

        if (diff < 0) return "00:00";
        const m = Math.floor(diff / 60);
        const s = diff % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    orders.forEach(order => {
        const hasOverdue = order.items.some((item: any) => isItemOverdue(order, item));
        if (hasOverdue) countAlertas++;
    });

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)]">
            {/* Column Header */}
            <div className={`${colorClasses[color]} px-4 py-3 rounded-t-xl border-2 font-semibold flex items-center justify-between`}>
                <span>{title}</span>
                <div className="flex items-center">
                    <span className="ml-2 px-2 py-1 bg-white/50 rounded-full text-sm">
                        {count}
                    </span>
                    {countAlertas > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse ml-2 flex fill-white items-center gap-1">
                            <AlertCircle size={12} /> {countAlertas}
                        </span>
                    )}
                </div>
            </div>

            {/* Orders List */}
            <div className="flex-1 bg-white border-2 border-t-0 rounded-b-xl p-3 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-amber-300 scrollbar-track-transparent">
                {orders.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                        Sin órdenes
                    </div>
                ) : (
                    orders.map((order) => {
                        const colIsListo = title === 'LISTO';
                        const isExpanded = expandedId === order.id;

                        let orderTodosVencidos = false;
                        if (isColumnPreparing && order.items.length > 0) {
                            orderTodosVencidos = order.items.every((item: any) => isItemOverdue(order, item));
                        }

                        // Compact view for Listo
                        if (colIsListo && !isExpanded) {
                            return (
                                <div
                                    key={order.id}
                                    onClick={() => setExpandedId(order.id)}
                                    className="bg-white border border-green-200 rounded-xl p-3 cursor-pointer hover:shadow-md hover:border-green-400 transition-all duration-200"
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-green-700">
                                            #{order.order_number}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-700 font-bold mt-1">
                                        {order.table ? `Mesa ${order.table}` : 'Para llevar'}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {order.items.length} platos · toca para ver
                                    </p>
                                </div>
                            );
                        }

                        // Full Card
                        return (
                            <motion.div
                                key={order.id}
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className={`bg-white border-2 ${ticketBorderColors[color]} rounded-xl p-4 cursor-pointer hover:shadow-lg transition ${orderTodosVencidos ? 'animate-pulse ring-2 ring-red-400 ring-offset-1' : ''}`}
                                onClick={() => colIsListo ? setExpandedId(null) : onOrderClick(order)}
                            >
                                {/* Header */}
                                <div className="flex justify-between items-center mb-3">
                                    <span className="font-bold text-lg">#{order.order_number}</span>
                                    <span className="px-2 py-1 bg-gray-100 rounded text-sm font-bold text-slate-700">
                                        {order.table ? `Mesa ${order.table}` : 'Para llevar'}
                                    </span>
                                </div>

                                {/* Se eliminó hora de llegada por solicitud del usuario */}

                                {/* Items Preview */}
                                <div className="space-y-2 mt-2">
                                    {order.items.slice(0, 4).map((item: any, idx: number) => {
                                        const vencido = isItemOverdue(order, item);
                                        const isPreparing = item.state === 'preparing';
                                        return (
                                            <div key={idx} className={`flex items-center gap-2 text-base ${vencido ? 'text-red-600 font-bold animate-pulse' : 'font-medium text-slate-800'}`}>
                                                <span className={`w-2.5 h-2.5 shrink-0 rounded-full ${item.state === 'ready' ? 'bg-green-500' :
                                                    isPreparing ? 'bg-blue-500' :
                                                        'bg-gray-300'
                                                    }`}></span>
                                                <span className="truncate flex-1">{item.quantity}x {item.product_name}</span>
                                                {(isPreparing || item.state === 'ready') && item.started_at && (
                                                    <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded shrink-0 ${vencido ? 'bg-red-100' :
                                                        item.state === 'ready' ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                                                        {getDishTimer(item)}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {order.items.length > 4 && (
                                        <div className="text-sm text-gray-500 font-medium pt-1 border-t border-slate-100 mt-2">
                                            +{order.items.length - 4} más...
                                        </div>
                                    )}
                                </div>

                                {/* Progress Bar */}
                                {order.progress.percentage > 0 && !colIsListo && (
                                    <div className="mt-3">
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-green-500 h-2 rounded-full transition-all"
                                                style={{ width: `${order.progress.percentage}%` }}
                                            ></div>
                                        </div>
                                        <p className="text-xs text-gray-600 mt-1 text-center">
                                            {order.progress.completed}/{order.progress.total} listos
                                        </p>
                                    </div>
                                )}

                                {/* Inline Mini-Buttons */}
                                {title === 'NUEVO' && (
                                    <button
                                        onClick={(e) => handleAccept(e, order.id)}
                                        className="w-full mt-3 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold py-2 rounded-lg transition-all shadow-sm flex justify-center items-center gap-1"
                                    >
                                        <Check size={14} /> Aceptar Pedido
                                    </button>
                                )}
                                {title === 'ACEPTADO' && (
                                    <div className="flex gap-2 mt-3">
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                try {
                                                    await apiClient.put(`/api/kitchen/orders/${order.id}/revert-to-new`, {});
                                                    if (onUpdate) onUpdate();
                                                } catch { }
                                            }}
                                            className="w-1/3 border border-red-300 text-red-600 hover:bg-red-50 text-xs py-2 rounded-lg transition-all flex justify-center items-center"
                                        >
                                            ← Atras
                                        </button>
                                        <button
                                            onClick={(e) => handleStart(e, order.id)}
                                            className="w-2/3 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold py-2 rounded-lg transition-all shadow-sm flex justify-center items-center gap-1"
                                        >
                                            <Play size={14} /> Pasar a Cocina
                                        </button>
                                    </div>
                                )}
                                {title === 'PREPARANDO' && (
                                    <div className="flex gap-2 mt-3">
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                try {
                                                    await apiClient.put(`/api/kitchen/orders/${order.id}/revert-to-accepted`, {});
                                                    if (onUpdate) onUpdate();
                                                } catch { }
                                            }}
                                            className="w-1/3 border border-amber-300 text-amber-600 hover:bg-amber-50 text-xs py-2 rounded-lg transition-all flex justify-center items-center"
                                        >
                                            ← Atras
                                        </button>
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                if (order.progress.percentage < 100) {
                                                    alert("Aún hay platos sin terminar");
                                                    return;
                                                }
                                                try {
                                                    await apiClient.put(`/api/kitchen/orders/${order.id}/complete`, {});
                                                    if (onUpdate) onUpdate();
                                                } catch { }
                                            }}
                                            className={`w-2/3 text-xs font-semibold py-2 rounded-lg transition-all shadow-sm flex justify-center items-center gap-1 ${order.progress.percentage === 100 ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                                        >
                                            <ChefHat size={14} /> Marcar Listos
                                        </button>
                                    </div>
                                )}
                                {colIsListo && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onOrderClick(order); }}
                                        className="w-full mt-3 border border-orange-300 text-orange-600 hover:bg-orange-50 text-xs py-2 rounded-lg transition-all"
                                    >
                                        Ver Detalles / Revertir
                                    </button>
                                )}
                            </motion.div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
