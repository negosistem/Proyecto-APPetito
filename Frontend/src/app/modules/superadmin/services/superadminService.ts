/**
 * Super Admin API Service
 * Servicio para consumir los 13 endpoints del backend de Super Admin
 */

import { apiClient } from '@/app/shared/services/apiClient';
import type {
    Company,
    CreateCompanyDTO,
    UpdateCompanyDTO,
    SuspendCompanyDTO,
    GlobalStats,
    CompanyStats,
    SuperAdminUser,
    CreateUserDTO,
    AuditLog,
    AuditLogParams,
    CompanyCreateResponse,
    CompanyActionResponse,
} from '../types';

const BASE_URL = '/api/superadmin';

export const superadminService = {
    // ==================== COMPANIES ====================

    /**
     * Obtener todas las empresas del sistema
     * GET /api/superadmin/companies
     */
    async getAllCompanies(params?: {
        include_inactive?: boolean;
        subscription_status?: string;
    }): Promise<Company[]> {
        const queryParams = new URLSearchParams();
        if (params?.include_inactive) queryParams.append('include_inactive', 'true');
        if (params?.subscription_status) queryParams.append('subscription_status', params.subscription_status);

        const url = queryParams.toString()
            ? `${BASE_URL}/companies?${queryParams}`
            : `${BASE_URL}/companies`;

        return apiClient.get<Company[]>(url);
    },

    /**
     * Obtener detalles de una empresa específica
     * GET /api/superadmin/companies/{id}
     */
    async getCompany(id: number): Promise<Company> {
        return apiClient.get<Company>(`${BASE_URL}/companies/${id}`);
    },

    /**
     * Crear nueva empresa
     * POST /api/superadmin/companies
     */
    async createCompany(data: CreateCompanyDTO): Promise<CompanyCreateResponse> {
        return apiClient.post<CompanyCreateResponse>(`${BASE_URL}/companies`, data);
    },

    /**
     * Actualizar empresa existente
     * PUT /api/superadmin/companies/{id}
     */
    async updateCompany(id: number, data: UpdateCompanyDTO): Promise<{
        success: boolean;
        company: Company;
    }> {
        return apiClient.put<{ success: boolean; company: Company }>(
            `${BASE_URL}/companies/${id}`,
            data
        );
    },

    /**
     * Suspender empresa
     * POST /api/superadmin/companies/{id}/suspend
     */
    async suspendCompany(id: number, data: SuspendCompanyDTO): Promise<CompanyActionResponse> {
        return apiClient.post<CompanyActionResponse>(
            `${BASE_URL}/companies/${id}/suspend`,
            data
        );
    },

    /**
     * Reactivar empresa suspendida
     * POST /api/superadmin/companies/{id}/reactivate
     */
    async reactivateCompany(id: number): Promise<CompanyActionResponse> {
        return apiClient.post<CompanyActionResponse>(
            `${BASE_URL}/companies/${id}/reactivate`,
            {}
        );
    },

    // ==================== USERS ====================

    /**
     * Obtener usuarios de una empresa
     * GET /api/superadmin/companies/{id}/users
     */
    async getCompanyUsers(
        companyId: number,
        includeInactive: boolean = false
    ): Promise<SuperAdminUser[]> {
        const url = includeInactive
            ? `${BASE_URL}/companies/${companyId}/users?include_inactive=true`
            : `${BASE_URL}/companies/${companyId}/users`;

        return apiClient.get<SuperAdminUser[]>(url);
    },

    /**
     * Crear usuario para una empresa específica
     * POST /api/superadmin/companies/{id}/users
     */
    async createCompanyUser(
        companyId: number,
        data: CreateUserDTO
    ): Promise<{
        success: boolean;
        user: SuperAdminUser;
        message: string;
    }> {
        return apiClient.post<{
            success: boolean;
            user: SuperAdminUser;
            message: string;
        }>(`${BASE_URL}/companies/${companyId}/users`, data);
    },

    // ==================== STATISTICS ====================

    /**
     * Obtener estadísticas globales del SaaS
     * GET /api/superadmin/stats/global
     */
    async getGlobalStats(): Promise<GlobalStats> {
        return apiClient.get<GlobalStats>(`${BASE_URL}/stats/global`);
    },

    /**
     * Obtener estadísticas de una empresa específica
     * GET /api/superadmin/stats/company/{id}
     */
    async getCompanyStats(id: number): Promise<CompanyStats> {
        return apiClient.get<CompanyStats>(`${BASE_URL}/stats/company/${id}`);
    },

    // ==================== AUDIT LOGS ====================

    /**
     * Obtener logs de auditoría global
     * GET /api/superadmin/audit-logs
     */
    async getAuditLogs(params?: AuditLogParams): Promise<AuditLog[]> {
        const queryParams = new URLSearchParams();
        if (params?.company_id) queryParams.append('company_id', params.company_id.toString());
        if (params?.action) queryParams.append('action', params.action);
        if (params?.limit) queryParams.append('limit', params.limit.toString());

        const url = queryParams.toString()
            ? `${BASE_URL}/audit-logs?${queryParams}`
            : `${BASE_URL}/audit-logs`;

        return apiClient.get<AuditLog[]>(url);
    },

    // ==================== SUBSCRIPTIONS ====================

    async getSubscriptions(): Promise<any[]> {
        return apiClient.get<any[]>(`${BASE_URL}/subscriptions`);
    },

    async changeCompanyPlan(companyId: number, planId: string): Promise<any> {
        return apiClient.put<any>(`${BASE_URL}/companies/${companyId}/change-plan`, { plan_id: planId });
    },

    // ==================== SETTINGS ====================

    async getSettings(): Promise<any> {
        return apiClient.get<any>(`${BASE_URL}/settings`);
    },

    async updateSettings(settings: any): Promise<any> {
        return apiClient.put<any>(`${BASE_URL}/settings`, settings);
    },
};
