/**
 * CompanyDetailsPage - Detalles completos de una empresa
 * Muestra información, estadísticas, usuarios y acciones
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { superadminService } from '../services/superadminService';
import type { Company, CompanyStats, SuperAdminUser } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
    ArrowLeft,
    Building2,
    Users,
    Package,
    LayoutGrid,
    DollarSign,
    Ban,
    CheckCircle,
    Edit,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function CompanyDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [company, setCompany] = useState<Company | null>(null);
    const [stats, setStats] = useState<CompanyStats | null>(null);
    const [users, setUsers] = useState<SuperAdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [showSuspendDialog, setShowSuspendDialog] = useState(false);
    const [showReactivateDialog, setShowReactivateDialog] = useState(false);

    useEffect(() => {
        if (id) {
            loadCompanyData();
        }
    }, [id]);

    const loadCompanyData = async () => {
        if (!id) return;

        try {
            setLoading(true);
            const [companyData, statsData, usersData] = await Promise.all([
                superadminService.getCompany(Number(id)),
                superadminService.getCompanyStats(Number(id)),
                superadminService.getCompanyUsers(Number(id), true),
            ]);

            setCompany(companyData);
            setStats(statsData);
            setUsers(usersData);
        } catch (error: any) {
            console.error('Error al cargar datos:', error);
            toast.error('Error al cargar información de la empresa');
        } finally {
            setLoading(false);
        }
    };

    const handleSuspend = async () => {
        if (!id) return;

        try {
            await superadminService.suspendCompany(Number(id), {
                reason: 'Suspendida desde el panel de Super Admin',
            });
            toast.success('Empresa suspendida exitosamente');
            setShowSuspendDialog(false);
            loadCompanyData();
        } catch (error: any) {
            console.error('Error al suspender:', error);
            toast.error('Error al suspender empresa');
        }
    };

    const handleReactivate = async () => {
        if (!id) return;

        try {
            await superadminService.reactivateCompany(Number(id));
            toast.success('Empresa reactivada exitosamente');
            setShowReactivateDialog(false);
            loadCompanyData();
        } catch (error: any) {
            console.error('Error al reactivar:', error);
            toast.error('Error al reactivar empresa');
        }
    };

    if (loading) {
        return <LoadingSpinner text="Cargando detalles..." />;
    }

    if (!company || !stats) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">No se encontró la empresa</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/superadmin/companies')}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>
                        <p className="text-gray-600 mt-1">{company.email}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <StatusBadge status={company.subscription_status} />
                    <button
                        onClick={() => toast.info('Editar empresa próximamente')}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <Edit className="w-4 h-4" />
                        Editar
                    </button>
                    {company.subscription_status === 'suspended' ? (
                        <button
                            onClick={() => setShowReactivateDialog(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            <CheckCircle className="w-4 h-4" />
                            Reactivar
                        </button>
                    ) : (
                        <button
                            onClick={() => setShowSuspendDialog(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            <Ban className="w-4 h-4" />
                            Suspender
                        </button>
                    )}
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-600">Usuarios</p>
                        <Users className="w-5 h-5 text-indigo-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        {stats.users.total} / {stats.users.limit}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        {stats.users.usage_percentage.toFixed(0)}% utilizado
                    </p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-600">Mesas</p>
                        <LayoutGrid className="w-5 h-5 text-violet-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        {stats.tables.total} / {stats.tables.limit}
                    </p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-600">Productos</p>
                        <Package className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        {stats.products.total} / {stats.products.limit}
                    </p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-600">Ingresos</p>
                        <DollarSign className="w-5 h-5 text-emerald-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        {stats.revenue.total.toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Company Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Información de la Empresa
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-gray-600">Teléfono</p>
                        <p className="font-medium">{company.phone || 'No especificado'}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Dirección</p>
                        <p className="font-medium">{company.address || 'No especificada'}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Moneda</p>
                        <p className="font-medium">{company.currency}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Tasa de Impuesto</p>
                        <p className="font-medium">{company.tax_rate}%</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Fecha de Creación</p>
                        <p className="font-medium">
                            {format(new Date(company.created_at), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                        </p>
                    </div>
                    {company.trial_ends_at && (
                        <div>
                            <p className="text-sm text-gray-600">Trial Finaliza</p>
                            <p className="font-medium">
                                {format(new Date(company.trial_ends_at), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Usuarios ({users.length})
                </h2>
                {users.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No hay usuarios registrados</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Nombre
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Email
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Rol
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Estado
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {users.map((user) => (
                                    <tr key={user.id}>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                            {user.nombre}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{user.role.name}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <span
                                                className={`px-2 py-1 rounded-full text-xs font-medium ${user.is_active
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-gray-100 text-gray-700'
                                                    }`}
                                            >
                                                {user.is_active ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Dialogs */}
            <ConfirmDialog
                isOpen={showSuspendDialog}
                title="Suspender Empresa"
                message={`¿Estás seguro de suspender "${company.name}"? Todos los usuarios perderán acceso inmediatamente.`}
                confirmText="Sí, suspender"
                onConfirm={handleSuspend}
                onCancel={() => setShowSuspendDialog(false)}
                variant="danger"
            />

            <ConfirmDialog
                isOpen={showReactivateDialog}
                title="Reactivar Empresa"
                message={`¿Deseas reactivar "${company.name}"? Los usuarios podrán acceder nuevamente.`}
                confirmText="Sí, reactivar"
                onConfirm={handleReactivate}
                onCancel={() => setShowReactivateDialog(false)}
                variant="info"
            />
        </div>
    );
}
