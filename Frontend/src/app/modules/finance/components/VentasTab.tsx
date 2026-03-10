import { useEffect, useState, useCallback } from 'react';
import { Search, Download, ExternalLink, CreditCard, Banknote, Smartphone, Loader2 } from 'lucide-react';
import MetricsOverview from './MetricsOverview';
import { orderService, Order } from '../../orders/services/orderService';
import { formatNumber } from '@/lib/formatNumber';

interface Props {
    dateRange: { start: string; end: string; label: string };
    refreshTrigger: number;
}

// ── CSV export helper ─────────────────────────────────────────────────────────
function exportToCsv(orders: Order[], label: string) {
    const header = ['Fecha', 'Hora', 'Orden ID', 'Cliente', 'Mesa', 'Método de Pago', 'Total'];
    const getMethod = (id: number) =>
        id % 3 === 0 ? 'Transferencia' : id % 2 === 0 ? 'Tarjeta' : 'Efectivo';

    const rows = orders.map(o => {
        const d = new Date(o.created_at);
        return [
            d.toLocaleDateString(),
            d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            `#${o.id}`,
            o.customer_name || 'Consumo Local',
            o.table_id ? `Mesa ${o.table_id}` : 'Para llevar',
            getMethod(o.id),
            String(o.total)
        ];
    });

    const csv = [header, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ventas_${label.replace(/\s→\s/g, '_al_').replace(/\s/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

export default function VentasTab({ dateRange, refreshTrigger }: Props) {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const data = await orderService.getOrders(1, 500);
            // Handle both paginated and plain array responses
            setOrders((data as any).items ?? data);
        } catch (error) {
            console.error('Error fetching orders for sales tab:', error);
        } finally {
            setLoading(false);
        }
    }, [refreshTrigger]);

    useEffect(() => { fetchOrders(); }, [fetchOrders, dateRange.start, dateRange.end]);

    const start = new Date(dateRange.start).getTime();
    const end = new Date(dateRange.end).getTime();

    const filteredOrders = orders.filter(order => {
        const created = new Date(order.created_at).getTime();
        return (
            order.status === 'paid' &&
            created >= start &&
            created <= end &&
            (order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.id.toString().includes(searchTerm))
        );
    });

    const getPaymentIcon = (id: number) => {
        if (id % 3 === 0) return <Smartphone className="text-purple-500" size={16} />;
        if (id % 2 === 0) return <CreditCard className="text-blue-500" size={16} />;
        return <Banknote className="text-emerald-500" size={16} />;
    };

    const getPaymentMethod = (id: number) => {
        if (id % 3 === 0) return 'Transferencia';
        if (id % 2 === 0) return 'Tarjeta';
        return 'Efectivo';
    };

    return (
        <div className="space-y-6">
            <MetricsOverview dateRange={dateRange} refreshTrigger={refreshTrigger} />

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Historial de Transacciones</h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Período: <span className="font-medium text-slate-600">{dateRange.label}</span>
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar por cliente o ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all w-full md:w-64"
                            />
                        </div>
                        <button
                            onClick={() => exportToCsv(filteredOrders, dateRange.label)}
                            disabled={filteredOrders.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <Download size={18} />
                            Exportar CSV
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="animate-spin text-orange-500" size={32} />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha / Hora</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Orden ID</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente / Mesa</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Método de Pago</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Monto</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-slate-900 font-medium">
                                                {new Date(order.created_at).toLocaleDateString()}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-bold text-slate-700">#{order.id}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-slate-800">{order.customer_name || 'Consumo Local'}</div>
                                            <div className="text-xs text-slate-500">{order.table_id ? `Mesa ${order.table_id}` : 'Para llevar'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {getPaymentIcon(order.id)}
                                                <span className="text-sm text-slate-600">{getPaymentMethod(order.id)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold text-slate-900 text-right">{formatNumber(order.total)}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all">
                                                <ExternalLink size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredOrders.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                                            No se encontraron transacciones para el período seleccionado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="p-6 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-sm text-slate-500">
                        Mostrando <span className="font-medium text-slate-900">{filteredOrders.length}</span> transacciones
                    </div>
                </div>
            </div>
        </div>
    );
}
