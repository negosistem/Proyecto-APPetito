import { apiClient } from '@/app/shared/services/apiClient';

export interface Customer {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    total_spent: number;
    visits: number;
    last_visit?: string;
    address?: string;
    is_active: boolean;
    created_at: string;
}

export interface CustomerCreate {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
}

export const customerService = {
    /**
     * Obtiene todos los clientes
     */
    async getCustomers(): Promise<Customer[]> {
        return apiClient.get<Customer[]>('/api/customers/');
    },

    /**
     * Crea un nuevo cliente
     */
    async createCustomer(customer: CustomerCreate): Promise<Customer> {
        return apiClient.post<Customer>('/api/customers/', customer);
    },

    /**
     * Actualiza un cliente
     */
    async updateCustomer(id: number, data: Partial<Customer>): Promise<Customer> {
        return apiClient.patch<Customer>(`/api/customers/${id}`, data);
    },

    /**
     * Elimina un cliente
     */
    async deleteCustomer(id: number): Promise<void> {
        return apiClient.delete(`/api/customers/${id}`);
    }
};
