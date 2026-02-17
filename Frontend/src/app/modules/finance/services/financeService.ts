import { apiClient } from '@/app/shared/services/apiClient';

export interface SalesSummary {
    total_sales: number;
    total_orders: number;
    average_ticket: number;
    total_tips: number;
    cash_sales: number;
    card_sales: number;
    transfer_sales: number;
}

export interface Expense {
    id: number;
    description: string;
    amount: number;
    category: string;
    expense_date: string;
    created_by: number;
    created_at: string;
}

export interface TopProduct {
    product_name: string;
    quantity_sold: number;
    total_revenue: number;
}

export interface DailySales {
    date: string;
    total: number;
    orders_count: number;
}

export interface FinancialSummary {
    total_income: number;
    total_expenses: number;
    net_profit: number;
    profit_margin: number;
}

export const financeService = {
    // Gastos
    getExpenses: (params: { start_date?: string; end_date?: string; category?: string }) => {
        const query = new URLSearchParams();
        if (params.start_date) query.append('start_date', params.start_date);
        if (params.end_date) query.append('end_date', params.end_date);
        if (params.category) query.append('category', params.category);
        return apiClient.get<Expense[]>(`/api/finances/expenses?${query.toString()}`);
    },

    createExpense: (data: any) => {
        return apiClient.post<Expense>('/api/finances/expenses', data);
    },

    deleteExpense: (id: number) => {
        return apiClient.delete(`/api/finances/expenses/${id}`);
    },

    // Reportes de Ventas
    getSalesSummary: (start_date: string, end_date: string) => {
        const query = new URLSearchParams({ start_date, end_date });
        return apiClient.get<SalesSummary>(`/api/finances/sales/summary?${query.toString()}`);
    },

    getTopProducts: (start_date: string, end_date: string, limit: number = 10) => {
        const query = new URLSearchParams({ start_date, end_date, limit: limit.toString() });
        return apiClient.get<TopProduct[]>(`/api/finances/sales/top-products?${query.toString()}`);
    },

    getDailySales: (start_date: string, end_date: string) => {
        const query = new URLSearchParams({ start_date, end_date });
        return apiClient.get<DailySales[]>(`/api/finances/sales/daily?${query.toString()}`);
    },

    // Resumen Financiero
    getFinancialSummary: (start_date: string, end_date: string) => {
        const query = new URLSearchParams({ start_date, end_date });
        return apiClient.get<FinancialSummary>(`/api/finances/summary?${query.toString()}`);
    }
};
