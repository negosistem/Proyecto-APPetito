import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Clock, AlertCircle, Wifi, WifiOff, Loader2 } from 'lucide-react';
import KanbanColumn from './components/KanbanColumn';
import OrderTicket from './components/OrderTicket';
import { apiClient } from '../../shared/services/apiClient';
import { useKitchenSocket } from './hooks/useKitchenSocket';

const COLUMNS = [
    { id: 'new', title: 'NUEVO', color: 'red' as const, icon: AlertCircle },
    { id: 'accepted', title: 'ACEPTADO', color: 'yellow' as const, icon: Clock },
    { id: 'preparing', title: 'PREPARANDO', color: 'blue' as const, icon: Clock },
    { id: 'ready', title: 'LISTO', color: 'green' as const, icon: Clock }
];

export default function KitchenKanban() {
    const [kanbanData, setKanbanData] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);

    // ── Session timer ─────────────────────────────────────────────────────────
    const [tick, setTick] = useState(0);
    const sessionStartAt = useRef<number>(Date.now());

    const fetchKanban = useCallback(async () => {
        try {
            const data = await apiClient.get<any>('/api/kitchen/kanban');
            setKanbanData(data);
        } catch (error) {
            console.error('Error fetching kanban:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // ── WebSocket: recibe notificación y refresca el kanban ──────────────────
    const { status: wsStatus } = useKitchenSocket({ onUpdate: fetchKanban });

    useEffect(() => {
        fetchKanban();
        // Tick: actualiza timers de platos cada segundo
        const tickInterval = setInterval(() => setTick((t) => t + 1), 1000);
        return () => clearInterval(tickInterval);
    }, [fetchKanban]);

    // Sync selectedOrder con nuevos datos
    useEffect(() => {
        if (!selectedOrder) return;
        let found: any = null;
        Object.values(kanbanData).forEach((orders: any) => {
            if (Array.isArray(orders)) {
                const match = orders.find((o: any) => o.id === selectedOrder.id);
                if (match) found = match;
            }
        });
        if (found) setSelectedOrder(found);
    }, [kanbanData]);

    // ── Indicador de conexión WS ──────────────────────────────────────────
    const wsIndicator = {
        connected: { icon: <Wifi size={14} />, label: 'En vivo', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
        connecting: { icon: <Loader2 size={14} className="animate-spin" />, label: 'Conectando…', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
        disconnected: { icon: <WifiOff size={14} />, label: 'Sin conexión', cls: 'bg-red-100 text-red-700 border-red-200' },
    }[wsStatus];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
        );
    }

    return (
        <div
            className="fixed top-0 right-0 bottom-0 flex flex-col bg-gray-50 z-10 transition-all duration-300"
            style={{ left: 'var(--sidebar-w, 0px)' }}
        >
            {/* Header */}
            <div className="bg-white border-b px-4 lg:px-6 py-3 lg:py-4 flex justify-between items-center shrink-0 pt-16 lg:pt-3">
                <div className="flex items-center gap-3">
                    <div>
                        <h1 className="text-lg lg:text-2xl font-bold">Cocina — Gestión de Pedidos</h1>
                        <p className="text-xs lg:text-sm text-gray-600 hidden sm:block">Vista Kanban en tiempo real</p>
                    </div>
                    {/* WebSocket status badge */}
                    <span className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${wsIndicator.cls}`}>
                        {wsIndicator.icon}
                        {wsIndicator.label}
                    </span>
                </div>
            </div>

            {/* Kanban Board */}
            {/* Desktop: grid 4 cols | Mobile: horizontal scroll */}
            <div className="flex-1 p-3 lg:p-6 overflow-hidden">
                {/* Desktop */}
                <div className="hidden lg:grid grid-cols-4 gap-6 h-full">
                    {COLUMNS.map((column) => (
                        <KanbanColumn
                            key={column.id}
                            title={column.title}
                            color={column.color}
                            orders={kanbanData[column.id] || []}
                            count={(kanbanData[column.id] || []).length}
                            onOrderClick={setSelectedOrder}
                            onUpdate={fetchKanban}
                            tick={tick}
                        />
                    ))}
                </div>
                {/* Mobile: horizontal scroll */}
                <div className="lg:hidden flex gap-3 h-full overflow-x-auto pb-2 snap-x snap-mandatory">
                    {COLUMNS.map((column) => (
                        <div key={column.id} className="flex-shrink-0 w-[80vw] snap-start h-full">
                            <KanbanColumn
                                title={column.title}
                                color={column.color}
                                orders={kanbanData[column.id] || []}
                                count={(kanbanData[column.id] || []).length}
                                onOrderClick={setSelectedOrder}
                                onUpdate={fetchKanban}
                                tick={tick}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal de Orden Seleccionada */}
            {selectedOrder && (
                <OrderTicket
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    onUpdate={fetchKanban}
                    tick={tick}
                />
            )}
        </div>
    );
}
