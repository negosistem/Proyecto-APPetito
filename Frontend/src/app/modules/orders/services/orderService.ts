import { apiClient } from '@/app/shared/services/apiClient';

export interface OrderItem {
    id: number;
    product_id: number;
    quantity: number;
    price: number;
    notes?: string;
    product_name?: string; // Optional for UI display
}

export type OrderStatus = 'new' | 'pending' | 'accepted' | 'preparing' | 'ready' | 'served' | 'paid' | 'cancelled';

export interface Order {
    id: number;
    table_id: number | null;
    user_id: number;
    status: OrderStatus;
    subtotal: number;
    tax: number;
    tip: number;
    discount: number;
    total: number;
    customer_name: string | null;
    created_at: string;
    items: OrderItem[];
}

export interface OrderPaginatedResponse {
    items: Order[];
    total: number;
    page: number;
    pages: number;
    limit: number;
}

export interface OrderCreate {
    table_id: number | null;
    customer_id?: number | null;
    customer_name: string | null;
    apply_tip?: boolean;
    items: {
        product_id: number;
        quantity: number;
        notes?: string;
    }[];
}

export const orderService = {
    /**
     * Obtiene todos los pedidos paginados
     */
    async getOrders(page: number = 1, limit: number = 15): Promise<OrderPaginatedResponse> {
        return apiClient.get<OrderPaginatedResponse>(`/api/orders?page=${page}&limit=${limit}`);
    },

    /**
     * Obtiene un pedido por ID
     */
    async getOrder(id: number): Promise<Order> {
        return apiClient.get<Order>(`/api/orders/${id}`);
    },

    /**
     * Crea un nuevo pedido
     */
    async createOrder(order: OrderCreate): Promise<Order> {
        return apiClient.post<Order>('/api/orders/', order);
    },

    /**
     * Actualiza el estado o detalles de un pedido
     */
    async updateOrder(id: number, data: Partial<Order>): Promise<Order> {
        // Currently backend only supports specialized status update
        if (data.status) {
            return apiClient.patch<Order>(`/api/orders/${id}/status`, { status: data.status });
        }
        // Fallback for other fields if backend supported them later, 
        // or effectively a no-op/error if backend doesn't exist for generic patch.
        // For now, let's try generic patch in case we add it, but it will 404 currently.
        return apiClient.patch<Order>(`/api/orders/${id}`, data);
    }
};
