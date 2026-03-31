import { apiClient } from '@/app/shared/services/apiClient';
import { Order } from '../../orders/services/orderService';
import type { KitchenKanbanResponse } from '../types';

export const kitchenService = {
    /**
     * Obtiene todos los pedidos activos para la cocina
     */
    async getActiveOrders(): Promise<Order[]> {
        return apiClient.get<Order[]>('/api/kitchen/active-orders');
    },

    async getKanban(): Promise<KitchenKanbanResponse> {
        return apiClient.get<KitchenKanbanResponse>('/api/kitchen/kanban');
    },

    async updateOrderStatus(id: number, status: string): Promise<Order> {
        return apiClient.patch<Order>(`/api/kitchen/orders/${id}/status`, { status });
    }
};
