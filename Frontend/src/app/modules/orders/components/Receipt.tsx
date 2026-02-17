import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, Download, CheckCircle, Smartphone } from 'lucide-react';
import { Receipt as ReceiptData, ReceiptItem } from '../../payments/services/paymentService';

interface ReceiptProps {
    isOpen: boolean;
    onClose: () => void;
    data: ReceiptData | null;
}

export const Receipt: React.FC<ReceiptProps> = ({ isOpen, onClose, data }) => {
    if (!data) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col"
                    >
                        {/* Success Header */}
                        <div className="bg-green-500 p-6 text-center text-white">
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                <CheckCircle className="w-10 h-10" />
                            </div>
                            <h2 className="text-xl font-black uppercase">¡Pago Exitoso!</h2>
                            <p className="text-white/80 text-sm">La orden #{data.order_id} ha sido completada</p>
                        </div>

                        {/* Receipt Content */}
                        <div className="p-8 flex-1 overflow-auto bg-[url('https://www.transparenttextures.com/patterns/paper.png')] font-mono">
                            <div className="text-center mb-6">
                                <h3 className="font-black text-2xl tracking-tighter italic">APPetito</h3>
                                <p className="text-[10px] text-slate-500 uppercase">Restaurante Gourmet</p>
                                <div className="border-b-2 border-dashed border-slate-200 my-4" />
                            </div>

                            <div className="space-y-1 text-xs mb-4">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Mesa:</span>
                                    <span className="font-bold">{data.table_number || 'Takeaway'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Fecha:</span>
                                    <span>{new Date(data.date).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between font-bold">
                                    <span className="text-slate-500">Atendido por:</span>
                                    <span>{data.processed_by_name}</span>
                                </div>
                            </div>

                            <div className="border-b border-slate-100 my-4" />

                            <div className="space-y-3 mb-6">
                                {data.items.map((item: ReceiptItem, idx: number) => (
                                    <div key={idx} className="text-xs">
                                        <div className="flex justify-between">
                                            <span className="font-bold">{item.product_name} x{item.quantity}</span>
                                            <span>${item.total.toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t-2 border-dashed border-slate-200 pt-4 space-y-2 text-sm">
                                <div className="flex justify-between text-slate-500 text-xs">
                                    <span>Subtotal</span>
                                    <span>${data.subtotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-slate-500 text-xs">
                                    <span>Propina</span>
                                    <span>${data.tip.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between font-black text-lg border-t border-slate-100 pt-2">
                                    <span>TOTAL</span>
                                    <span>${data.total.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="mt-6 space-y-1 text-[10px] text-slate-400">
                                <div className="flex justify-between">
                                    <span>Método:</span>
                                    <span className="uppercase">{data.payment_method}</span>
                                </div>
                                {data.payment_method === 'cash' && (
                                    <>
                                        <div className="flex justify-between">
                                            <span>Recibido:</span>
                                            <span>${data.amount_received?.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-slate-600">
                                            <span>Cambio:</span>
                                            <span>${data.change?.toLocaleString()}</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="mt-8 text-center">
                                <p className="text-[10px] uppercase font-bold text-slate-300">¡Gracias por su visita!</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-4 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-3">
                            <button
                                onClick={handlePrint}
                                className="flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase transition-all hover:bg-slate-100"
                            >
                                <Printer className="w-4 h-4" /> Ticket
                            </button>
                            <button
                                onClick={onClose}
                                className="flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase transition-all hover:bg-slate-800"
                            >
                                Finalizar
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
