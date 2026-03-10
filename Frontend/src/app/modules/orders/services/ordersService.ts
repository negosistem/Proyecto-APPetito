import { apiClient } from '@/app/shared/services/apiClient';

export interface OrderItem {
    id: number;
    product_id: number;
    quantity: number;
    price: number;
    product_name?: string;
    notes?: string;
}

export interface Order {
    id: number;
    table_id: number;
    user_id: number;
    status: 'Abierto' | 'En Preparación' | 'Entregado' | 'Cerrado' | 'Cancelado' | 'new' | 'accepted' | 'preparing' | 'ready' | 'served' | 'pending' | 'paid';
    subtotal?: number;
    tax?: number;
    tip?: number;
    total: number;
    customer_name?: string | null;
    created_at: string;
    items: OrderItem[];
}

export interface OrderCreate {
    table_id: number;
    customer_name?: string;
}

export interface OrderItemCreate {
    product_id: number;
    quantity: number;
    notes?: string;
}

export const ordersService = {
    /**
     * Create a new order for a table
     */
    async createOrder(data: OrderCreate): Promise<Order> {
        return apiClient.post<Order>('/api/orders/', data);
    },

    /**
     * Get active order for a table
     */
    async getActiveOrder(tableId: number): Promise<Order> {
        return apiClient.get<Order>(`/api/orders/table/${tableId}/active`);
    },

    /**
     * Get full order details (for PaymentModal)
     */
    async getOrderDetails(orderId: number): Promise<Order> {
        return apiClient.get<Order>(`/api/orders/${orderId}/details`);
    },

    /**
     * Add items to an order
     */
    async addItems(orderId: number, items: OrderItemCreate[]): Promise<Order> {
        return apiClient.post<Order>(`/api/orders/${orderId}/items`, items);
    },

    /**
     * Update order status
     */
    async updateStatus(orderId: number, status: string): Promise<Order> {
        return apiClient.patch<Order>(`/api/orders/${orderId}/status`, { status });
    },

    /**
     * Close order
     */
    async closeOrder(orderId: number): Promise<Order> {
        return apiClient.post<Order>(`/api/orders/${orderId}/close`, {});
    }
};
