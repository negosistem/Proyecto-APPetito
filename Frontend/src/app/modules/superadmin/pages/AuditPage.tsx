/**
 * AuditPage - Logs de auditoría global
 * Muestra todas las acciones realizadas por Super Admins
 */

import { useState, useEffect } from 'react';
import { superadminService } from '../services/superadminService';
import type { AuditLog, Company } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { FileText, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AuditPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterCompanyId, setFilterCompanyId] = useState<string>('all');

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (companies.length > 0) {
            loadLogs();
        }
    }, [filterCompanyId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [logsData, companiesData] = await Promise.all([
                superadminService.getAuditLogs({ limit: 100 }),
                superadminService.getAllCompanies({ include_inactive: true }),
            ]);
            setLogs(logsData);
            setCompanies(companiesData);
        } catch (error: any) {
            console.error('Error al cargar datos:', error);
            toast.error('Error al cargar logs de auditoría');
        } finally {
            setLoading(false);
        }
    };

    const loadLogs = async () => {
        try {
            const params: any = { limit: 100 };
            if (filterCompanyId !== 'all') {
                params.company_id = Number(filterCompanyId);
            }
            const data = await superadminService.getAuditLogs(params);
            setLogs(data);
        } catch (error: any) {
            console.error('Error al cargar logs:', error);
            toast.error('Error al cargar logs filtrados');
        }
    };

    const getCompanyName = (companyId?: number) => {
        if (!companyId) return 'N/A';
        const company = companies.find((c) => c.id === companyId);
        return company?.name || `Empresa #${companyId}`;
    };

    const getActionColor = (action: string) => {
        if (action.includes('create')) return 'bg-green-100 text-green-800';
        if (action.includes('suspend')) return 'bg-red-100 text-red-800';
        if (action.includes('reactivate')) return 'bg-blue-100 text-blue-800';
        if (action.includes('update')) return 'bg-amber-100 text-amber-800';
        return 'bg-gray-100 text-gray-800';
    };

    if (loading) {
        return <LoadingSpinner text="Cargando auditoría..." />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Auditoría Global</h1>
                <p className="text-gray-600 mt-2">
                    Registro completo de acciones del Super Admin ({logs.length} registros)
                </p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-4">
                    <Filter className="w-5 h-5 text-gray-400" />
                    <select
                        value={filterCompanyId}
                        onChange={(e) => setFilterCompanyId(e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    >
                        <option value="all">Todas las empresas</option>
                        {companies.map((company) => (
                            <option key={company.id} value={company.id}>
                                {company.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {logs.length === 0 ? (
                    <div className="py-12 text-center">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No hay registros de auditoría</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Fecha/Hora
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Acción
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Tipo
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Empresa Afectada
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        IP
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Detalles
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: es })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionColor(
                                                    log.action
                                                )}`}
                                            >
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                                            {log.entity_type}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {getCompanyName(log.affected_company_id)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                                            {log.ip_address || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                                            {log.details ? JSON.stringify(log.details) : 'Sin detalles'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
