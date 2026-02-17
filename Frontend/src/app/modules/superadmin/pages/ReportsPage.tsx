/**
 * ReportsPage - Reportes y Análisis
 * Vista centralizada de reportes del sistema
 */

import {
    BarChart3,
    TrendingUp,
    FileText,
    PieChart,
    Download
} from 'lucide-react';
import { toast } from 'sonner';

export default function ReportsPage() {
    const reports = [
        {
            title: 'Reporte de Ventas',
            description: 'Análisis completo de ingresos y transacciones',
            icon: BarChart3,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            action: 'Ver reporte'
        },
        {
            title: 'Reporte de Crecimiento',
            description: 'Métricas de crecimiento y adquisición',
            icon: TrendingUp,
            color: 'text-green-600',
            bg: 'bg-green-50',
            action: 'Ver reporte'
        },
        {
            title: 'Reporte Mensual',
            description: 'Resumen ejecutivo mensual completo',
            icon: FileText,
            color: 'text-orange-600',
            bg: 'bg-orange-50',
            action: 'Ver reporte'
        }
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
                    <p className="text-gray-500 mt-1">Análisis detallado y reportes del sistema</p>
                </div>
                <button
                    onClick={() => toast.success('Generando reporte...')}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors font-medium shadow-sm shadow-orange-200"
                >
                    <Download className="w-5 h-5" />
                    Generar Reporte
                </button>
            </div>

            {/* Report Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {reports.map((report, index) => {
                    const Icon = report.icon;
                    return (
                        <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group">
                            <div className={`w-12 h-12 ${report.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                <Icon className={`w-6 h-6 ${report.color}`} />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">{report.title}</h3>
                            <p className="text-gray-500 text-sm mb-4">{report.description}</p>
                            <span className={`text-sm font-medium ${report.color} flex items-center gap-1`}>
                                {report.action} →
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Placeholder Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
                <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mb-6">
                    <PieChart className="w-10 h-10 text-gray-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Sistema de Reportes Avanzados</h2>
                <p className="text-gray-500 max-w-md">
                    Dashboard de análisis y reportes personalizados en desarrollo
                </p>
            </div>
        </div>
    );
}
