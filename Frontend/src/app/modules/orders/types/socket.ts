import type { OrderItemModifierSnapshot } from './modifiers';

export type OrderSocketEventType = 'NEW_ORDER' | 'ORDER_UPDATED';

export interface OrderSocketItemPayload {
    id: number;
    product_name: string;
    quantity: number;
    notes?: string | null;
    modifiers_snapshot?: OrderItemModifierSnapshot[];
}

export interface OrderSocketPayload {
    order_id: number;
    order_number: number;
    status: string;
    previous_status?: string;
    table_id: number | null;
    table_label: string;
    customer_name?: string | null;
    item_count: number;
    created_at?: string | null;
    items?: OrderSocketItemPayload[];
    changed_item_id?: number;
    changed_item_state?: string;
}

export interface NewOrderSocketEvent {
    type: 'NEW_ORDER';
    data: OrderSocketPayload;
}

export interface OrderUpdatedSocketEvent {
    type: 'ORDER_UPDATED';
    data: OrderSocketPayload;
}

export type OrderSocketEvent = NewOrderSocketEvent | OrderUpdatedSocketEvent;
