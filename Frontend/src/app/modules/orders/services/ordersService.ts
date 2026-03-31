import { apiClient } from '@/app/shared/services/apiClient';
import type { OrderItemModifierSnapshot } from '../types/modifiers';

export interface OrderItem {
    id: number;
    product_id: number;
    quantity: number;
    price: number;
    subtotal?: number;
    product_name?: string;
    notes?: string;
    modifiers_snapshot?: OrderItemModifierSnapshot[];
}

export interface OrderPaymentRecord {
    id: number;
    numero_factura: string;
    amount: number;
    subtotal: number;
    tax: number;
    tip_amount: number;
    discount_amount: number;
    total_amount: number;
    payment_method: 'cash' | 'card' | 'transfer';
    change_given?: number | null;
    created_at: string;
    status: string;
}

export interface Order {
    id: number;
    table_id: number | null;
    user_id: number;
    status:
        | 'Abierto'
        | 'En Preparacion'
        | 'Entregado'
        | 'Cerrado'
        | 'Cancelado'
        | 'new'
        | 'accepted'
        | 'preparing'
        | 'ready'
        | 'served'
        | 'pending'
        | 'paid'
        | 'cancelled';
    subtotal?: number;
    tax?: number;
    tip?: number;
    total: number;
    total_amount?: number;
    paid_amount?: number;
    remaining_balance?: number;
    customer_name?: string | null;
    aplica_impuesto?: boolean;
    created_at: string;
    items: OrderItem[];
    payments?: OrderPaymentRecord[];
}

export interface OrderCreate {
    table_id: number;
    customer_name?: string;
    aplica_impuesto?: boolean;
}

export interface OrderItemCreate {
    product_id: number;
    quantity: number;
    notes?: string;
    extras_ids?: number[];
    removed_ingredient_ids?: number[];
}

export const ordersService = {
    async createOrder(data: OrderCreate): Promise<Order> {
        return apiClient.post<Order>('/api/orders/', data);
    },

    async getActiveOrder(tableId: number): Promise<Order> {
        return apiClient.get<Order>(`/api/orders/table/${tableId}/active`);
    },

    async getOrderDetails(orderId: number): Promise<Order> {
        return apiClient.get<Order>(`/api/orders/${orderId}/details`);
    },

    async addItems(orderId: number, items: OrderItemCreate[]): Promise<Order> {
        return apiClient.post<Order>(`/api/orders/${orderId}/items`, items);
    },

    async updateStatus(orderId: number, status: string): Promise<Order> {
        return apiClient.patch<Order>(`/api/orders/${orderId}/status`, { status });
    },

    async closeOrder(orderId: number): Promise<Order> {
        return apiClient.post<Order>(`/api/orders/${orderId}/close`, {});
    },
};
