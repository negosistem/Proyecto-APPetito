/**
 * SubscriptionsPage - Gestión de Suscripciones
 * Vista detallada de suscripciones, estados de pago y renovaciones
 */

import { useState, useEffect } from 'react';
import { superadminService } from '../services/superadminService';
import type { Company } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { StatusBadge } from '../components/StatusBadge';
import {
    Search,
    Filter,
    Download,
    CreditCard,
    Calendar,
    AlertCircle,
    DollarSign,
    MoreHorizontal,
    Edit3,
    RefreshCw,
    XCircle,
    CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

export default function SubscriptionsPage() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterPlan, setFilterPlan] = useState<string>('all');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await superadminService.getAllCompanies({ include_inactive: true });
            setCompanies(data);
        } catch (error: any) {
            console.error('Error al cargar datos:', error);
            toast.error('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    // Mock helpers for data not in backend yet
    const getPlanDetails = (company: Company) => {
        if (company.max_tables > 50) return { name: 'Empresarial', price: 599, period: 'año' };
        if (company.max_tables > 20) return { name: 'Profesional', price: 299, period: 'año' };
        return { name: 'Básico', price: 99, period: 'mes' };
    };

    const getPaymentMethod = (index: number) => {
        const methods = [
            { type: 'Tarjeta', last4: '4242', icon: CreditCard },
            { type: 'Tarjeta', last4: '5555', icon: CreditCard },
            { type: 'Transferencia', last4: null, icon: DollarSign },
        ];
        return methods[index % methods.length];
    };

    const getDates = (createdAt: string) => {
        const start = new Date(createdAt);
        const next = addMonths(start, 1); // Mock next renewal
        const last = subMonths(next, 1);
        return {
            next: format(next, 'dd MMM yyyy', { locale: es }),
            last: format(last, 'dd MMM yyyy', { locale: es })
        };
    };

    // Filter logic
    const filteredCompanies = companies.filter(company => {
        const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase());
        const plan = getPlanDetails(company);
        const matchesPlan = filterPlan === 'all' || plan.name.toLowerCase() === filterPlan.toLowerCase();
        return matchesSearch && matchesPlan;
    });

    // Stats calculation
    const stats = {
        mrr: companies.reduce((acc, curr) => {
            const price = getPlanDetails(curr).price;
            return acc + (getPlanDetails(curr).period === 'mes' ? price : price / 12);
        }, 0),
        active: companies.filter(c => c.subscription_status === 'active').length,
        renewingSoon: Math.floor(companies.length * 0.15), // Mock
        pending: companies.filter(c => c.subscription_status === 'suspended').length
    };

    if (loading) {
        return <LoadingSpinner text="Cargando suscripciones..." />;
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Suscripciones</h1>
                    <p className="text-gray-500 mt-1">Gestión avanzada de suscripciones y pagos</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors font-medium shadow-sm shadow-orange-200">
                    <Download className="w-4 h-4" />
                    Exportar Facturas
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">MRR Total</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">
                            {Math.round(stats.mrr).toLocaleString()}
                        </h3>
                        <p className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
                            <span className="bg-green-100 px-1.5 py-0.5 rounded-full">+18.2%</span>
                        </p>
                    </div>
                    <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                        <DollarSign className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Suscripciones Activas</p>
                        <h3 className="text-2xl font-bold text-green-600 mt-1">{stats.active}</h3>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                        <CreditCard className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Por Renovar (30 días)</p>
                        <h3 className="text-2xl font-bold text-orange-600 mt-1">{stats.renewingSoon}</h3>
                    </div>
                    <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                        <Calendar className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Pagos Pendientes</p>
                        <h3 className="text-2xl font-bold text-red-600 mt-1">{stats.pending}</h3>
                    </div>
                    <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
                        <AlertCircle className="w-6 h-6" />
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
                            placeholder="Buscar por restaurante..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <select
                            value={filterPlan}
                            onChange={(e) => setFilterPlan(e.target.value)}
                            className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-700 min-w-[180px]"
                        >
                            <option value="all">Todos los planes</option>
                            <option value="básico">Básico</option>
                            <option value="profesional">Profesional</option>
                            <option value="empresarial">Empresarial</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Restaurante</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Precio</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Método de Pago</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Próxima Renovación</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Pagado</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredCompanies.map((company, index) => {
                                const plan = getPlanDetails(company);
                                const paymentMethod = getPaymentMethod(index);
                                const dates = getDates(company.created_at);
                                const totalPaid = plan.price * (Math.floor(Math.random() * 5) + 1); // Mock

                                return (
                                    <tr key={company.id} className="hover:bg-gray-50/80 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm ${company.name.charAt(0).toUpperCase() < 'M' ? 'bg-orange-500' : 'bg-indigo-500'
                                                    }`}>
                                                    {company.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900 text-sm">{company.name}</p>
                                                    <p className="text-xs text-gray-500 capitalize">{plan.period}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border bg-gray-100 text-gray-700 border-gray-200">
                                                {plan.name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="font-semibold text-gray-900 text-sm">{plan.price.toFixed(2)}</div>
                                            <div className="text-xs text-gray-500">/{plan.period}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <paymentMethod.icon className="w-4 h-4 text-gray-400" />
                                                <span>{paymentMethod.type} {paymentMethod.last4 ? `•••• ${paymentMethod.last4}` : ''}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={company.subscription_status} size="sm" />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">{dates.next}</div>
                                            <div className="text-xs text-gray-500">Último: {dates.last}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-semibold text-gray-900 text-sm">{totalPaid.toFixed(2)}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-1 text-blue-600 hover:bg-blue-50 rounded tooltip" title="Editar Suscripción">
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button className="p-1 text-green-600 hover:bg-green-50 rounded tooltip" title="Sincronizar Pagos">
                                                    <RefreshCw className="w-4 h-4" />
                                                </button>
                                                <button className="p-1 text-red-600 hover:bg-red-50 rounded tooltip" title="Cancelar Suscripción">
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                                <button className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
