/**
 * ConfirmDialog - Modal de confirmación reutilizable
 */

import { X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog = ({
    isOpen,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    onConfirm,
    onCancel,
    variant = 'warning',
}: ConfirmDialogProps) => {
    const variantConfig = {
        danger: {
            color: 'text-red-600',
            bg: 'bg-red-50',
            button: 'bg-red-600 hover:bg-red-700',
        },
        warning: {
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            button: 'bg-amber-600 hover:bg-amber-700',
        },
        info: {
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
            button: 'bg-indigo-600 hover:bg-indigo-700',
        },
    };

    const config = variantConfig[variant];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onCancel}
                        className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
                    >
                        {/* Modal */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className={`p-3 rounded-full ${config.bg}`}>
                                    <AlertTriangle className={`w-6 h-6 ${config.color}`} />
                                </div>
                                <button
                                    onClick={onCancel}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Content */}
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
                            <p className="text-gray-600 mb-6">{message}</p>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={onCancel}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                >
                                    {cancelText}
                                </button>
                                <button
                                    onClick={onConfirm}
                                    className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors font-medium ${config.button}`}
                                >
                                    {confirmText}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
