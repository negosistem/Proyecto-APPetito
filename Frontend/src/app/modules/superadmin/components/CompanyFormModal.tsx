/**
 * CompanyFormModal - Formulario para crear/editar empresa
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Loader2, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { superadminService } from '../services/superadminService';
import type { Company, CreateCompanyDTO, UpdateCompanyDTO } from '../types';
import { toast } from 'sonner';

interface CompanyFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    companyToEdit?: Company | null;
}

export const CompanyFormModal = ({
    isOpen,
    onClose,
    onSuccess,
    companyToEdit,
}: CompanyFormModalProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const isEditing = !!companyToEdit;

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        formState: { errors },
    } = useForm<CreateCompanyDTO & UpdateCompanyDTO>();

    useEffect(() => {
        if (isOpen) {
            if (companyToEdit) {
                setValue('name', companyToEdit.name);
                setValue('email', companyToEdit.email);
                setValue('phone', companyToEdit.phone);
                setValue('address', companyToEdit.address);
                setValue('max_users', companyToEdit.max_users);
                setValue('max_tables', companyToEdit.max_tables);
                setValue('max_products', companyToEdit.max_products);
                setValue('tax_rate', companyToEdit.tax_rate);
                setValue('currency', companyToEdit.currency);
            } else {
                reset({
                    name: '',
                    email: '',
                    phone: '',
                    address: '',
                    max_users: 5,
                    max_tables: 10,
                    max_products: 50,
                    tax_rate: 18,
                    currency: 'DOP',
                });
            }
        }
    }, [isOpen, companyToEdit, setValue, reset]);

    // Handle ESC key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    const onSubmit = async (data: any) => {
        setIsLoading(true);
        try {
            if (isEditing && companyToEdit) {
                await superadminService.updateCompany(companyToEdit.id, data);
                toast.success('Empresa actualizada exitosamente');
            } else {
                await superadminService.createCompany(data);
                toast.success('Empresa creada exitosamente');
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Error al guardar empresa');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 overflow-y-auto"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 my-8"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">
                                    {isEditing ? 'Editar Empresa' : 'Nueva Empresa'}
                                </h2>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X className="w-6 h-6 text-gray-400" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Basic Info */}
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-gray-900 border-b pb-2">
                                            Información Básica
                                        </h3>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Nombre de la Empresa *
                                            </label>
                                            <input
                                                {...register('name', { required: 'El nombre es obligatorio' })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                                placeholder="Ej. Restaurante Sabor"
                                            />
                                            {errors.name && (
                                                <p className="text-red-500 text-xs mt-1">{errors.name.message as string}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Email de Contacto *
                                            </label>
                                            <input
                                                {...register('email', {
                                                    required: 'El email es obligatorio',
                                                    pattern: {
                                                        value: /\S+@\S+\.\S+/,
                                                        message: 'Email inválido'
                                                    }
                                                })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                                placeholder="contacto@restaurante.com"
                                            />
                                            {errors.email && (
                                                <p className="text-red-500 text-xs mt-1">{errors.email.message as string}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Teléfono
                                            </label>
                                            <input
                                                {...register('phone')}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                                placeholder="809-555-5555"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Dirección
                                            </label>
                                            <textarea
                                                {...register('address')}
                                                rows={2}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                                placeholder="Calle Principal #123"
                                            />
                                        </div>
                                    </div>

                                    {/* Settings & Limits */}
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-gray-900 border-b pb-2">
                                            Configuración y Límites
                                        </h3>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Max Usuarios
                                                </label>
                                                <input
                                                    type="number"
                                                    {...register('max_users', { valueAsNumber: true })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Max Mesas
                                                </label>
                                                <input
                                                    type="number"
                                                    {...register('max_tables', { valueAsNumber: true })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Max Productos
                                            </label>
                                            <input
                                                type="number"
                                                {...register('max_products', { valueAsNumber: true })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Impuesto (%)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    {...register('tax_rate', { valueAsNumber: true })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Moneda
                                                </label>
                                                <select
                                                    {...register('currency')}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                                >
                                                    <option value="DOP">DOP</option>
                                                    <option value="USD">USD</option>
                                                    <option value="EUR">EUR</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                    >
                                        {isLoading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Save className="w-5 h-5" />
                                        )}
                                        {isEditing ? 'Guardar Cambios' : 'Crear Empresa'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
