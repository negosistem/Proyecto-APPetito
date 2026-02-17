import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Wallet, Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { financeService, FinancialSummary } from '../services/financeService';

interface Props {
    dateRange: { start: string; end: string; label: string };
    refreshTrigger: number;
}

export default function FinancialBalance({ dateRange, refreshTrigger }: Props) {
    const [summary, setSummary] = useState<FinancialSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSummary = async () => {
            setLoading(true);
            try {
                const data = await financeService.getFinancialSummary(dateRange.start, dateRange.end);
                setSummary(data);
            } catch (error) {
                console.error('Error fetching financial summary:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSummary();
    }, [dateRange.start, dateRange.end, refreshTrigger]);

    if (loading) {
        return (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center justify-center h-[180px]">
                <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
            </div>
        );
    }

    const isPositive = (summary?.net_profit || 0) >= 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 relative overflow-hidden"
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                {/* Ingresos */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-500 font-medium text-sm border-b border-slate-50 pb-2">
                        <TrendingUp size={16} className="text-emerald-500" />
                        INGRESOS
                    </div>
                    <div className="text-3xl font-bold text-slate-900">
                        ${Number(summary?.total_income || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-0.5 rounded-full">
                        <ArrowUpRight size={12} />
                        +12% vs ayer
                    </div>
                </div>

                {/* Gastos */}
                <div className="space-y-2 border-l-0 md:border-l border-slate-100 md:pl-8">
                    <div className="flex items-center gap-2 text-slate-500 font-medium text-sm border-b border-slate-50 pb-2">
                        <TrendingDown size={16} className="text-red-500" />
                        GASTOS
                    </div>
                    <div className="text-3xl font-bold text-slate-900">
                        ${Number(summary?.total_expenses || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 w-fit px-2 py-0.5 rounded-full">
                        <ArrowUpRight size={12} />
                        +5% vs ayer
                    </div>
                </div>

                {/* Utilidad */}
                <div className="space-y-2 border-l-0 md:border-l border-slate-100 md:pl-8">
                    <div className="flex items-center gap-2 text-slate-500 font-medium text-sm border-b border-slate-50 pb-2">
                        <Wallet size={16} className="text-blue-500" />
                        UTILIDAD NETA
                    </div>
                    <div className={`text-4xl font-extrabold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                        ${Number(summary?.net_profit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-slate-400 text-xs font-medium">
                        Margen de utilidad: <span className="text-slate-700 font-bold">{summary?.profit_margin || 0}%</span>
                    </div>
                </div>
            </div>

            {/* Decorative element */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-[100px] -mr-10 -mt-10 opacity-50 z-0"></div>
        </motion.div>
    );
}
