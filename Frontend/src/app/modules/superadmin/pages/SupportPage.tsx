/**
 * SupportPage - Gestión de Soporte
 * Sistema de tickets y solicitudes de ayuda
 */

import {
    MessageSquare,
    Clock,
    CheckCircle,
    Headphones,
    Search,
    Filter,
    MessageCircle
} from 'lucide-react';

export default function SupportPage() {
    // Mock Data
    const tickets = [
        {
            id: 'T-1024',
            restaurant: 'La Piazza Italiana',
            user: 'Marco Rossi',
            subject: 'Error al procesar pago',
            priority: 'Alta',
            status: 'Abierto',
            created: 'Hace 2 horas',
            messages: 3,
            priorityColor: 'bg-red-100 text-red-700',
            statusColor: 'bg-red-100 text-red-700'
        },
        {
            id: 'T-1023',
            restaurant: 'Sushi Master',
            user: 'Yuki Tanaka',
            subject: 'Consulta sobre plan Enterprise',
            priority: 'Media',
            status: 'En Proceso',
            created: 'Hace 5 horas',
            messages: 8,
            priorityColor: 'bg-yellow-100 text-yellow-700',
            statusColor: 'bg-yellow-100 text-yellow-700'
        },
        {
            id: 'T-1022',
            restaurant: 'Burger Kingdom',
            user: 'John Smith',
            subject: 'Problema con impresora de tickets',
            priority: 'Baja',
            status: 'Resuelto',
            created: 'Hace 1 día',
            messages: 12,
            priorityColor: 'bg-blue-100 text-blue-700',
            statusColor: 'bg-green-100 text-green-700'
        },
        {
            id: 'T-1021',
            restaurant: 'Café Bohemio',
            user: 'Ana García',
            subject: 'Migración de datos',
            priority: 'Alta',
            status: 'Abierto',
            created: 'Hace 3 horas',
            messages: 5,
            priorityColor: 'bg-red-100 text-red-700',
            statusColor: 'bg-red-100 text-red-700'
        },
        {
            id: 'T-1020',
            restaurant: 'Taco Loco',
            user: 'Carlos Mendez',
            subject: 'Duda sobre facturación',
            priority: 'Media',
            status: 'En Proceso',
            created: 'Hace 6 horas',
            messages: 4,
            priorityColor: 'bg-yellow-100 text-yellow-700',
            statusColor: 'bg-yellow-100 text-yellow-700'
        }
    ];

    const stats = {
        open: 24,
        inProcess: 18,
        resolved: 45,
        avgTime: '2.4h'
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Soporte</h1>
                <p className="text-gray-500 mt-1">Gestión de tickets y solicitudes de ayuda</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Tickets Abiertos</p>
                        <h3 className="text-2xl font-bold text-red-600 mt-1">{stats.open}</h3>
                    </div>
                    <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center text-red-600">
                        <MessageSquare className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">En Proceso</p>
                        <h3 className="text-2xl font-bold text-yellow-600 mt-1">{stats.inProcess}</h3>
                    </div>
                    <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center text-yellow-600">
                        <Clock className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Resueltos Hoy</p>
                        <h3 className="text-2xl font-bold text-green-600 mt-1">{stats.resolved}</h3>
                    </div>
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
                        <CheckCircle className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Tiempo Promedio</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.avgTime}</h3>
                    </div>
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                        <Headphones className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar tickets..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <select className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-700 min-w-[180px]">
                            <option value="all">Todos los estados</option>
                            <option value="open">Abiertos</option>
                            <option value="process">En Proceso</option>
                            <option value="resolved">Resueltos</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Tickets Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ticket</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Restaurante</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuario</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Asunto</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Prioridad</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Creado</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Mensajes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {tickets.map((ticket) => (
                                <tr key={ticket.id} className="hover:bg-gray-50/80 transition-colors cursor-pointer">
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-semibold text-gray-900">{ticket.id}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-gray-600">{ticket.restaurant}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-gray-600">{ticket.user}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-gray-900 font-medium">{ticket.subject}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${ticket.priorityColor}`}>
                                            {ticket.priority}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${ticket.status === 'Resuelto' ? 'bg-green-100 text-green-700' : ticket.status === 'En Proceso' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                            {ticket.status === 'Resuelto' && <CheckCircle className="w-3 h-3" />}
                                            {ticket.status === 'En Proceso' && <Clock className="w-3 h-3" />}
                                            {ticket.status === 'Abierto' && <MessageSquare className="w-3 h-3" />}
                                            {ticket.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-gray-500">{ticket.created}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1 text-gray-500">
                                            <MessageCircle className="w-4 h-4" />
                                            <span className="text-sm">{ticket.messages}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
