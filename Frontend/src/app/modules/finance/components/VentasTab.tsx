import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Download, ExternalLink, MoreVertical, CreditCard, Banknote, Smartphone } from 'lucide-react';
import MetricsOverview from './MetricsOverview';
import { financeService } from '../services/financeService';
import { orderService, Order } from '../../orders/services/orderService';

interface Props {
    dateRange: { start: string; end: string; label: string };
    refreshTrigger: number;
}

export default function VentasTab({ dateRange, refreshTrigger }: Props) {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchOrders = async () => {
            setLoading(true);
            try {
                // In a real scenario, we would filter by date on the backend
                const data = await orderService.getOrders();
                // Simulation of filtering by date (since getOrders doesn't take params yet)
                setOrders(data);
            } catch (error) {
                console.error('Error fetching orders for sales tab:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, [dateRange.start, dateRange.end, refreshTrigger]);

    const filteredOrders = orders.filter(order =>
        (order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.id.toString().includes(searchTerm)) &&
        order.status === 'paid' // Only showing paid orders in sales tab
    );

    const getPaymentIcon = (id: number) => {
        // Simulation: in a real app, this would come from the order data
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
                    <h3 className="text-lg font-bold text-slate-900">Historial de Transacciones</h3>

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
                        <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all">
                            <Filter size={18} />
                            Filtros
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-all shadow-md">
                            <Download size={18} />
                            Exportar
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha / Hora</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Orden ID</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente / Mesa</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Método de Pago</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Monto</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-slate-50/80 transition-colors group">
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
                                        <div className="text-xs text-slate-500">Mesa {order.table_id || 'N/A'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {getPaymentIcon(order.id)}
                                            <span className="text-sm text-slate-600">{getPaymentMethod(order.id)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-slate-900">${Number(order.total).toFixed(2)}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all">
                                            <ExternalLink size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredOrders.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                                        No se encontraron transacciones para el período seleccionado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-6 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-sm text-slate-500"> Mostrando {filteredOrders.length} transacciones </div>
                    <div className="flex gap-2">
                        <button className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-400 cursor-not-allowed"> Anterior </button>
                        <button className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-400 cursor-not-allowed"> Siguiente </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
