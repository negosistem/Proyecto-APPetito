import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { financeService, DailySales, TopProduct, SalesSummary } from '../services/financeService';
import { Loader2 } from 'lucide-react';

interface Props {
    dateRange: { start: string; end: string; label: string };
    refreshTrigger: number;
}

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

export default function PerformanceCharts({ dateRange, refreshTrigger }: Props) {
    const [dailySales, setDailySales] = useState<DailySales[]>([]);
    const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
    const [summary, setSummary] = useState<SalesSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [sales, products, summ] = await Promise.all([
                    financeService.getDailySales(dateRange.start, dateRange.end),
                    financeService.getTopProducts(dateRange.start, dateRange.end, 5),
                    financeService.getSalesSummary(dateRange.start, dateRange.end)
                ]);
                setDailySales(sales);
                setTopProducts(products);
                setSummary(summ);
            } catch (error) {
                console.error('Error fetching chart data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [dateRange.start, dateRange.end, refreshTrigger]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[400px]">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
                </div>
            </div>
        );
    }

    const pieData = [
        { name: 'Efectivo', value: summary?.cash_sales || 0, color: '#10b981' },
        { name: 'Tarjeta', value: summary?.card_sales || 0, color: '#3b82f6' },
        { name: 'Transferencia', value: summary?.transfer_sales || 0, color: '#8b5cf6' },
    ].filter(d => d.value > 0);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sales Area Chart */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200"
                >
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Ventas del Período</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dailySales}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    tickFormatter={(value: string) => new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    tickFormatter={(value) => `$${value}`}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="total"
                                    stroke="#f97316"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorSales)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Payment Methods Donut Chart */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200"
                >
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Métodos de Pago</h3>
                    <div className="h-[300px] w-full flex flex-col md:flex-row items-center justify-center">
                        <div className="w-full h-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={100}
                                        paddingAngle={8}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex flex-col gap-3 min-w-[150px]">
                            {pieData.map((item) => (
                                <div key={item.name} className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="text-sm font-medium text-slate-600">{item.name}</span>
                                    </div>
                                    <span className="text-sm font-bold text-slate-900">
                                        {((item.value / (summary?.total_sales || 1)) * 100).toFixed(0)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Top Products */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200"
            >
                <h3 className="text-lg font-bold text-slate-900 mb-6">Top 5 Productos Más Vendidos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {topProducts.map((product, index) => (
                        <div key={product.product_name} className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col justify-between group hover:bg-white hover:shadow-md hover:border-orange-100 transition-all">
                            <div>
                                <div className="text-xs font-bold text-slate-400 uppercase mb-1">#{index + 1}</div>
                                <div className="text-sm font-bold text-slate-800 mb-2 truncate" title={product.product_name}>
                                    {product.product_name}
                                </div>
                            </div>
                            <div className="flex items-end justify-between">
                                <div className="text-slate-500 text-xs">{product.quantity_sold} vendidos</div>
                                <div className="text-orange-600 font-bold">${Number(product.total_revenue).toFixed(2)}</div>
                            </div>
                            <div className="mt-3 h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(product.total_revenue / (topProducts[0]?.total_revenue || 1)) * 100}%` }}
                                    className="h-full bg-orange-500"
                                />
                            </div>
                        </div>
                    ))}
                    {topProducts.length === 0 && (
                        <div className="col-span-full py-10 text-center text-slate-400 italic">
                            No hay datos suficientes para mostrar el top de productos.
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
