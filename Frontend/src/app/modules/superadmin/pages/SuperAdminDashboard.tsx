/**
 * SuperAdminDashboard - Dashboard principal del Super Admin
 * Rediseño con estilo moderno y gráficos
 */

import { useState, useEffect } from 'react';
import { superadminService } from '../services/superadminService';
import type { GlobalStats } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Building2, Users, DollarSign, TrendingUp, AlertCircle, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';

export default function SuperAdminDashboard() {
    const [stats, setStats] = useState<GlobalStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setLoading(true);
            const data = await superadminService.getGlobalStats();
            setStats(data);
        } catch (error: any) {
            console.error('Error al cargar estadísticas:', error);
            toast.error('Error al cargar estadísticas');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <LoadingSpinner text="Cargando estadísticas..." />;
    }

    if (!stats) {
        return <div className="text-center py-12 text-gray-500">No se pudieron cargar las estadísticas</div>;
    }

    // Mock Data for Charts (since backend doesn't provide historical data yet)
    const revenueData = [
        { name: 'Ene', value: 12000 },
        { name: 'Feb', value: 15000 },
        { name: 'Mar', value: 18000 },
        { name: 'Abr', value: 22000 },
        { name: 'May', value: 28000 },
        { name: 'Jun', value: 34200 },
    ];

    const planData = [
        { name: 'Básico', value: 45, color: '#fbbf24' },      // Amber-400
        { name: 'Profesional', value: 85, color: '#f97316' }, // Orange-500
        { name: 'Empresarial', value: 32, color: '#ef4444' }, // Red-500
        { name: 'Enterprise', value: 12, color: '#b91c1c' },  // Red-700
    ];

    const statCards = [
        {
            title: 'Restaurantes Activos',
            value: stats.companies.active,
            icon: Building2,
            iconColor: 'bg-blue-500',
            trend: '+12.5%',
            trendUp: true
        },
        {
            title: 'MRR',
            value: `$${stats.revenue.total.toLocaleString()}`,
            icon: DollarSign,
            iconColor: 'bg-green-500',
            trend: '+18.2%',
            trendUp: true
        },
        {
            title: 'En Prueba',
            value: stats.companies.trial,
            icon: TrendingUp,
            iconColor: 'bg-purple-500', // Changed to purple to distinct from red
            trend: '-3.1%',
            trendUp: false
        },
        {
            title: 'Suscripciones Vencidas',
            value: 8, // Mocked for UI match
            icon: AlertCircle,
            iconColor: 'bg-red-500',
            trend: '-15.3%',
            trendUp: false
        },
        {
            title: 'Crecimiento Mensual',
            value: '24.8%',
            icon: TrendingUp,
            iconColor: 'bg-orange-500',
            trend: '+5.4%',
            trendUp: true
        }
    ];

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard General</h1>
                <p className="text-gray-500">Resumen completo de la plataforma SaaS</p>
            </div>

            {/* Stats Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {statCards.map((card, index) => {
                    const Icon = card.icon;
                    return (
                        <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-xl ${card.iconColor} text-white shadow-lg shadow-opacity-20`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${card.trendUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                    }`}>
                                    {card.trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                    {card.trend}
                                </span>
                            </div>
                            <div>
                                <p className="text-gray-500 text-sm font-medium mb-1">{card.title}</p>
                                <h3 className="text-2xl font-bold text-gray-900">{card.value}</h3>
                                {/* Mini Area Chart Placeholder style */}
                                <div className="h-8 mt-4 w-full opacity-50">
                                    {/* Simulated mini chart using CSS or SVG could go here, for now just empty space or a simple bar */}
                                    <div className={`h-1.5 w-full rounded-full ${card.trendUp ? 'bg-green-100' : 'bg-red-100'} overflow-hidden`}>
                                        <div className={`h-full rounded-full ${card.trendUp ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: '60%' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart (MRR) - Takes up 2 columns */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Ingresos Mensuales (MRR)</h3>
                            <p className="text-sm text-gray-500">Últimos 6 meses</p>
                        </div>
                        <button className="text-gray-400 hover:text-gray-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                        </button>
                    </div>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                                    dx={-10}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    itemStyle={{ color: '#111827', fontWeight: 'bold' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#f97316"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorRevenue)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Donut Chart (Plan Distribution) */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Distribución por Planes</h3>
                    <div className="h-64 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={planData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {planData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Text */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                {/* <p className="text-xs text-gray-500">Total</p> */}
                            </div>
                        </div>
                    </div>
                    {/* Custom Legend */}
                    <div className="mt-4 space-y-3">
                        {planData.map((item) => (
                            <div key={item.name} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                    <span className="text-gray-600">{item.name}</span>
                                </div>
                                <span className="font-bold text-gray-900">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
