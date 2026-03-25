/**
 * SuspendCompanyModal - Modal para suspender empresa con motivo
 */

import { useState, useEffect } from 'react';
import { X, Loader2, Ban } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { superadminService } from '../services/superadminService';
import { toast } from 'sonner';

interface SuspendCompanyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    companyId: number;
    companyName: string;
}

export const SuspendCompanyModal = ({
    isOpen,
    onClose,
    onSuccess,
    companyId,
    companyName,
}: SuspendCompanyModalProps) => {
    const [reason, setReason] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Handle ESC key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason.trim()) {
            toast.error('Debes ingresar un motivo de suspensión');
            return;
        }

        setIsLoading(true);
        try {
            await superadminService.suspendCompany(companyId, { reason });
            toast.success('Empresa suspendida exitosamente');
            setReason('');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Error al suspender empresa');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50"
                    />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative z-10"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-100 rounded-full">
                                    <Ban className="w-6 h-6 text-red-600" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">Suspender Empresa</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="mb-4">
                            <p className="text-gray-600 mb-2">
                                Estás a punto de suspender a <strong>{companyName}</strong>.
                            </p>
                            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                                ⚠️ Todos los usuarios de esta empresa perderán el acceso al sistema inmediatamente.
                            </div>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Motivo de Suspensión *
                                </label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none min-h-[100px]"
                                    placeholder="Ej. Falta de pago, violación de términos..."
                                    required
                                />
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading || !reason.trim()}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Confirmar Suspensión
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
