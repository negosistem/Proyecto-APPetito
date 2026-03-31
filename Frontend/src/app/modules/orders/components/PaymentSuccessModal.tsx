import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Ban, Download, Loader2, Printer, X } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/app/modules/auth/context/AuthContext';
import type { Payment } from '@/app/modules/payments/services/paymentService';
import { formatNumber } from '@/lib/formatNumber';

interface PaymentSuccessModalProps {
    isOpen: boolean;
    payment: Payment | null;
    onClose: () => void;
}

export const PaymentSuccessModal: React.FC<PaymentSuccessModalProps> = ({
    isOpen,
    payment,
    onClose,
}) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const { user } = useAuth();

    const [isPrintingA4, setIsPrintingA4] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [motivoCancelacion, setMotivoCancelacion] = useState('');
    const [cancelando, setCancelando] = useState(false);

    const canCancelInvoice = ['admin', 'administrador', 'super_admin'].includes(
        (user?.role || '').toLowerCase(),
    );
    const isSettled = (payment?.remaining_balance ?? 0) === 0;

    const getAuthHeaders = () => {
        const token = localStorage.getItem('access_token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const fetchReceipt = async (format: 'pdf' | 'thermal') => {
        if (!payment) {
            throw new Error('Pago no disponible');
        }

        const response = await fetch(
            `${API_URL}/api/payments/${payment.id}/receipt?format=${format}`,
            { headers: getAuthHeaders() },
        );
        if (!response.ok) {
            throw new Error('Error al generar el recibo');
        }
        return response;
    };

    const handlePrintThermal = async () => {
        if (!payment) {
            return;
        }

        try {
            const response = await fetchReceipt('thermal');
            const blob = await response.blob();
            const receiptUrl = window.URL.createObjectURL(blob);
            const printWindow = window.open(receiptUrl, '_blank');

            if (printWindow) {
                printWindow.onload = () => {
                    printWindow.print();
                };
            }
        } catch (error) {
            console.error(error);
            toast.error('Error al visualizar el ticket');
        }
    };

    const handlePrintA4 = async () => {
        if (!payment) {
            return;
        }

        setIsPrintingA4(true);
        try {
            const response = await fetchReceipt('pdf');
            const blob = await response.blob();
            const receiptUrl = window.URL.createObjectURL(blob);
            window.open(receiptUrl, '_blank');
        } catch (error) {
            console.error(error);
            toast.error('Error al visualizar el PDF');
        } finally {
            setIsPrintingA4(false);
        }
    };

    const handleDownloadPDF = async () => {
        if (!payment) {
            return;
        }

        setIsDownloading(true);
        try {
            const response = await fetchReceipt('pdf');
            const blob = await response.blob();
            const receiptUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = receiptUrl;
            link.download = `Recibo_${payment.numero_factura}.pdf`;
            link.click();
            window.URL.revokeObjectURL(receiptUrl);
        } catch (error) {
            console.error(error);
            toast.error('Error al descargar el PDF');
        } finally {
            setIsDownloading(false);
        }
    };

    const closeCancelModal = () => {
        setShowCancelModal(false);
        setMotivoCancelacion('');
    };

    const handleCancelPayment = async () => {
        if (!payment || motivoCancelacion.trim().length < 10) {
            return;
        }

        try {
            setCancelando(true);
            const response = await fetch(`${API_URL}/api/payments/${payment.id}/cancel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders(),
                },
                body: JSON.stringify({ motivo: motivoCancelacion.trim() }),
            });

            if (!response.ok) {
                const errorPayload = await response.json().catch(() => null);
                throw new Error(errorPayload?.detail || 'Error al cancelar la factura');
            }

            toast.success('Pago cancelado correctamente.');
            closeCancelModal();
            onClose();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error al cancelar la factura');
        } finally {
            setCancelando(false);
        }
    };

    useEffect(() => {
        if (!isOpen || !payment) {
            setPdfLoading(false);
            setPdfUrl((currentUrl) => {
                if (currentUrl) {
                    window.URL.revokeObjectURL(currentUrl);
                }
                return null;
            });
            return;
        }

        let isActive = true;
        setPdfLoading(true);
        setPdfUrl((currentUrl) => {
            if (currentUrl) {
                window.URL.revokeObjectURL(currentUrl);
            }
            return null;
        });

        const loadPdf = async () => {
            try {
                const response = await fetch(
                    `${API_URL}/api/payments/${payment.id}/receipt?format=pdf`,
                    { headers: getAuthHeaders() },
                );
                if (!response.ok) {
                    throw new Error('No se pudo obtener el PDF');
                }

                const blob = await response.blob();
                const nextUrl = window.URL.createObjectURL(blob);
                if (!isActive) {
                    window.URL.revokeObjectURL(nextUrl);
                    return;
                }

                setPdfUrl(nextUrl);
            } catch (error) {
                console.error(error);
            } finally {
                if (isActive) {
                    setPdfLoading(false);
                }
            }
        };

        void loadPdf();

        return () => {
            isActive = false;
        };
    }, [API_URL, isOpen, payment]);

    useEffect(() => {
        return () => {
            if (pdfUrl) {
                window.URL.revokeObjectURL(pdfUrl);
            }
        };
    }, [pdfUrl]);

    if (!isOpen || !payment) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="bg-white rounded-3xl max-w-4xl w-full p-8 shadow-2xl overflow-hidden relative flex flex-col md:flex-row gap-8 max-h-[90vh]"
            >
                <div className="relative z-10 w-full md:w-1/2 flex flex-col h-full overflow-y-auto pr-2">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                                {isSettled ? 'Cuenta saldada' : 'Pago parcial registrado'}
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">{payment.numero_factura}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div className="bg-slate-50 rounded-3xl p-6 mb-8 border border-slate-200 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-white rounded-2xl p-4 shadow-sm">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Abono actual</p>
                                <p className="text-xl font-black text-slate-900">{formatNumber(payment.amount)}</p>
                            </div>
                            <div className="bg-white rounded-2xl p-4 shadow-sm">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pagado acumulado</p>
                                <p className="text-xl font-black text-emerald-700">{formatNumber(payment.paid_amount)}</p>
                            </div>
                            <div className="bg-white rounded-2xl p-4 shadow-sm">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pendiente</p>
                                <p className="text-xl font-black text-orange-600">{formatNumber(payment.remaining_balance)}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-white rounded-2xl p-5 shadow-sm">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total orden</p>
                                <p className="text-xl font-black text-slate-800">{formatNumber(payment.order_total_amount)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Metodo</p>
                                <p className="text-xl font-black text-slate-800 uppercase">{payment.payment_method}</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 mt-auto">
                        <button
                            onClick={handlePrintThermal}
                            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-2xl hover:shadow-xl transition-all duration-300 font-bold"
                        >
                            <Printer size={20} />
                            Imprimir Ticket
                        </button>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={handlePrintA4}
                                disabled={isPrintingA4}
                                className="flex items-center justify-center gap-2 bg-slate-800 text-white py-3.5 rounded-2xl hover:bg-slate-900 transition-colors font-bold text-sm"
                            >
                                {isPrintingA4 ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />}
                                Vista PDF
                            </button>

                            <button
                                onClick={handleDownloadPDF}
                                disabled={isDownloading}
                                className="flex items-center justify-center gap-2 border border-slate-200 text-slate-700 py-3.5 rounded-2xl hover:bg-slate-50 transition-colors font-bold text-sm"
                            >
                                {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                                Descargar
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100">
                        {canCancelInvoice && (
                            <button
                                onClick={() => setShowCancelModal(true)}
                                className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            >
                                <Ban size={14} />
                                Cancelar pago
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="flex-1 text-right py-2 text-slate-400 hover:text-slate-600 transition-colors text-xs font-bold uppercase tracking-widest"
                        >
                            {isSettled ? 'Finalizar y Cerrar' : 'Seguir cobrando'}
                        </button>
                    </div>
                </div>

                <div className="w-full md:w-1/2 flex flex-col bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden relative min-h-[400px]">
                    <div className="bg-slate-800 text-white py-2 px-4 flex justify-between items-center">
                        <span className="text-sm font-semibold">Vista previa del recibo</span>
                    </div>

                    {pdfLoading && !pdfUrl ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm z-10 text-slate-500">
                            <Loader2 size={32} className="animate-spin mb-3 text-orange-500" />
                            <p className="font-medium">Generando PDF...</p>
                        </div>
                    ) : null}

                    {pdfUrl ? (
                        <iframe
                            src={`${pdfUrl}#toolbar=1&navpanes=0&zoom=75`}
                            className="w-full h-full flex-1 border-0"
                            title="Recibo PDF"
                        />
                    ) : (
                        !pdfLoading && (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                                <p>No se pudo visualizar el PDF.</p>
                            </div>
                        )
                    )}
                </div>
            </motion.div>

            {showCancelModal && (
                <div className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
                        <h3 className="font-medium text-sm mb-4">Cancelar pago</h3>
                        <textarea
                            value={motivoCancelacion}
                            onChange={(event) => setMotivoCancelacion(event.target.value)}
                            placeholder="Motivo de cancelacion"
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none h-20 focus:outline-none focus:ring-2 focus:ring-red-500"
                            minLength={10}
                        />
                        <div className="flex gap-2 justify-end mt-4">
                            <button
                                onClick={closeCancelModal}
                                className="text-sm px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                                Volver
                            </button>
                            <button
                                disabled={motivoCancelacion.length < 10 || cancelando}
                                onClick={handleCancelPayment}
                                className="text-sm px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {cancelando ? 'Procesando...' : 'Confirmar cancelacion'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
