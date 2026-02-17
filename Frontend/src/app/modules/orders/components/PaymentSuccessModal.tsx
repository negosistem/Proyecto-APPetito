import React from 'react';
import { Printer, Download, Eye, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface Payment {
    id: number;
    invoice_number: string;
    total_amount: number;
    change_given?: number | null;
    table_number?: string | null;
}

interface PaymentSuccessModalProps {
    isOpen: boolean;
    payment: Payment | null;
    onClose: () => void;
}

export const PaymentSuccessModal: React.FC<PaymentSuccessModalProps> = ({ isOpen, payment, onClose }) => {
    if (!isOpen || !payment) return null;

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    const handlePrint = async (format: 'thermal' | 'pdf') => {
        try {
            const token = localStorage.getItem('access_token');
            const url = `${API_URL}/api/payments/${payment.id}/receipt?format=${format}`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Error al generar recibo');

            const blob = await response.blob();
            const pdfUrl = URL.createObjectURL(blob);

            const printWindow = window.open(pdfUrl, '_blank');
            if (printWindow) {
                printWindow.onload = () => {
                    printWindow.print();
                };
            } else {
                const a = document.createElement('a');
                a.href = pdfUrl;
                a.target = '_blank';
                a.click();
            }

        } catch (error) {
            console.error('Error:', error);
            alert('Error al visualizar el recibo');
        }
    };

    const handlePreview = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const url = `${API_URL}/api/payments/${payment.id}/receipt?format=html`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Error al generar vista previa');

            const html = await response.text();
            const previewWindow = window.open('', '_blank');
            if (previewWindow) {
                previewWindow.document.write(html);
                previewWindow.document.close();
            }

        } catch (error) {
            console.error('Error:', error);
            alert('Error al mostrar vista previa');
        }
    };

    const handleDownload = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const url = `${API_URL}/api/payments/${payment.id}/receipt?format=pdf`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Error al generar PDF');

            const blob = await response.blob();
            const downloadUrl = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `recibo-${payment.invoice_number}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);

        } catch (error) {
            console.error('Error:', error);
            alert('Error al descargar el recibo');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl overflow-hidden relative"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-full -mr-16 -mt-16 z-0" />

                <div className="relative z-10">
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
                                <span className="text-2xl">✅</span>
                            </div>
                            <h2 className="text-3xl font-black text-slate-800 tracking-tight">¡Éxito!</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl p-6 mb-8 border border-slate-200">
                        <div className="text-center mb-6">
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Número de Factura</p>
                            <p className="text-3xl font-mono font-black text-blue-600">{payment.invoice_number}</p>
                            {payment.table_number && (
                                <div className="mt-3 flex items-center justify-center gap-2 text-green-600 bg-green-50 py-2 px-3 rounded-lg border border-green-100">
                                    <span>🪑</span>
                                    <span className="font-bold text-sm">Mesa {payment.table_number} liberada automáticamente</span>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-6 bg-white rounded-2xl p-5 shadow-sm">
                            <div className="space-y-1">
                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Total Pagado</p>
                                <p className="text-xl font-black text-slate-800">${Number(payment.total_amount).toFixed(2)}</p>
                            </div>
                            {payment.change_given && Number(payment.change_given) > 0 && (
                                <div className="space-y-1 border-l pl-6 border-slate-100">
                                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Cambio Entregado</p>
                                    <p className="text-xl font-black text-green-600">${Number(payment.change_given).toFixed(2)}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={() => handlePrint('thermal')}
                            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-2xl hover:shadow-xl transition-all duration-300 font-bold group"
                        >
                            <Printer size={20} className="group-hover:scale-110 transition-transform" />
                            Imprimir Ticket (80mm)
                        </button>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => handlePrint('pdf')}
                                className="flex items-center justify-center gap-2 bg-slate-800 text-white py-3.5 rounded-2xl hover:bg-slate-900 transition-colors font-bold text-sm"
                            >
                                <Printer size={18} />
                                Imprimir A4
                            </button>

                            <button
                                onClick={handlePreview}
                                className="flex items-center justify-center gap-2 border-2 border-slate-200 text-slate-700 py-3.5 rounded-2xl hover:bg-slate-50 transition-colors font-bold text-sm"
                            >
                                <Eye size={18} />
                                Vista Previa
                            </button>
                        </div>

                        <button
                            onClick={handleDownload}
                            className="w-full flex items-center justify-center gap-2 text-slate-500 py-3 rounded-2xl hover:bg-slate-50 transition-colors font-semibold text-sm border border-transparent hover:border-slate-200"
                        >
                            <Download size={18} />
                            Descargar PDF
                        </button>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full mt-6 py-2 text-slate-400 hover:text-slate-600 transition-colors text-xs font-bold uppercase tracking-widest"
                    >
                        Finalizar y Cerrar
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
