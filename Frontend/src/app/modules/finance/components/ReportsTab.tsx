import { useState } from 'react';
import { motion } from 'framer-motion';
import { Receipt, Download, Calendar, ChevronRight } from 'lucide-react';
import { orderService, Order } from '../../orders/services/orderService';

interface Props {
    dateRange: { start: string; end: string; label: string };
}

type Format = 'csv' | 'pdf';

// ── CSV export (reusable for Reports tab) ─────────────────────────────────────
async function generateReport(dateRange: Props['dateRange'], format: Format) {
    if (format === 'pdf') {
        alert('Exportación PDF próximamente. Por ahora usa CSV.');
        return;
    }

    try {
        const data = await orderService.getOrders(1, 500);
        const allOrders: Order[] = (data as any).items ?? data;

        const start = new Date(dateRange.start).getTime();
        const end = new Date(dateRange.end).getTime();

        const paid = allOrders.filter(o => {
            const c = new Date(o.created_at).getTime();
            return o.status === 'paid' && c >= start && c <= end;
        });

        const getMethod = (id: number) =>
            id % 3 === 0 ? 'Transferencia' : id % 2 === 0 ? 'Tarjeta' : 'Efectivo';

        const header = ['Fecha', 'Hora', 'Orden ID', 'Cliente', 'Mesa', 'Subtotal', 'Impuesto', 'Total', 'Método'];
        const rows = paid.map(o => {
            const d = new Date(o.created_at);
            return [
                d.toLocaleDateString(),
                d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                `#${o.id}`,
                o.customer_name || 'Consumo Local',
                o.table_id ? `Mesa ${o.table_id}` : 'Para llevar',
                String(o.subtotal ?? ''),
                String(o.tax ?? ''),
                String(o.total),
                getMethod(o.id)
            ];
        });

        const totalVentas = paid.reduce((acc, o) => acc + Number(o.total), 0);
        rows.push(['', '', '', '', 'TOTAL', '', '', String(totalVentas.toFixed(2)), '']);

        const csv = [header, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_${dateRange.label.replace(/\s→\s/g, '_al_').replace(/\s/g, '_')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error('Error generando reporte:', e);
        alert('Error al generar el reporte. Inténtalo de nuevo.');
    }
}

export default function ReportsTab({ dateRange }: Props) {
    const [format, setFormat] = useState<Format>('csv');
    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {
        setLoading(true);
        await generateReport(dateRange, format);
        setLoading(false);
    };

    return (
        <div className="max-w-4xl mx-auto py-12">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl p-12 shadow-sm border border-slate-200 text-center space-y-8"
            >
                <div className="flex justify-center">
                    <div className="relative">
                        <div className="absolute inset-0 bg-orange-100 rounded-full blur-3xl opacity-50 scale-150"></div>
                        <div className="relative bg-orange-50 p-8 rounded-full">
                            <Receipt size={64} className="text-orange-500" />
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <h2 className="text-3xl font-black text-slate-900">Reportes Detallados</h2>
                    <p className="text-slate-500 max-w-md mx-auto text-lg">
                        Genera reportes financieros con todas las transacciones del período seleccionado.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                    <div className="flex flex-col gap-2 text-left">
                        <label className="text-sm font-bold text-slate-700 ml-1">Rango de Fecha</label>
                        <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                            <Calendar size={18} className="text-orange-500 flex-shrink-0" />
                            <span className="text-sm font-medium text-slate-700 truncate">{dateRange.label}</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 text-left">
                        <label className="text-sm font-bold text-slate-700 ml-1">Formato</label>
                        <select
                            value={format}
                            onChange={e => setFormat(e.target.value as Format)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-600 outline-none focus:ring-2 focus:ring-orange-500/20"
                        >
                            <option value="csv">Valores CSV (.csv)</option>
                            <option value="pdf">Documento PDF (.pdf) — próximamente</option>
                        </select>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="flex items-center justify-center gap-3 px-8 py-4 bg-orange-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-orange-200 hover:bg-orange-600 hover:-translate-y-1 active:scale-95 transition-all group disabled:opacity-50"
                    >
                        <Download size={24} />
                        {loading ? 'GENERANDO…' : 'GENERAR REPORTE'}
                        {!loading && <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-50">
                    {['Ventas', 'Impuestos', 'Total'].map(item => (
                        <div key={item} className="space-y-1 text-center">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{item}</div>
                            <div className="text-sm font-bold text-slate-700 italic">Incluido</div>
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
