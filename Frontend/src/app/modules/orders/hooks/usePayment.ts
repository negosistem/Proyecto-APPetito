import { useState } from 'react';
import { toast } from 'sonner';
import { paymentService, type PaymentCreate } from '../../payments/services/paymentService';

export const usePayment = () => {
    const [isProcessing, setIsProcessing] = useState(false);

    const processPayment = async (orderId: number, data: PaymentCreate) => {
        setIsProcessing(true);
        try {
            const payment = await paymentService.processPayment(orderId, data);
            toast.success('Pago procesado correctamente');

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
    };
};
