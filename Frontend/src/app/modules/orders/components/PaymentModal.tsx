import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Banknote, CreditCard, Printer, Smartphone, X } from 'lucide-react';
import { toast } from 'sonner';

import { formatNumber } from '@/lib/formatNumber';
import { type Payment, paymentService, type PaymentMethod } from '../../payments/services/paymentService';
import { ordersService, type OrderPaymentRecord } from '../services/ordersService';
import { PaymentSuccessModal } from './PaymentSuccessModal';

interface PaymentModalOrder {
    id: number;
    subtotal: number;
    tax: number;
    tip?: number;
    discount?: number;
    total: number;
    total_amount?: number;
    paid_amount?: number;
    remaining_balance?: number;
    customer_name?: string | null;
    items: Array<{
        product_name?: string;
        name?: string;
        quantity: number;
        price: number;
        subtotal?: number;
    }>;
    payments?: OrderPaymentRecord[];
}

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: PaymentModalOrder | null;
    onPaymentRecorded: () => void;
    onOrderSettled?: () => void;
    tableNumber?: number | string | null;
}

interface PaymentFormValues {
    payment_method: PaymentMethod;
    amount: string;
    amount_received: string;
}

function toNumber(value: unknown): number {
    return Number(value ?? 0);
}

function normalizeOrder(order: PaymentModalOrder): PaymentModalOrder {
    const totalAmount = toNumber(order.total_amount ?? order.total);
    const paidAmount = toNumber(order.paid_amount);
    const remainingBalance = Math.max(
        toNumber(order.remaining_balance ?? totalAmount - paidAmount),
        0,
    );

    return {
        ...order,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        remaining_balance: remainingBalance,
        subtotal: toNumber(order.subtotal),
        tax: toNumber(order.tax),
        tip: toNumber(order.tip),
        discount: toNumber(order.discount),
        total: toNumber(order.total),
        payments: order.payments ?? [],
    };
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
    isOpen,
    onClose,
    order,
    onPaymentRecorded,
    onOrderSettled,
    tableNumber,
}) => {
    const [currentOrder, setCurrentOrder] = useState<PaymentModalOrder | null>(null);
    const [loading, setLoading] = useState(false);
    const [paymentData, setPaymentData] = useState<Payment | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showPrintConfirm, setShowPrintConfirm] = useState(false);
    const [showProcessConfirm, setShowProcessConfirm] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<PaymentFormValues>({
        defaultValues: {
            payment_method: 'cash',
            amount: '',
            amount_received: '',
        },
    });

    const paymentMethod = watch('payment_method');
    const amountValue = watch('amount');
    const amountReceivedValue = watch('amount_received');

    useEffect(() => {
        if (!order?.id) {
            setCurrentOrder(null);
            reset({
                payment_method: 'cash',
                amount: '',
                amount_received: '',
            });
            return;
        }

        const normalized = normalizeOrder(order);
        setCurrentOrder(normalized);
        reset({
            payment_method: 'cash',
            amount: normalized.remaining_balance ? normalized.remaining_balance.toFixed(2) : '',
            amount_received: '',
        });
    }, [order, reset]);

    useEffect(() => {
        if (!isOpen) {
            setShowSuccessModal(false);
            setShowPrintConfirm(false);
            setShowProcessConfirm(false);
        }
    }, [isOpen]);

    const totalToPay = useMemo(() => toNumber(currentOrder?.total_amount ?? currentOrder?.total), [currentOrder]);
    const paidSoFar = useMemo(() => toNumber(currentOrder?.paid_amount), [currentOrder]);
    const remainingBalance = useMemo(
        () => Math.max(toNumber(currentOrder?.remaining_balance), 0),
        [currentOrder],
    );
    const enteredAmount = amountValue ? parseFloat(amountValue) : 0;
    const enteredAmountReceived = amountReceivedValue ? parseFloat(amountReceivedValue) : 0;
    const projectedRemaining = Math.max(remainingBalance - enteredAmount, 0);
    const change =
        paymentMethod === 'cash' && amountReceivedValue
            ? enteredAmountReceived - enteredAmount
            : 0;

    const reloadOrderDetails = async () => {
        if (!currentOrder) {
            return;
        }

        const details = await ordersService.getOrderDetails(currentOrder.id);
        const normalized = normalizeOrder({
            ...details,
            subtotal: Number(details.subtotal ?? details.total),
            tax: Number(details.tax ?? 0),
            tip: Number(details.tip ?? 0),
            discount: Number(details.discount ?? 0),
            total: Number(details.total),
        });
        setCurrentOrder(normalized);
        setValue('amount', normalized.remaining_balance ? normalized.remaining_balance.toFixed(2) : '');
        setValue('amount_received', '');
    };

    const handleClose = () => {
        setShowPrintConfirm(false);
        setShowProcessConfirm(false);
        setShowSuccessModal(false);
        onClose();
    };

    const submitPayment = async () => {
        if (!currentOrder) {
            return;
        }

        const amount = Number.parseFloat(amountValue || '0');
        if (!Number.isFinite(amount) || amount <= 0) {
            toast.error('Ingresa un monto valido mayor que 0.');
            return;
        }

        if (amount > remainingBalance) {
            toast.error(`No puedes cobrar mas de ${formatNumber(remainingBalance)}.`);
            return;
        }

        if (paymentMethod === 'cash') {
            if (!Number.isFinite(enteredAmountReceived) || enteredAmountReceived < amount) {
                toast.error(`En efectivo debes recibir al menos ${formatNumber(amount)}.`);
                return;
            }
        }

        setLoading(true);
        try {
            const data = await paymentService.processPayment(currentOrder.id, {
                amount,
                payment_method: paymentMethod,
                amount_received: paymentMethod === 'cash' ? enteredAmountReceived : null,
            });

            setPaymentData(data);
            setShowSuccessModal(true);
            await reloadOrderDetails();
            onPaymentRecorded();

            toast.success(
                (data.remaining_balance ?? 0) > 0
                    ? `Pago parcial registrado. Pendiente: ${formatNumber(data.remaining_balance)}`
                    : `Cuenta saldada - Factura ${data.numero_factura}`,
            );
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error procesando pago');
        } finally {
            setLoading(false);
        }
    };

    const handleSuccessClose = () => {
        const isSettled = (paymentData?.remaining_balance ?? 0) === 0;
        setShowSuccessModal(false);
        if (isSettled) {
            onOrderSettled?.();
            handleClose();
        }
    };

    const handlePrintPreInvoice = () => {
        if (!currentOrder) {
            return;
        }

        const now = new Date();
        const dateStr = now.toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = now.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });

        const padRight = (str: string, len: number) =>
            str.length >= len ? str.substring(0, len) : `${str}${' '.repeat(len - str.length)}`;
        const padLeft = (str: string, len: number) =>
            str.length >= len ? str.substring(0, len) : `${' '.repeat(len - str.length)}${str}`;

        const itemRows = (currentOrder.items || [])
            .map((item) => {
                const name = (item.product_name || item.name || 'Producto').substring(0, 14);
                const qty = padLeft(String(item.quantity), 2);
                const price = padLeft(formatNumber(item.price), 8);
                const subtotal = padLeft(
                    formatNumber(item.subtotal || Number(item.price) * item.quantity),
                    9,
                );
                return `${padRight(name, 14)} ${qty} x ${price} ${subtotal}`;
            })
            .join('\\n');

        const paymentsRows = (currentOrder.payments || [])
            .map(
                (payment) =>
                    `${padRight(payment.payment_method.toUpperCase(), 10)} ${padRight(payment.numero_factura, 18)} ${padLeft(formatNumber(payment.amount), 9)}`,
            )
            .join('\\n');

        const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Pre-Factura Pedido #${currentOrder.id}</title>
  <style>
    @media print { @page { margin: 0; } body { margin: 0; padding: 0; } }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 13px;
      line-height: 1.2;
      color: #000;
      width: 300px;
      margin: 0 auto;
      padding: 15px;
      background: #fff;
    }
    .center { text-align: center; }
    .text-divider { white-space: pre; text-align: center; margin: 4px 0; }
    pre { margin: 0; font-family: inherit; font-size: inherit; white-space: pre-wrap; }
  </style>
