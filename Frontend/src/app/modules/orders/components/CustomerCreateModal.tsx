import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Mail, Phone, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { customerService, Customer } from '../../customers/services/customerService';

interface CustomerCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCustomerCreated: (customer: Customer) => void;
}

export function CustomerCreateModal({ isOpen, onClose, onCustomerCreated }: CustomerCreateModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newCustomer, setNewCustomer] = useState({
        name: '',
        email: '',
        phone: '',
        address: ''
    });

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
        setIsSubmitting(true);
        try {
            const customer = await customerService.createCustomer({
                name: newCustomer.name,
                email: newCustomer.email || undefined,
                phone: newCustomer.phone || undefined,
                address: newCustomer.address || undefined
            });
            toast.success('Cliente registrado con éxito');
            onCustomerCreated(customer);
            setNewCustomer({ name: '', email: '', phone: '', address: '' });
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Error al registrar cliente');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
                    >
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-900">Registrar Cliente</h2>
                            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo*</label>
                                <input
                                    required
                                    value={newCustomer.name}
                                    onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                                    placeholder="Ej. Juan Pérez"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="email"
                                        value={newCustomer.email}
                                        onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                                        placeholder="juan@ejemplo.com"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="tel"
                                        value={newCustomer.phone}
                                        onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                                        className="w-full pl-10 pr-10 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                                        placeholder="809-000-0000"
                                        maxLength={10}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!newCustomer.phone) return;
                                            const cleanPhone = newCustomer.phone.replace(/\D/g, '');
                                            window.open(`https://wa.me/${cleanPhone}`, '_blank');
                                        }}
                                        className={`absolute right-3 top-1/2 -translate-y-1/2 transition-opacity ${newCustomer.phone ? 'opacity-100 hover:scale-110' : 'opacity-30 cursor-default'}`}
                                        title="WhatsApp"
                                    >
                                        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-emerald-500">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884h.001c2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.001 5.45-4.436 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.433 5.63 1.433h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        value={newCustomer.address}
                                        onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })}
                                        className="w-full pl-10 pr-10 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                                        placeholder="Ej. Calle Principal #123"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!newCustomer.address) return;
                                            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(newCustomer.address)}`, '_blank');
                                        }}
                                        className={`absolute right-3 top-1/2 -translate-y-1/2 transition-opacity ${newCustomer.address ? 'opacity-100 hover:scale-110' : 'opacity-30 cursor-default'}`}
                                        title="Ver en Google Maps"
                                    >
                                        <MapPin className="w-5 h-5 text-red-500" />
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 flex items-center justify-center"
                                >
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar Cliente'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
