import { motion } from 'framer-motion';
import { Receipt, FileText, Download, BarChart, Calendar, ChevronRight } from 'lucide-react';

export default function ReportsTab() {
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
                        Genera reportes personalizados en PDF o Excel con toda la información financiera de tu restaurante.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                    <div className="flex flex-col gap-2 text-left">
                        <label className="text-sm font-bold text-slate-700 ml-1">Rango de Fecha</label>
                        <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                            <Calendar size={18} className="text-slate-400" />
                            <span className="text-sm font-medium text-slate-600">Este Mes (Feb 1 - Feb 28)</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 text-left">
                        <label className="text-sm font-bold text-slate-700 ml-1">Formato</label>
                        <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-600 outline-none focus:ring-2 focus:ring-orange-500/20">
                            <option>Documento PDF (.pdf)</option>
                            <option>Hoja de Excel (.xlsx)</option>
                            <option>Valores CSV (.csv)</option>
                        </select>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                    <button className="flex items-center justify-center gap-3 px-8 py-4 bg-orange-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-orange-200 hover:bg-orange-600 hover:-translate-y-1 active:scale-95 transition-all group">
                        <Download size={24} />
                        GENERAR REPORTE
                        <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-50">
                    <div className="space-y-1 text-center">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ventas</div>
                        <div className="text-sm font-bold text-slate-700 italic">Incluido</div>
                    </div>
                    <div className="space-y-1 text-center">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Gastos</div>
                        <div className="text-sm font-bold text-slate-700 italic">Incluido</div>
                    </div>
                    <div className="space-y-1 text-center">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Utilidad</div>
                        <div className="text-sm font-bold text-slate-700 italic">Incluido</div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
