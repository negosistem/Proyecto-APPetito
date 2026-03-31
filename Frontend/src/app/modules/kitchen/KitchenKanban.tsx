import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Clock, Loader2, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/app/modules/auth/context/AuthContext';
import { useOrderSocket } from '@/app/modules/orders/hooks/useOrderSocket';
import { orderQueryKeys } from '@/app/modules/orders/queries/orderQueryKeys';
import { groupModifiers } from '@/app/modules/orders/utils/modifiers';

import KanbanColumn from './components/KanbanColumn';
import OrderTicket from './components/OrderTicket';
import { kitchenService } from './services/kitchenService';
import type { KitchenKanbanResponse, KitchenOrder } from './types';
import { playNewOrderTone } from './utils/playNewOrderTone';

const COLUMNS = [
    { id: 'new', title: 'NUEVO', color: 'red' as const, icon: AlertCircle },
    { id: 'accepted', title: 'ACEPTADO', color: 'yellow' as const, icon: Clock },
    { id: 'preparing', title: 'PREPARANDO', color: 'blue' as const, icon: Clock },
    { id: 'ready', title: 'LISTO', color: 'green' as const, icon: Clock },
];

const EMPTY_KANBAN: KitchenKanbanResponse = {
    new: [],
    accepted: [],
    preparing: [],
    ready: [],
};

export default function KitchenKanban() {
    const { user } = useAuth();
    const companyId = user?.id_empresa ? String(user.id_empresa) : '';
    const [selectedOrder, setSelectedOrder] = useState<KitchenOrder | null>(null);
    const [tick, setTick] = useState(0);
    const lastToastKeyRef = useRef<string | null>(null);

    const {
        data: kanbanData = EMPTY_KANBAN,
        isLoading,
        refetch,
    } = useQuery({
        queryKey: orderQueryKeys.kitchen(companyId),
        queryFn: () => kitchenService.getKanban(),
        enabled: Boolean(companyId),
    });

    const { status: wsStatus, lastEvent } = useOrderSocket(companyId);

    const handleRefresh = () => {
        void refetch();
    };

    useEffect(() => {
        const tickInterval = setInterval(() => setTick((currentTick) => currentTick + 1), 1000);
        return () => clearInterval(tickInterval);
    }, []);

    useEffect(() => {
        if (!selectedOrder) {
            return;
        }

        let nextSelectedOrder: KitchenOrder | null = null;
        for (const orders of Object.values(kanbanData)) {
            const match = orders.find((order) => order.id === selectedOrder.id);
            if (match) {
                nextSelectedOrder = match;
                break;
            }
        }

        setSelectedOrder(nextSelectedOrder);
    }, [kanbanData, selectedOrder]);

    useEffect(() => {
        if (!lastEvent || lastEvent.type !== 'NEW_ORDER') {
            return;
        }

        const eventKey = `${lastEvent.type}:${lastEvent.data.order_id}:${lastEvent.data.created_at ?? ''}`;
        if (lastToastKeyRef.current === eventKey) {
            return;
        }

        lastToastKeyRef.current = eventKey;
        const itemPreview = (lastEvent.data.items ?? [])
            .slice(0, 2)
            .map((item) => {
                const groupedModifiers = groupModifiers(item.modifiers_snapshot);
                const modifierParts: string[] = [];

                if (groupedModifiers.additions.length > 0) {
                    modifierParts.push(
                        `+ ${groupedModifiers.additions.map((modifier) => modifier.name).join(', ')}`,
                    );
                }

                if (groupedModifiers.removals.length > 0) {
                    modifierParts.push(
                        `- ${groupedModifiers.removals.map((modifier) => `Sin ${modifier.name}`).join(', ')}`,
                    );
                }

                if (groupedModifiers.notes.length > 0) {
                    modifierParts.push(
                        groupedModifiers.notes.map((modifier) => modifier.name).join(', '),
                    );
                }

                return modifierParts.length > 0
                    ? `${item.quantity}x ${item.product_name} (${modifierParts.join(' | ')})`
                    : `${item.quantity}x ${item.product_name}`;
            })
            .join(' | ');

        toast.success(
            `Nueva orden #${lastEvent.data.order_number} para ${lastEvent.data.table_label}`,
            itemPreview ? { description: itemPreview } : undefined,
        );
        playNewOrderTone();
    }, [lastEvent]);

    const wsIndicator = useMemo(
        () =>
            ({
                connected: {
                    icon: <Wifi size={14} />,
                    label: 'En vivo',
                    cls: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                },
                connecting: {
                    icon: <Loader2 size={14} className="animate-spin" />,
                    label: 'Conectando...',
                    cls: 'bg-amber-100 text-amber-700 border-amber-200',
                },
                disconnected: {
                    icon: <WifiOff size={14} />,
                    label: 'Sin conexion',
                    cls: 'bg-red-100 text-red-700 border-red-200',
                },
            })[wsStatus],
        [wsStatus],
    );

    if (isLoading) {
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
            <div className="bg-white border-b px-4 lg:px-6 py-3 lg:py-4 flex justify-between items-center shrink-0 pt-16 lg:pt-3">
                <div className="flex items-center gap-3">
                    <div>
                        <h1 className="text-lg lg:text-2xl font-bold">Cocina - Gestion de Pedidos</h1>
                        <p className="text-xs lg:text-sm text-gray-600 hidden sm:block">
                            Vista Kanban en tiempo real
                        </p>
                    </div>
                    <span
                        className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${wsIndicator.cls}`}
                    >
                        {wsIndicator.icon}
                        {wsIndicator.label}
                    </span>
                </div>
            </div>

            <div className="flex-1 p-3 lg:p-6 overflow-hidden">
                <div className="hidden lg:grid grid-cols-4 gap-6 h-full">
                    {COLUMNS.map((column) => (
                        <KanbanColumn
                            key={column.id}
                            title={column.title}
                            color={column.color}
                            orders={kanbanData[column.id]}
                            count={kanbanData[column.id].length}
                            onOrderClick={setSelectedOrder}
                            onUpdate={handleRefresh}
                            tick={tick}
                        />
                    ))}
                </div>

                <div className="lg:hidden flex gap-3 h-full overflow-x-auto pb-2 snap-x snap-mandatory">
                    {COLUMNS.map((column) => (
                        <div key={column.id} className="flex-shrink-0 w-[80vw] snap-start h-full">
                            <KanbanColumn
                                title={column.title}
                                color={column.color}
                                orders={kanbanData[column.id]}
                                count={kanbanData[column.id].length}
                                onOrderClick={setSelectedOrder}
                                onUpdate={handleRefresh}
                                tick={tick}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {selectedOrder && (
                <OrderTicket
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    onUpdate={handleRefresh}
                    tick={tick}
                />
            )}
        </div>
    );
}
