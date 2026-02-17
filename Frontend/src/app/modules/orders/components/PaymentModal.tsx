import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Banknote, Smartphone, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { paymentService } from '../../payments/services/paymentService';
import { PaymentSuccessModal } from './PaymentSuccessModal';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: {
        id: number;
        subtotal: number;
        tax: number;
        total: number;
        items: Array<{ product_name?: string; name?: string; quantity: number; price: number; subtotal?: number }>;
    } | null;
    onSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, order, onSuccess }) => {
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
    const [tipPercentage, setTipPercentage] = useState(0);
    const [customTip, setCustomTip] = useState('');
    const [amountReceived, setAmountReceived] = useState('');
    const [loading, setLoading] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [paymentData, setPaymentData] = useState<any>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    if (!isOpen || !order) return null;

    const tipAmount = customTip
        ? parseFloat(customTip)
        : (Number(order.total) * tipPercentage) / 100;

    const totalWithTip = Number(order.total) + tipAmount;
    const change = paymentMethod === 'cash' && amountReceived
        ? parseFloat(amountReceived) - totalWithTip
        : 0;

    const handleSubmit = async () => {
        if (paymentMethod === 'cash' && (!amountReceived || parseFloat(amountReceived) < totalWithTip)) {
            toast.error('Monto insuficiente');
            return;
        }

        setLoading(true);
        try {
            const data = await paymentService.processPayment({
                order_id: order.id,
                tip_amount: tipAmount,
                payment_method: paymentMethod,
                amount_received: paymentMethod === 'cash' ? parseFloat(amountReceived) : null
            });

            setInvoiceNumber(data.invoice_number);
            setPaymentData(data);
            setPaymentSuccess(true);
            setShowSuccessModal(true);
            toast.success(`Pago procesado exitosamente - Factura: ${data.invoice_number}`);

            // We no longer auto-close here, the success modal handles it or the user closes it
            onSuccess();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error procesando pago');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setPaymentSuccess(false);
        setInvoiceNumber('');
        setTipPercentage(0);
        setCustomTip('');
        setAmountReceived('');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
                {/* Header */}
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Procesar Pago</h2>
                    <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X size={24} />
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {paymentSuccess ? (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="p-8 flex flex-col items-center justify-center space-y-4"
                        >
                            <CheckCircle className="w-20 h-20 text-green-500" />
                            <h3 className="text-2xl font-bold text-green-600">¡Pago Exitoso!</h3>
                            <div className="text-center space-y-2">
                                <p className="text-lg font-semibold">Número de Factura</p>
                                <p className="text-3xl font-mono font-bold text-blue-600">{invoiceNumber}</p>
                            </div>
                            {paymentMethod === 'cash' && change > 0 && (
                                <div className="bg-green-50 p-4 rounded-xl">
                                    <p className="text-green-700 font-semibold text-lg">
                                        Cambio: ${change.toFixed(2)}
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="form"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="p-6 space-y-6"
                        >
                            {/* Resumen de la orden */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <h3 className="font-semibold mb-3">Resumen de Orden #{order.id}</h3>
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm py-1">
                                        <span>{item.quantity}x {item.product_name || item.name}</span>
                                        <span>${Number(item.subtotal || (item.quantity * Number(item.price))).toFixed(2)}</span>
                                    </div>
                                ))}
                                <div className="border-t mt-3 pt-3 space-y-1">
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>Subtotal:</span>
                                        <span>${Number(order.subtotal).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>ITBIS (18%):</span>
                                        <span>${Number(order.tax).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-lg">
                                        <span>Total:</span>
                                        <span>${Number(order.total).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Propina */}
                            <div>
                                <label className="block font-semibold mb-3">Propina</label>
                                <div className="grid grid-cols-4 gap-2 mb-3">
                                    {[0, 10, 15, 20].map(percent => (
                                        <button
                                            key={percent}
                                            onClick={() => {
                                                setTipPercentage(percent);
                                                setCustomTip('');
                                            }}
                                            className={`py-2 rounded-lg border-2 transition ${tipPercentage === percent && !customTip
                                                ? 'border-orange-500 bg-orange-50 text-orange-600'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            {percent}%
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="number"
                                    placeholder="Propina personalizada"
                                    value={customTip}
                                    onChange={(e) => {
                                        setCustomTip(e.target.value);
                                        setTipPercentage(0);
                                    }}
                                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-orange-500 outline-none"
                                />
                                {tipAmount > 0 && (
                                    <p className="text-sm text-gray-600 mt-2">
                                        Propina: ${tipAmount.toFixed(2)}
                                    </p>
                                )}
                            </div>

                            {/* Método de pago */}
                            <div>
                                <label className="block font-semibold mb-3">Método de Pago</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { value: 'cash', label: 'Efectivo', icon: Banknote },
                                        { value: 'card', label: 'Tarjeta', icon: CreditCard },
                                        { value: 'transfer', label: 'Transferencia', icon: Smartphone }
                                    ].map(({ value, label, icon: Icon }) => (
                                        <button
                                            key={value}
                                            onClick={() => setPaymentMethod(value as any)}
                                            className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition ${paymentMethod === value
                                                ? 'border-orange-500 bg-orange-50 text-orange-600'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <Icon size={24} />
                                            <span className="text-sm font-medium">{label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Efectivo: monto recibido */}
                            {paymentMethod === 'cash' && (
                                <div>
                                    <label className="block font-semibold mb-2">Monto Recibido</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={amountReceived}
                                        onChange={(e) => setAmountReceived(e.target.value)}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-xl focus:border-orange-500 outline-none"
                                        placeholder="0.00"
                                    />
                                    {change > 0 && (
                                        <div className="mt-3 p-3 bg-green-50 rounded-lg">
                                            <span className="text-green-700 font-semibold">
                                                Cambio: ${change.toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                    {amountReceived && parseFloat(amountReceived) < totalWithTip && (
                                        <div className="mt-3 p-3 bg-red-50 rounded-lg">
                                            <span className="text-red-700 font-semibold text-sm">
                                                Falta: ${(totalWithTip - parseFloat(amountReceived)).toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Total */}
                            <div className="bg-orange-50 rounded-xl p-4 border-2 border-orange-200">
                                <div className="flex justify-between items-center text-xl font-bold">
                                    <span>Total a Pagar:</span>
                                    <span className="text-orange-600">${totalWithTip.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Botón de confirmar */}
                            <button
                                onClick={handleSubmit}
                                disabled={loading || (paymentMethod === 'cash' && !amountReceived)}
                                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                                {loading ? 'Procesando...' : 'Confirmar Pago'}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Modal de éxito con opciones de impresión */}
            <PaymentSuccessModal
                isOpen={showSuccessModal}
                payment={paymentData}
                onClose={() => {
                    setShowSuccessModal(false);
                    handleClose();
                }}
            />
        </div>
    );
}
