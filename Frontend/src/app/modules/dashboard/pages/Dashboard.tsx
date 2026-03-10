import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Users, Utensils, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { dashboardService, RecentOrder, DashboardStats, SalesData, CategoryData } from '../services/dashboardService';

import StatCard from '@/app/shared/components/StatCard';
import { formatNumber } from '@/lib/formatNumber';


export default function Dashboard() {
    const [salesData, setSalesData] = useState<SalesData[]>([]);
    const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
    const [orders, setOrders] = useState<RecentOrder[]>([]);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                setIsLoading(true);
                const data = await dashboardService.getDashboardData();
                setStats(data.stats);
                setSalesData(data.sales_week);
                setCategoryData(data.categories);
                setOrders(data.recent_orders);
            } catch (err: any) {
                console.error('Error cargando datos del dashboard:', err);
                setError('No se pudo cargar la información del dashboard.');
            } finally {
                setIsLoading(false);
            }
        };

        loadDashboardData();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    if (error || !stats) {
        return (
            <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
                {error || 'Error al cargar estadísticas.'}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Dashboard</h1>
                    <p className="text-slate-600">Resumen general del restaurante</p>
                </div>
                <button
                    onClick={() => window.location.reload()} // Simplified for Dashboard since it's a large useEffect
                    disabled={isLoading}
                    className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all text-slate-500 hover:text-orange-600 group"
                    title="Actualizar datos"
                >
                    <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin text-orange-500' : ''}`} />
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                <StatCard
                    title="Ventas del Día"
                    value={formatNumber(stats.ventas_del_dia.value)}
                    change={stats.ventas_del_dia.change}
                    icon={<DollarSign className="w-5 h-5 text-white" />}
                    color="bg-gradient-to-br from-green-500 to-emerald-600"
                />
                <StatCard
                    title="Pedidos Activos"
                    value={stats.pedidos_activos.formatted}
                    change={stats.pedidos_activos.change}
                    icon={<ShoppingBag className="w-5 h-5 text-white" />}
                    color="bg-gradient-to-br from-blue-500 to-cyan-600"
                />
                <StatCard
                    title="Clientes Hoy"
                    value={stats.clientes_hoy.formatted}
                    change={stats.clientes_hoy.change}
                    icon={<Users className="w-5 h-5 text-white" />}
                    color="bg-gradient-to-br from-purple-500 to-pink-600"
                />
                <StatCard
                    title="Mesas Ocupadas"
                    value={stats.mesas_ocupadas.formatted}
                    change={stats.mesas_ocupadas.change}
                    icon={<Utensils className="w-5 h-5 text-white" />}
                    color="bg-gradient-to-br from-orange-500 to-red-600"
                />

                {/* Staff Card - Only for Admin */}
                {stats.total_staff && (
                    <StatCard
                        title="Personal Total"
                        value={stats.total_staff.value.toString()}
                        change={0}
                        icon={<Users className="w-5 h-5 text-white" />}
                        color="bg-gradient-to-br from-indigo-500 to-purple-600"
                        onClick={() => navigate('/dashboard/staff')}
                    />
                )}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sales Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="lg:col-span-2 bg-white rounded-xl p-6 shadow-md border border-slate-200"
                >
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Ventas de la Semana</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={salesData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="name" stroke="#64748b" />
                            <YAxis stroke="#64748b" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'white',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="ventas"
                                stroke="url(#colorGradient)"
                                strokeWidth={3}
                                dot={{ fill: '#f97316', r: 5 }}
                            />
                            <defs>
                                <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#f97316" />
                                    <stop offset="100%" stopColor="#ef4444" />
                                </linearGradient>
                            </defs>
                        </LineChart>
                    </ResponsiveContainer>
                </motion.div>

                {/* Category Distribution */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-xl p-6 shadow-md border border-slate-200"
                >
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Categorías</h3>
                    <ResponsiveContainer width="100%" height={240}>
                        <PieChart>
                            <Pie
                                data={categoryData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {categoryData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 space-y-2">
                        {categoryData.map((item) => (
                            <div key={item.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span className="text-sm text-slate-600">{item.name}</span>
                                </div>
                                <span className="text-sm font-medium text-slate-900 text-right">{item.value.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Recent Orders */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-xl p-6 shadow-md border border-slate-200"
            >
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Últimos Pedidos</h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Pedido</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Cliente</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Mesa</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Total</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order, index) => (
                                <motion.tr
                                    key={order.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.5 + index * 0.1 }}
                                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                                >
                                    <td className="py-3 px-4 text-sm font-medium text-slate-900">{order.id}</td>
                                    <td className="py-3 px-4 text-sm text-slate-600">{order.cliente}</td>
                                    <td className="py-3 px-4 text-sm text-slate-600">Mesa {order.mesa}</td>
                                    <td className="py-3 px-4 text-sm font-medium text-slate-900 text-right">{formatNumber(order.total)}</td>
                                    <td className="py-3 px-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${order.estado === 'Listo' ? 'bg-green-100 text-green-700' :
                                            order.estado === 'Preparando' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-slate-100 text-slate-700'
                                            }`}>
                                            {order.estado}
                                        </span>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
}
