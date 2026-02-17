import { useEffect, useState } from 'react';
import { DollarSign, ShoppingCart, TrendingUp, Gift, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { financeService, SalesSummary } from '../services/financeService';
import { toast } from 'sonner';

interface Props {
    dateRange: { start: string; end: string; label: string };
    refreshTrigger: number;
}

export default function MetricsOverview({ dateRange, refreshTrigger }: Props) {
    const [summary, setSummary] = useState<SalesSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSummary = async () => {
            setLoading(true);
            try {
                const data = await financeService.getSalesSummary(dateRange.start, dateRange.end);
                setSummary(data);
            } catch (error) {
                console.error('Error fetching summary:', error);
                toast.error('No se pudo cargar el resumen de ventas');
            } finally {
                setLoading(false);
            }
        };

        fetchSummary();
    }, [dateRange.start, dateRange.end, refreshTrigger]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center justify-center h-32">
                        <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
                    </div>
                ))}
            </div>
        );
    }

    const cards = [
        {
            label: 'Total Ventas',
            value: `$${Number(summary?.total_sales || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            icon: DollarSign,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-100'
        },
        {
            label: 'Órdenes',
            value: summary?.total_orders || 0,
            icon: ShoppingCart,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
            borderColor: 'border-emerald-100'
        },
        {
            label: 'Ticket Promedio',
            value: `$${Number(summary?.average_ticket || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            icon: TrendingUp,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50',
            borderColor: 'border-purple-100'
        },
        {
            label: 'Propinas',
            value: `$${Number(summary?.total_tips || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            icon: Gift,
            color: 'text-orange-600',
            bgColor: 'bg-orange-50',
            borderColor: 'border-orange-100'
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cards.map(({ label, value, icon: Icon, color, bgColor, borderColor }, index) => (
                <motion.div
                    key={label}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -4 }}
                    className={`bg-white rounded-2xl p-6 shadow-sm border ${borderColor} hover:shadow-md transition-all relative overflow-hidden group`}
                >
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <span className="text-slate-500 text-sm font-medium">{label}</span>
                        <div className={`p-2.5 ${bgColor} rounded-xl transition-colors group-hover:bg-white`}>
                            <Icon className={color} size={20} />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-slate-900 relative z-10">{value}</div>

                    {/* Decorative background icon */}
                    <Icon className={`absolute -bottom-2 -right-2 w-20 h-20 ${color} opacity-[0.03] group-hover:opacity-[0.06] transition-opacity`} />
                </motion.div>
            ))}
        </div>
    );
}
