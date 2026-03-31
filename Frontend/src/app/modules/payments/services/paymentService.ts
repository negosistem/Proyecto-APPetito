import { apiClient } from '@/app/shared/services/apiClient';

export type PaymentMethod = 'cash' | 'card' | 'transfer';

export interface PaymentCreate {
    amount: number;
    payment_method: PaymentMethod;
    amount_received?: number | null;
}

export interface Payment {
    id: number;
    order_id: number;
    amount: number;
    subtotal: number;
    discount_amount: number;
    total_amount: number;
    tip_amount: number;
    payment_method: PaymentMethod;
    amount_received?: number | null;
    change_given?: number | null;
    numero_factura: string;
    tax: number;
    processed_by: number;
    created_at: string;
    table_number?: string | null;
    status: string;
    paid_amount?: number | null;
    remaining_balance?: number | null;
    order_total_amount?: number | null;
    order_status?: string | null;
    can_close_order?: boolean | null;
}

export interface ReceiptItem {
    product_name: string;
    quantity: number;
    price: number;
    total: number;
}

export interface ReceiptPaymentLine {
    numero_factura: string;
    payment_method: PaymentMethod;
    amount: number;
    amount_received?: number | null;
    change_given?: number | null;
    created_at: string;
}

export interface Receipt {
    order_id: number;
    payment_id: number;
    numero_factura: string;
    customer_name?: string | null;
    table_number?: string | null;
    items: ReceiptItem[];
    payments: ReceiptPaymentLine[];
    subtotal: number;
    tax: number;
    discount: number;
    tip: number;
    total: number;
    paid_amount: number;
    remaining_balance: number;
    payment_method: PaymentMethod;
    amount_received?: number | null;
    change?: number | null;
    processed_by_name: string;
    date: string;
}

export const paymentService = {
    async processPayment(orderId: number, payment: PaymentCreate): Promise<Payment> {
        return apiClient.post<Payment>(`/api/orders/${orderId}/payments`, payment);
    },

    async getPaymentByOrder(orderId: number): Promise<Payment> {
        return apiClient.get<Payment>(`/api/payments/order/${orderId}`);
    },

    async closeTable(tableId: number): Promise<{ success: boolean }> {
        return apiClient.put<{ success: boolean }>(`/api/tables/${tableId}/close`, {});
    }
};
