/**
 * SettingsPage - Configuración Global
 * Administración completa del sistema
 */

import {
    Settings,
    CreditCard,
    Plug,
    Webhook,
    Shield,
    FileText,
    Save
} from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
    const settingsCards = [
        {
            title: 'Parámetros del Sistema',
            description: 'Configuración general de la plataforma',
            icon: Settings,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
        },
        {
            title: 'Configuración de Pagos',
            description: 'Stripe, PayPal y métodos de pago',
            icon: CreditCard,
            color: 'text-green-600',
            bg: 'bg-green-50',
        },
        {
            title: 'Integraciones',
            description: 'APIs y servicios externos',
            icon: Plug,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
        },
        {
            title: 'Webhooks',
            description: 'Eventos y notificaciones automáticas',
            icon: Webhook,
            color: 'text-orange-600',
            bg: 'bg-orange-50',
        },
        {
            title: 'Seguridad',
            description: 'Autenticación, permisos y encriptación',
            icon: Shield,
            color: 'text-red-600',
            bg: 'bg-red-50',
        },
        {
            title: 'Logs del Sistema',
            description: 'Registro de actividad y auditoría',
            icon: FileText,
            color: 'text-gray-600',
            bg: 'bg-gray-50',
        }
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Configuración Global</h1>
                    <p className="text-gray-500 mt-1">Administración completa del sistema</p>
                </div>
                <button
                    onClick={() => toast.success('Cambios guardados')}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium shadow-sm shadow-red-200"
                >
                    <Save className="w-4 h-4" />
                    Guardar Cambios
                </button>
            </div>

            {/* Settings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {settingsCards.map((card, index) => {
                    const Icon = card.icon;
                    return (
                        <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group">
                            <div className={`w-12 h-12 ${card.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                <Icon className={`w-6 h-6 ${card.color}`} />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">{card.title}</h3>
                            <p className="text-gray-500 text-sm mb-4">{card.description}</p>
                            <span className={`text-sm font-medium ${card.color} flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
                                Configurar →
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* System Status Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Estado del Sistema</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="font-semibold text-green-700">API Status</span>
                        </div>
                        <p className="text-sm text-green-600">Operacional</p>
                    </div>

                    <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="font-semibold text-green-700">Base de Datos</span>
                        </div>
                        <p className="text-sm text-green-600">Operacional</p>
                    </div>

                    <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="font-semibold text-green-700">Pagos</span>
                        </div>
                        <p className="text-sm text-green-600">Operacional</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
