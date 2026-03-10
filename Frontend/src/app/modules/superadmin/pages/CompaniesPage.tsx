/**
 * CompaniesPage - Página de gestión de empresas
 * Lista, crea, edita y gestiona todas las empresas del SaaS
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { superadminService } from '../services/superadminService';
import type { Company } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { CompanyFormModal } from '../components/CompanyFormModal';
import { SuspendCompanyModal } from '../components/SuspendCompanyModal';
import { useSuperAdmin } from '../context/SuperAdminContext';
import {
    Plus,
    Search,
    Edit,
    Ban,
    CheckCircle,
    Building2,
    Filter,
    Download,
    CheckSquare,
    Clock,
    XCircle,
    MoreHorizontal
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function CompaniesPage() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    // Modals state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showSuspendModal, setShowSuspendModal] = useState(false);
    const [showReactivateDialog, setShowReactivateDialog] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

    const navigate = useNavigate();
    const { registerRefreshFn, openCreateRestaurant } = useSuperAdmin();

    useEffect(() => {
        loadCompanies();
    }, []);

    // Registrar loadCompanies en el contexto para que el botón del layout
    // pueda refrescar la lista tras crear un restaurante desde cualquier página.
    useEffect(() => {
        registerRefreshFn(loadCompanies);
    }, []);

    const loadCompanies = async () => {
        try {
            setLoading(true);
            const data = await superadminService.getAllCompanies({ include_inactive: true });
            setCompanies(data);
        } catch (error: any) {
            console.error('Error al cargar empresas:', error);
            toast.error('Error al cargar empresas');
        } finally {
            setLoading(false);
        }
    };

    // Filtrado
    const filteredCompanies = companies.filter((company) => {
        const matchesSearch =
            company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            company.email.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesFilter =
            filterStatus === 'all' || company.subscription_status === filterStatus;

        return matchesSearch && matchesFilter;
    });

    const handleEdit = (company: Company, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedCompany(company);
        setShowCreateModal(true);
    };

    const handleSuspendClick = (company: Company, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedCompany(company);
        setShowSuspendModal(true);
    };

    const handleReactivateClick = (company: Company, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedCompany(company);
        setShowReactivateDialog(true);
    };

    const handleReactivateConfirm = async () => {
        if (!selectedCompany) return;
        try {
            await superadminService.reactivateCompany(selectedCompany.id);
            toast.success('Empresa reactivada exitosamente');
            loadCompanies();
        } catch (error: any) {
            toast.error('Error al reactivar empresa');
        } finally {
            setShowReactivateDialog(false);
            setSelectedCompany(null);
        }
    };

    const handleCreateSuccess = () => {
        loadCompanies();
        setSelectedCompany(null);
    };

    // Calculate stats
    const stats = {
        total: companies.length,
        active: companies.filter(c => c.subscription_status === 'active').length,
        trial: companies.filter(c => c.subscription_status === 'trial').length,
        suspended: companies.filter(c => c.subscription_status === 'suspended' || c.subscription_status === 'cancelled').length
    };

    // Helpers for UI (Mocking some data for the reference look)
    const getPlanName = (company: Company) => {
        if (company.max_tables > 50) return { name: 'Empresarial', color: 'bg-purple-100 text-purple-700 border-purple-200' };
        if (company.max_tables > 20) return { name: 'Profesional', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' };
        return { name: 'Básico', color: 'bg-gray-100 text-gray-700 border-gray-200' };
    };

    const getMRR = (company: Company) => {
        if (company.max_tables > 50) return '599';
        if (company.max_tables > 20) return '299';
        return '99';
    };

    const getNextPayment = (dateStr: string) => {
        const date = new Date(dateStr);
        date.setMonth(date.getMonth() + 1);
        return format(date, 'dd MMM yyyy', { locale: es });
    };

    if (loading) {
        return <LoadingSpinner text="Cargando empresas..." />;
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Restaurantes</h1>
                    <p className="text-gray-500 mt-1">
                        Gestión completa de restaurantes registrados
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={openCreateRestaurant}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm shadow-indigo-200"
                    >
                        <Plus className="w-4 h-4" />
                        Nuevo Restaurante
                    </button>
                    <button
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors font-medium"
                    >
                        <Download className="w-4 h-4" />
                        Exportar
                    </button>
                </div>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Restaurantes</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                        <CheckSquare className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Activos</p>
                        <p className="text-2xl font-bold text-green-600 mt-1">{stats.active}</p>
                    </div>
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
                        <CheckCircle className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">En Prueba</p>
                        <p className="text-2xl font-bold text-amber-500 mt-1">{stats.trial}</p>
                    </div>
                    <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center text-amber-500">
                        <Clock className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Vencidos</p>
                        <p className="text-2xl font-bold text-red-600 mt-1">{stats.suspended}</p>
                    </div>
                    <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center text-red-600">
                        <XCircle className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    {/* Search */}
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, propietario o email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>

                    {/* Filter by status */}
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-700 min-w-[180px]"
                        >
                            <option value="all">Todos los estados</option>
                            <option value="active">Activas</option>
                            <option value="trial">En Prueba</option>
                            <option value="suspended">Suspendidas</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Companies Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {filteredCompanies.length === 0 ? (
                    <div className="py-16 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Building2 className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No se encontraron empresas</h3>
                        <p className="text-gray-500 mt-1">Prueba ajustando los filtros de búsqueda</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Restaurante</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Propietario</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuarios</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Mesas</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">MRR</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pl-8">Próximo Pago</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredCompanies.map((company) => {
                                    const plan = getPlanName(company);
                                    return (
                                        <tr
                                            key={company.id}
                                            className="hover:bg-gray-50/80 transition-colors cursor-pointer group"
                                            onClick={() => navigate(`/superadmin/companies/${company.id}`)}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm ${company.name.charAt(0).toUpperCase() < 'M' ? 'bg-orange-500' : 'bg-indigo-500'
                                                        }`}>
                                                        {company.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900 text-sm">{company.name}</p>
                                                        <p className="text-xs text-gray-500">Desde {format(new Date(company.created_at), 'dd MMM yyyy', { locale: es })}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-gray-900">Propietario</span>
                                                    <span className="text-xs text-gray-500">{company.email}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${plan.color}`}>
                                                    {plan.name}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={company.subscription_status} size="sm" />
                                            </td>
                                            <td className="px-6 py-4 text-center text-sm text-gray-600">
                                                {company.users_count || 0}
                                            </td>
                                            <td className="px-6 py-4 text-center text-sm text-gray-600">
                                                {company.max_tables}
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                                                {getMRR(company)}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 pl-8">
                                                {getNextPayment(company.created_at)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
                                                    <MoreHorizontal className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <CompanyFormModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={handleCreateSuccess}
                companyToEdit={selectedCompany}
            />

            {selectedCompany && (
                <>
                    <SuspendCompanyModal
                        isOpen={showSuspendModal}
                        onClose={() => setShowSuspendModal(false)}
                        onSuccess={loadCompanies}
                        companyId={selectedCompany.id}
                        companyName={selectedCompany.name}
                    />

                    <ConfirmDialog
                        isOpen={showReactivateDialog}
                        title="Reactivar Empresa"
                        message={`¿Deseas reactivar "${selectedCompany.name}"?`}
                        confirmText="Sí, reactivar"
                        onConfirm={handleReactivateConfirm}
                        onCancel={() => setShowReactivateDialog(false)}
                        variant="info"
                    />
                </>
            )}
        </div>
    );
}
