/**
 * PlansPage - Gestión de Planes de Suscripción
 * Muestra las tarjetas de precios y características
 */

import { useState } from 'react';
import {
    Check,
    Edit,
    Copy,
    Trash2,
    Plus,
    Users,
    DollarSign,
    Zap,
    Package
} from 'lucide-react';
import { toast } from 'sonner';

interface PlanFeature {
    text: string;
    included: boolean;
}

interface Plan {
    id: string;
    name: string;
    description: string;
    price: number;
    billing: 'monthly' | 'yearly';
    subscribers: number;
    color: string;
    limits: {
        users: number | string;
        tables: number | string;
        orders: string;
        storage: string;
    };
    features: PlanFeature[];
    popular?: boolean;
}

export default function PlansPage() {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    const toggleBilling = () => {
        setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly');
    };

    // Stats
    const stats = {
        activePlans: 4,
        totalSubscribers: 174,
        monthlyRevenue: 34200
    };

    // Mock Data based on reference image
    const plans: Plan[] = [
        {
            id: 'basic',
            name: 'Básico',
            description: 'Ideal para pequeños restaurantes que están comenzando',
            price: billingCycle === 'monthly' ? 99 : 99 * 10,
            billing: billingCycle,
            subscribers: 45,
            color: 'bg-orange-500',
            limits: {
                users: 5,
                tables: 15,
                orders: '500/mes',
                storage: '5GB'
            },
            features: [
                { text: 'Dashboard básico', included: true },
                { text: 'Gestión de menú', included: true },
                { text: 'Gestión de pedidos', included: true },
                { text: 'Gestión de mesas', included: true },
                { text: 'Reportes básicos', included: true },
                { text: 'Soporte por email', included: true },
                { text: 'Análisis avanzado', included: true }, // faded in image usually means disabled/included but visually distinct? Assuming included for now or maybe checks
                { text: 'API Access', included: true },
                { text: 'Soporte prioritario', included: true },
                { text: 'Personalización', included: true },
            ]
        },
        {
            id: 'pro',
            name: 'Profesional',
            description: 'Perfecto para restaurantes en crecimiento',
            price: billingCycle === 'monthly' ? 299 : 299 * 10,
            billing: billingCycle,
            subscribers: 85,
            color: 'bg-orange-600', // Red-Orange
            limits: {
                users: 15,
                tables: 40,
                orders: 'Ilimitado',
                storage: '50GB'
            },
            features: [
                { text: 'Todo en Básico', included: true },
                { text: 'Análisis avanzado', included: true },
                { text: 'Gestión de staff', included: true },
                { text: 'Gestión de clientes', included: true },
                { text: 'Código QR personalizado', included: true },
                { text: 'Reservas online', included: true },
                { text: 'Reportes avanzados', included: true },
                { text: 'Integraciones básicas', included: true },
                { text: 'API Access', included: true },
                { text: 'White label', included: true },
            ]
        },
        {
            id: 'business',
            name: 'Empresarial',
            description: 'Para cadenas de restaurantes y negocios grandes',
            price: billingCycle === 'monthly' ? 599 : 599 * 10,
            billing: billingCycle,
            subscribers: 32,
            color: 'bg-red-600',
            limits: {
                users: 50,
                tables: 100,
                orders: 'Ilimitado',
                storage: '200GB'
            },
            features: [
                { text: 'Todo en Profesional', included: true },
                { text: 'API Access completo', included: true },
                { text: 'Multi-ubicación', included: true },
                { text: 'Inventario avanzado', included: true },
                { text: 'Finanzas avanzadas', included: true },
                { text: 'Soporte prioritario', included: true },
                { text: 'Integraciones premium', included: true },
                { text: 'Personalización avanzada', included: true },
                { text: 'Capacitación dedicada', included: true },
                { text: 'White label', included: true },
            ]
        },
        {
            id: 'enterprise',
            name: 'Enterprise',
            description: 'Solución completa y personalizada para grandes empresas',
            price: billingCycle === 'monthly' ? 999 : 999 * 10,
            billing: billingCycle,
            subscribers: 12,
            color: 'bg-red-800',
            limits: {
                users: 999,
                tables: 999,
                orders: 'Ilimitado',
                storage: 'Ilimitado'
            },
            features: [
                { text: 'Todo en Empresarial', included: true },
                { text: 'White label completo', included: true },
                { text: 'Infraestructura dedicada', included: true },
                { text: 'SLA garantizado', included: true },
                { text: 'Account Manager dedicado', included: true },
                { text: 'Desarrollo a medida', included: true },
                { text: 'Seguridad avanzada', included: true },
                { text: 'Auditorías incluidas', included: true },
                { text: 'Backup diario', included: true },
                { text: 'Soporte 24/7', included: true },
            ]
        }
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Planes de Suscripción</h1>
                    <p className="text-gray-500 mt-1">Gestión de planes y características</p>
                </div>
                <button
                    onClick={() => toast.success('Crear nuevo plan próximamente')}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors font-medium shadow-sm shadow-orange-200"
                >
                    <Plus className="w-5 h-5" />
                    Crear Nuevo Plan
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Planes Activos</p>
                        <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.activePlans}</h3>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                        <Package className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Suscriptores</p>
                        <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.totalSubscribers}</h3>
                    </div>
                    <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                        <Users className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Ingresos Mensuales</p>
                        <h3 className="text-3xl font-bold text-gray-900 mt-2">${stats.monthlyRevenue.toLocaleString()}</h3>
                    </div>
                    <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500">
                        <DollarSign className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Toggle */}
            <div className="flex justify-center mb-8">
                <div className="bg-white p-1 rounded-xl border border-gray-200 shadow-sm flex items-center">
                    <button
                        onClick={() => setBillingCycle('monthly')}
                        className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${billingCycle === 'monthly'
                                ? 'bg-orange-500 text-white shadow-sm'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        Mensual
                    </button>
                    <div className="flex items-center gap-2 px-2">
                        <button
                            onClick={() => setBillingCycle('yearly')}
                            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${billingCycle === 'yearly'
                                    ? 'bg-orange-500 text-white shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            Anual
                        </button>
                        <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                            Ahorra 20%
                        </span>
                    </div>
                </div>
            </div>

            {/* Plan Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {plans.map((plan) => (
                    <div key={plan.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full hover:shadow-lg transition-shadow duration-300">
                        {/* Header Section (Colored) */}
                        <div className={`${plan.color} p-6 text-white text-center relative`}>
                            {/* Toggle Switch Mock */}
                            <div className="absolute top-4 right-4">
                                <div className="w-10 h-6 bg-white/30 rounded-full p-1 cursor-pointer">
                                    <div className="w-4 h-4 bg-white rounded-full translate-x-4"></div>
                                </div>
                            </div>

                            <h3 className="text-2xl font-bold mb-2 text-left">{plan.name}</h3>
                            <p className="text-white/90 text-sm text-left mb-6 h-10 line-clamp-2">{plan.description}</p>

                            <div className="text-left">
                                <span className="text-4xl font-bold">${plan.price}</span>
                                <span className="text-white/80 text-sm">/{billingCycle === 'monthly' ? 'mes' : 'año'}</span>
                            </div>

                            <div className="mt-2 text-left flex items-center gap-2 text-white/90 text-sm">
                                <Users className="w-4 h-4" />
                                <span>{plan.subscribers} suscriptores</span>
                            </div>
                        </div>

                        {/* Content Section */}
                        <div className="p-6 flex-1 flex flex-col">
                            {/* Limits Grid */}
                            <div className="grid grid-cols-2 gap-y-4 gap-x-2 mb-6 pb-6 border-b border-gray-100">
                                <div className="text-left">
                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">LÍMITES</p>
                                </div>
                                <div className="col-span-2 grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-400">Usuarios</p>
                                        <p className="font-semibold text-gray-900">{plan.limits.users}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Mesas</p>
                                        <p className="font-semibold text-gray-900">{plan.limits.tables}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Pedidos</p>
                                        <p className="font-semibold text-gray-900">{plan.limits.orders}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Storage</p>
                                        <p className="font-semibold text-gray-900">{plan.limits.storage}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Features */}
                            <div className="flex-1 mb-8">
                                <p className="text-xs text-gray-500 uppercase font-semibold mb-3">CARACTERÍSTICAS</p>
                                <ul className="space-y-3">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                                            <Check className={`w-4 h-4 mt-0.5 shrink-0 ${feature.included ? 'text-green-500' : 'text-gray-300'}`} />
                                            <span className={feature.included ? 'text-gray-700' : 'text-gray-400'}>{feature.text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Action Buttons */}
                            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
                                <button className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors col-span-1">
                                    <Edit className="w-4 h-4" />
                                    Editar
                                </button>
                                <button className="flex items-center justify-center p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors">
                                    <Copy className="w-4 h-4" />
                                </button>
                                <button className="flex items-center justify-center p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-200 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
