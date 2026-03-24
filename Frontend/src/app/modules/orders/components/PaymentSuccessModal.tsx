import React, { useEffect, useState } from 'react';
import { Printer, Download, Eye, X, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatNumber } from '@/lib/formatNumber';

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
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    const [isPrintingA4, setIsPrintingA4] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // Keep thermal printing intact
    const handlePrintThermal = async () => {
        if (!payment) return;
        try {
            const token = localStorage.getItem('access_token');
            const url = `${API_URL}/api/payments/${payment.id}/receipt?format=thermal`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error al generar recibo thermal');

            const blob = await response.blob();
            const pdfUrl = URL.createObjectURL(blob);

            const printWindow = window.open(pdfUrl, '_blank');
            if (printWindow) {
                printWindow.onload = () => { printWindow.print(); };
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
        if (!payment) return;
        try {
            const token = localStorage.getItem('access_token');
            const url = `${API_URL}/api/payments/${payment.id}/receipt?format=html`;
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
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

    // NUEVO: Ver e Imprimir A4 abriendo el PDF en una nueva pestaña (evitar popup blocker)
    const handlePrintA4 = async () => {
        if (!payment) return;
        setIsPrintingA4(true);

        // Abrir pestaña sincronamente para evitar el bloqueo de popups del navegador
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write('Generando factura PDF, por favor espere...');
        }

        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_URL}/api/payments/${payment.id}/invoice/pdf`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Error al obtener PDF');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            if (printWindow) {
                printWindow.location.href = url;
            } else {
                // Fallback en caso de que el navegador bloquee incluso la ventana síncrona
                window.open(url, '_blank');
            }
            
        } catch (error) {
            console.error("Error visualizando A4", error);
            if (printWindow) printWindow.close();
            alert('Error al visualizar factura');
        } finally {
            setIsPrintingA4(false);
        }
    };

    // NUEVO: Download PDF using the new invoice endpoint
    const handleDownloadPDF = async () => {
        if (!payment) return;
        setIsDownloading(true);
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_URL}/api/payments/${payment.id}/invoice/pdf`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Error al obtener PDF');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `Factura_${payment.invoice_number}.pdf`;
            document.body.appendChild(a);
            a.click();
            
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Error downloading PDF", error);
            alert('Error al descargar la factura');
        } finally {
            setIsDownloading(false);
        }
    };

    // 🖨️ Auto-print thermal receipt when a new successful payment opens this modal
    useEffect(() => {
        if (isOpen && payment?.id) {
            const timer = setTimeout(async () => {
                try {
                    const token = localStorage.getItem('access_token');
                    const url = `${API_URL}/api/payments/${payment.id}/receipt?format=html`;
                    const response = await fetch(url, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!response.ok) return;
                    const html = await response.text();
                    // Inject print-trigger into the HTML before opening
                    const autoHtml = html.replace('window.focus()', 'window.focus(); window.print();');
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                        printWindow.document.write(autoHtml);
                        printWindow.document.close();
                    }
                } catch (e) {
                    console.error('Auto-print error:', e);
                }
            }, 700);
            return () => clearTimeout(timer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, payment?.id]);

    if (!isOpen || !payment) return null;

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
                                <p className="text-xl font-black text-slate-800 text-right">{formatNumber(payment.total_amount)}</p>
                            </div>
                            {payment.change_given && Number(payment.change_given) > 0 && (
                                <div className="space-y-1 border-l pl-6 border-slate-100">
                                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Cambio Entregado</p>
                                    <p className="text-xl font-black text-green-600 text-right">{formatNumber(payment.change_given)}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={handlePrintThermal}
                            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-2xl hover:shadow-xl transition-all duration-300 font-bold group"
                        >
                            <Printer size={20} className="group-hover:scale-110 transition-transform" />
                            Imprimir Ticket (80mm)
                        </button>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={handlePrintA4}
                                disabled={isPrintingA4}
                                className="flex items-center justify-center gap-2 bg-slate-800 text-white py-3.5 rounded-2xl hover:bg-slate-900 transition-colors font-bold text-sm"
                            >
                                {isPrintingA4 ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />}
                                Ver / Imprimir A4
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
                            onClick={handleDownloadPDF}
                            disabled={isDownloading}
                            className="w-full flex items-center justify-center gap-2 text-slate-500 py-3 rounded-2xl hover:bg-slate-50 transition-colors font-semibold text-sm border border-slate-200 hover:border-slate-300"
                        >
                            {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
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
