import { useState, useEffect } from 'react';
import { RefreshCw, Clock, AlertCircle } from 'lucide-react';
import KanbanColumn from './components/KanbanColumn';
import OrderTicket from './components/OrderTicket';
import { apiClient } from '../../shared/services/apiClient';

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

    useEffect(() => {
        fetchKanban();

        // Auto-refresh cada 30 segundos
        const interval = setInterval(fetchKanban, 30000);
        return () => clearInterval(interval);
    }, []);

    // Sync selectedOrder with new data when kanbanData updates
    useEffect(() => {
        if (selectedOrder) {
            let updatedOrder = null;
            // Search in all columns
            Object.values(kanbanData).forEach((orders: any) => {
                if (Array.isArray(orders)) {
                    const found = orders.find((o: any) => o.id === selectedOrder.id);
                    if (found) updatedOrder = found;
                }
            });

            if (updatedOrder) {
                setSelectedOrder(updatedOrder);
            }
        }
    }, [kanbanData]);

    const fetchKanban = async () => {
        try {
            const data = await apiClient.get<any>('/api/kitchen/kanban');
            setKanbanData(data);
        } catch (error) {
            console.error('Error fetching kanban:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Cargando cocina...</div>;
    }

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <span className="text-3xl">👨🍳</span>
                    <div>
                        <h1 className="text-2xl font-bold">Cocina - Gestión de Pedidos</h1>
                        <p className="text-sm text-gray-600">Vista Kanban en tiempo real</p>
                    </div>
                </div>

                <button
                    onClick={fetchKanban}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    <RefreshCw size={20} />
                    Refrescar
                </button>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 p-6 overflow-hidden">
                <div className="grid grid-cols-4 gap-6 h-full">
                    {COLUMNS.map((column) => (
                        <KanbanColumn
                            key={column.id}
                            title={column.title}
                            color={column.color}
                            orders={kanbanData[column.id] || []}
                            count={(kanbanData[column.id] || []).length}
                            onOrderClick={setSelectedOrder}
                        />
                    ))}
                </div>
            </div>

            {/* Modal de Orden Seleccionada */}
            {selectedOrder && (
                <OrderTicket
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    onUpdate={fetchKanban}
                />
            )}
        </div>
    );
}
