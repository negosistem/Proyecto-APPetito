import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, AlertCircle } from 'lucide-react';
import { Table, TableCreate, TableUpdate } from '../services/tableService';

interface TableModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: TableCreate | TableUpdate) => Promise<void>;
    editingTable?: Table | null;
}

export default function TableModal({ isOpen, onClose, onSave, editingTable }: TableModalProps) {
    const [formData, setFormData] = useState<TableCreate>({
        number: '',
        capacity: 4,
        status: 'libre',
        location: 'Salón',
        is_active: true
    });

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (editingTable) {
            setFormData({
                number: editingTable.number,
                capacity: editingTable.capacity,
                status: editingTable.status,
                location: editingTable.location,
                is_active: editingTable.is_active
            });
        } else {
            setFormData({
                number: '',
                capacity: 4,
                status: 'libre',
                location: 'Salón',
                is_active: true
            });
        }
        setError(null);
    }, [editingTable, isOpen]);

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
        setError(null);
        setLoading(true);

        try {
            await onSave(formData);
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Error al guardar la mesa');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                onClick={onClose}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
                >
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-xl font-bold text-slate-900">
                            {editingTable ? 'Editar Mesa' : 'Nueva Mesa'}
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        {error && (
                            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Número/Código
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.number}
                                    onChange={e => setFormData({ ...formData, number: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    placeholder="Ej: 10, A1"
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Capacidad
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    value={formData.capacity}
                                    onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Ubicación / Zona
                            </label>
                            <select
                                value={formData.location}
                                onChange={e => setFormData({ ...formData, location: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            >
                                <option value="Salón">Salón Principal</option>
                                <option value="Terraza">Terraza</option>
                                <option value="Bar">Bar</option>
                                <option value="VIP">Zona VIP</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Estado Inicial
                            </label>
                            <select
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            >
                                <option value="libre">Libre</option>
                                <option value="ocupada">Ocupada</option>
                                <option value="reservada">Reservada</option>
                                <option value="fuera_de_servicio">Fuera de Servicio</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={formData.is_active}
                                onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                className="w-4 h-4 text-orange-500 border-slate-300 rounded focus:ring-orange-500"
                            />
                            <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
                                Mesa Habilitada
                            </label>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:shadow-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Guardar
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
