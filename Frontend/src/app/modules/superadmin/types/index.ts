/**
 * Super Admin Module - TypeScript Types
 * Definiciones de tipos para el panel de Super Administrador
 */

// ==================== COMPANY ====================

export interface Company {
    id: number;
    name: string;
    email: string;
    phone?: string;
    address?: string;
    is_active: boolean;
    subscription_status: 'trial' | 'active' | 'suspended' | 'cancelled';
    trial_ends_at?: string;
    suspended_at?: string;
    suspended_by?: number;
    suspended_reason?: string;
    max_users: number;
    max_tables: number;
    max_products: number;
    tax_rate: number;
    currency: string;
    invoice_prefix?: string;
    created_at: string;
    updated_at?: string;

    // Campos adicionales del response
    users_count?: number;
    active_users_count?: number;
}

export interface CreateCompanyDTO {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    max_users?: number;
    max_tables?: number;
    max_products?: number;
    tax_rate?: number;
    currency?: string;
}

export interface UpdateCompanyDTO {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    max_users?: number;
    max_tables?: number;
    max_products?: number;
    tax_rate?: number;
    currency?: string;
    subscription_status?: 'trial' | 'active' | 'suspended' | 'cancelled';
}

export interface SuspendCompanyDTO {
    reason: string;
}

// ==================== STATISTICS ====================

export interface GlobalStats {
    companies: {
        total: number;
        active: number;
        suspended: number;
        trial: number;
    };
    users: {
        total: number;
        active: number;
        inactive: number;
    };
    revenue: {
        total: number;
        currency: string;
    };
    subscription_distribution: Array<{
        status: string;
        count: number;
    }>;
}

export interface CompanyStats {
    company: Company;
    users: {
        total: number;
        active: number;
        limit: number;
        usage_percentage: number;
    };
    products: {
        total: number;
        limit: number;
    };
    tables: {
        total: number;
        limit: number;
    };
    orders: {
        total: number;
    };
    revenue: {
        total: number;
        currency: string;
    };
}

// ==================== USERS ====================

export interface SuperAdminUser {
    id: number;
    email: string;
    nombre: string;
    role: {
        id: number;
        name: string;
        description?: string;
    };
    id_empresa?: number | null;
    turno?: string;
    is_active: boolean;
    created_at: string;
}

export interface CreateUserDTO {
    email: string;
    nombre: string;
    password: string;
    role: string;
    turno?: string;
}

// ==================== AUDIT LOGS ====================

export interface AuditLog {
    id: number;
    action: string;
    entity_type: string;
    entity_id?: number;
    super_admin_id: number;
    affected_company_id?: number;
    details?: Record<string, any>;
    ip_address?: string;
    created_at: string;
}

export interface AuditLogParams {
    company_id?: number;
    action?: string;
    limit?: number;
}

// ==================== API RESPONSES ====================

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

export interface CompanyCreateResponse {
    success: boolean;
    company: Company;
    message: string;
}

export interface CompanyActionResponse {
    success: boolean;
    message: string;
    users_affected?: number;
}

// ==================== SUBSCRIPTIONS ====================

export interface SubscriptionPlan {
    id: string;
    name: string;
    price: number;
    billing_cycle: 'monthly' | 'yearly';
    features: string[];
    limits: {
        users: number;
        tables: number;
        products: number;
    };
    is_active: boolean;
}

export interface Subscription {
    id: number;
    company_id: number;
    plan_id: string;
    status: 'active' | 'past_due' | 'canceled';
    current_period_start: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
}

// ==================== SETTINGS ====================

export interface AppSettings {
    app_name: string;
    support_email: string;
    support_phone: string;
    theme_color: string;
    logo_url?: string;
    maintenance_mode: boolean;
    default_trial_days: number;
}

export interface UpdateSettingsDTO {
    app_name?: string;
    support_email?: string;
    support_phone?: string;
    maintenance_mode?: boolean;
    default_trial_days?: number;
}
