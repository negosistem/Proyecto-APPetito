import { apiClient } from '@/app/shared/services/apiClient';
import { OrderStatus } from '@/app/modules/orders/services/orderService';

export type PaymentMethod = 'cash' | 'card' | 'transfer';

export interface PaymentCreate {
    order_id: number;
    tip_amount: number;
    payment_method: PaymentMethod;
    amount_received?: number | null;
}

export interface Payment {
    id: number;
    order_id: number;
    total_amount: number;
    tip_amount: number;
    payment_method: PaymentMethod;
    amount_received?: number;
    change_given?: number;
    invoice_number: string;
    tax: number;
    processed_by: number;
    created_at: string;
}

export interface ReceiptItem {
    product_name: string;
    quantity: number;
    price: number;
    total: number;
}

export interface Receipt {
    order_id: number;
    payment_id: number;
    customer_name: string | null;
    table_number: string | null;
    items: ReceiptItem[];
    subtotal: number;
    tip: number;
    total: number;
    payment_method: PaymentMethod;
    amount_received?: number;
    change?: number;
    processed_by_name: string;
    date: string;
}

export const paymentService = {
    async processPayment(payment: PaymentCreate): Promise<Payment> {
        return apiClient.post<Payment>('/api/payments/process', payment);
    },

    async getPaymentByOrder(orderId: number): Promise<Payment> {
        return apiClient.get<Payment>(`/api/payments/${orderId}`);
    },

    async generateReceipt(paymentId: number): Promise<Receipt> {
        return apiClient.post<Receipt>(`/api/payments/${paymentId}/receipt`, {});
    },

    async closeTable(tableId: number): Promise<{ success: boolean }> {
        return apiClient.put<{ success: boolean }>(`/api/tables/${tableId}/close`, {});
    }
};
