import type { OrderItemModifierSnapshot } from '@/app/modules/orders/types/modifiers';

export interface KitchenOrderItem {
    id: number;
    product_name: string;
    quantity: number;
    notes?: string | null;
    modifiers_snapshot?: OrderItemModifierSnapshot[];
    prep_time_minutes: number;
    state: 'pending' | 'preparing' | 'ready';
    started_at?: string | null;
    completed_at?: string | null;
    item_elapsed_minutes: number;
}

export interface KitchenOrderProgress {
    percentage: number;
    completed: number;
    total: number;
}

export interface KitchenOrder {
    id: number;
    order_number: number;
    table: string;
    customer_name?: string | null;
    status: 'new' | 'accepted' | 'preparing' | 'ready';
    arrived_at?: string | null;
    accepted_at?: string | null;
    started_at?: string | null;
    completed_at?: string | null;
    elapsed_minutes: number;
    items: KitchenOrderItem[];
    progress: KitchenOrderProgress;
    kitchen_notes?: string | null;
}

export type KitchenKanbanResponse = Record<
    'new' | 'accepted' | 'preparing' | 'ready',
    KitchenOrder[]
>;
