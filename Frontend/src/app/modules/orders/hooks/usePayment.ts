import { useState } from 'react';
import { toast } from 'sonner';
import { paymentService, PaymentCreate, Receipt } from '../../payments/services/paymentService';

export const usePayment = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [receipt, setReceipt] = useState<Receipt | null>(null);

    const processPayment = async (data: PaymentCreate) => {
        setIsProcessing(true);
        try {
            const payment = await paymentService.processPayment(data);
            toast.success('Pago procesado correctamente');

            // Auto-generate receipt
            const receiptData = await paymentService.generateReceipt(payment.id);
            setReceipt(receiptData);

            return payment;
        } catch (error: any) {
            toast.error(error.message || 'Error al procesar el pago');
            throw error;
        } finally {
            setIsProcessing(false);
        }
    };

    const closeTable = async (tableId: number) => {
        try {
            await paymentService.closeTable(tableId);
            toast.success('Mesa liberada correctamente');
        } catch (error: any) {
            toast.error(error.message || 'Error al liberar la mesa');
        }
    };

    return {
        processPayment,
        closeTable,
        isProcessing,
        receipt,
        setReceipt
    };
};