</head>
<body>
  <div class="center">
    <h2>APPetito</h2>
    <div>PRE-FACTURA</div>
    <div>${dateStr} - ${timeStr}</div>
  </div>
  <div class="text-divider">--------------------------------</div>
  <div>Pedido #: <strong>${currentOrder.id}</strong></div>
  <div>${tableNumber ? `Mesa: ${tableNumber}` : 'Para llevar'}</div>
  <div>Cliente: ${currentOrder.customer_name || 'Consumidor Final'}</div>
  <div class="text-divider">--------------------------------</div>
  <pre><strong>CANT DESCRIPCION        TOTAL</strong></pre>
  <pre>${itemRows || 'Sin productos'}</pre>
  <div class="text-divider">--------------------------------</div>
  <pre>Total orden:           ${formatNumber(totalToPay)}
Pagado:                ${formatNumber(paidSoFar)}
Pendiente:             ${formatNumber(remainingBalance)}</pre>
  <div class="text-divider">--------------------------------</div>
  <pre><strong>METODO FACTURA             MONTO</strong></pre>
  <pre>${paymentsRows || 'Sin pagos registrados'}</pre>
</body>
</html>`;

        const win = window.open('', '_blank', 'width=420,height=620');
        if (!win) {
            alert('Habilita ventanas emergentes para imprimir.');
            return;
        }

        win.document.write(html);
        win.document.close();
        setTimeout(() => {
            win.focus();
            win.print();
            win.close();
        }, 250);
    };

    if (!isOpen || !currentOrder) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
            <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            >
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold">Pago Parcial</h2>
                        <p className="text-sm text-slate-500">Orden #{currentOrder.id}</p>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-bold uppercase text-slate-500">Total</p>
                            <p className="text-2xl font-black text-slate-900">{formatNumber(totalToPay)}</p>
                        </div>
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                            <p className="text-xs font-bold uppercase text-emerald-700">Pagado hasta ahora</p>
                            <p className="text-2xl font-black text-emerald-700">{formatNumber(paidSoFar)}</p>
                        </div>
                        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                            <p className="text-xs font-bold uppercase text-orange-700">Pendiente</p>
                            <p className="text-2xl font-black text-orange-700">{formatNumber(remainingBalance)}</p>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4">
                        <h3 className="font-semibold mb-3">Resumen de Orden</h3>
                        {currentOrder.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm py-1">
                                <span>{item.quantity}x {item.product_name || item.name}</span>
                                <span className="text-right">
                                    {formatNumber(item.subtotal || item.quantity * Number(item.price))}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <h3 className="font-semibold mb-3">Pagos Registrados</h3>
                        {currentOrder.payments && currentOrder.payments.length > 0 ? (
                            <div className="space-y-2">
                                {currentOrder.payments.map((payment) => (
                                    <div
                                        key={payment.id}
                                        className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                                    >
                                        <div>
                                            <p className="font-semibold text-slate-800">{payment.numero_factura}</p>
                                            <p className="text-xs text-slate-500">
                                                {payment.payment_method.toUpperCase()} · {new Date(payment.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                        <p className="font-bold text-slate-900">{formatNumber(payment.amount)}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500">Todavia no hay pagos registrados para esta orden.</p>
                        )}
                    </div>

                    <form className="space-y-4" onSubmit={handleSubmit(() => setShowProcessConfirm(true))}>
                        <div>
                            <label className="block font-semibold mb-3">Metodo de Pago</label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { value: 'cash', label: 'Efectivo', icon: Banknote },
                                    { value: 'card', label: 'Tarjeta', icon: CreditCard },
                                    { value: 'transfer', label: 'Transferencia', icon: Smartphone },
                                ].map(({ value, label, icon: Icon }) => (
                                    <label
                                        key={value}
                                        className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition cursor-pointer ${
                                            paymentMethod === value
                                                ? 'border-orange-500 bg-orange-50 text-orange-600'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            value={value}
                                            className="sr-only"
                                            {...register('payment_method')}
                                        />
                                        <Icon size={24} />
                                        <span className="text-sm font-medium">{label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block font-semibold mb-2">Monto a Cobrar</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                max={remainingBalance}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-xl focus:border-orange-500 outline-none"
                                placeholder="0.00"
                                {...register('amount', { required: 'Ingresa un monto.' })}
                            />
                            {errors.amount && (
                                <p className="mt-2 text-sm text-red-600">{errors.amount.message}</p>
                            )}
                            <p className="mt-2 text-xs text-slate-500">
                                Maximo permitido: {formatNumber(remainingBalance)}
                            </p>
                        </div>

                        {paymentMethod === 'cash' && (
                            <div>
                                <label className="block font-semibold mb-2">Monto Recibido</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-xl focus:border-orange-500 outline-none"
                                    placeholder="0.00"
                                    {...register('amount_received')}
                                />
                                {amountReceivedValue && (
                                    <div className="mt-3 p-3 rounded-lg bg-slate-50 text-sm">
                                        <div className="flex justify-between">
                                            <span>Pendiente despues de este pago</span>
                                            <span>{formatNumber(projectedRemaining)}</span>
                                        </div>
                                        <div className="flex justify-between mt-1">
                                            <span>Cambio</span>
                                            <span>{formatNumber(change > 0 ? change : 0)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="bg-orange-50 rounded-xl p-4 border-2 border-orange-200">
                            <div className="flex justify-between items-center text-lg font-bold">
                                <span>Saldo tras este abono</span>
                                <span className="text-orange-600">{formatNumber(projectedRemaining)}</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                type="button"
                                onClick={() => setShowPrintConfirm(true)}
                                className="w-full py-4 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition text-center"
                            >
                                Imprimir Pre-Factura
                            </button>
                            <button
                                type="submit"
                                disabled={loading || remainingBalance === 0}
                                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                                {remainingBalance === 0
                                    ? 'Cuenta saldada'
                                    : loading
                                      ? 'Procesando...'
                                      : 'Registrar pago'}
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>

            <PaymentSuccessModal
                isOpen={showSuccessModal}
                payment={paymentData}
                onClose={handleSuccessClose}
            />

            {showPrintConfirm && (
                <div className="fixed inset-0 bg-black/40 z-[80] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="bg-white rounded-2xl w-full max-w-sm p-6 text-center shadow-xl border border-slate-100"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Printer size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Imprimir Pre-Factura</h3>
                        <p className="text-slate-500 mb-6 text-sm">
                            Se generara una pre-factura con el total, los abonos registrados y el saldo pendiente.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setShowPrintConfirm(false)}
                                className="py-3 px-4 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    handlePrintPreInvoice();
                                    setShowPrintConfirm(false);
                                }}
                                className="py-3 px-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                            >
                                Imprimir
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {showProcessConfirm && (
                <div className="fixed inset-0 bg-black/40 z-[80] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="bg-white rounded-2xl w-full max-w-sm p-6 text-center shadow-xl border border-slate-100"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Confirmar Pago</h3>
                        <p className="text-slate-500 mb-6 text-sm">
                            Se registrara un abono de {formatNumber(enteredAmount)} por {paymentMethod.toUpperCase()}.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setShowProcessConfirm(false)}
                                className="py-3 px-4 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                                disabled={loading}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={async () => {
                                    setShowProcessConfirm(false);
                                    await submitPayment();
                                }}
                                disabled={loading}
                                className="py-3 px-4 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors"
                            >
                                Confirmar
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};
