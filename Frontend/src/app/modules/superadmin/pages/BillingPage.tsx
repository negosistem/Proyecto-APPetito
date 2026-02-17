/**
 * BillingPage - Gestión de Facturación
 * Vista general de facturación y cobros
 */

import {
    DollarSign,
    TrendingUp,
    FileText,
    Download
} from 'lucide-react';

export default function BillingPage() {
    // Mock Stats
    const stats = {
        totalRevenue: 410500,
        growth: 24.8,
        invoicesThisMonth: 174
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Facturación</h1>
                <p className="text-gray-500 mt-1">Gestión de facturas y cobros</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Facturación Total</p>
                        <h3 className="text-3xl font-bold text-gray-900 mt-2">${stats.totalRevenue.toLocaleString()}</h3>
                    </div>
                    <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                        <DollarSign className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Crecimiento</p>
                        <h3 className="text-3xl font-bold text-green-600 mt-2">+{stats.growth}%</h3>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Facturas Este Mes</p>
                        <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.invoicesThisMonth}</h3>
                    </div>
                    <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                        <FileText className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Placeholder Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
                <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mb-6">
                    <FileText className="w-10 h-10 text-gray-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Sistema de Facturación</h2>
                <p className="text-gray-500 max-w-md mb-8">
                    Vista completa de facturación en desarrollo. Aquí podrás gestionar todas las facturas, notas de crédito y reportes fiscales.
                </p>
                <button className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors font-medium shadow-sm shadow-red-200">
                    <Download className="w-5 h-5" />
                    Descargar Reporte
                </button>
            </div>
        </div>
    );
}
