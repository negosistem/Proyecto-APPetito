import { apiClient } from '@/app/shared/services/apiClient';

export interface DashboardStats {
    ventas_del_dia: { value: number; change: number; formatted: string };
    pedidos_activos: { value: number; change: number; formatted: string };
    clientes_hoy: { value: number; change: number; formatted: string };
    mesas_ocupadas: { value: string; change: number; formatted: string };
    total_staff?: { value: number };
}

export interface SalesData {
    name: string;
    ventas: number;
}

export interface CategoryData {
    name: string;
    value: number;
    color: string;
}

export interface RecentOrder {
    id: string;
    cliente: string;
    mesa: string;
    total: string;
    estado: string;
}

export interface DashboardData {
    stats: DashboardStats;
    sales_week: SalesData[];
    categories: CategoryData[];
    recent_orders: RecentOrder[];
    user?: {
        id: number;
        nombre: string;
        email: string;
        role: string;
        id_empresa: number;
        empresa?: {
            id: number;
            name: string;
        };
    };
}

export const dashboardService = {
    /**
     * Obtiene todos los datos del dashboard en una sola petición
     */
    getDashboardData() {
        return apiClient.get<DashboardData>('/api/dashboard/');
    },

    getStats() {
        return apiClient.get<DashboardStats>('/api/dashboard/stats');
    },

    getWeeklySales() {
        return apiClient.get<SalesData[]>('/api/dashboard/sales-week');
    },

    getCategories() {
        return apiClient.get<CategoryData[]>('/api/dashboard/categories');
    },

    getRecentOrders() {
        return apiClient.get<RecentOrder[]>('/api/dashboard/recent-orders');
    }
};
