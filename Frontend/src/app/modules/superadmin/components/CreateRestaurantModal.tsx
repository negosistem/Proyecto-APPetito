/**
 * CreateRestaurantModal
 * Modal de 3 pasos para crear un restaurante completo desde el SuperAdmin.
 * Llama POST /api/superadmin/companies/setup
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    X, Building2, Package, User, ChevronRight, ChevronLeft,
    Check, Loader2, Eye, EyeOff, Utensils, AlertCircle, Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { superadminService } from '../services/superadminService';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

// ── Planes predefinidos ────────────────────────────────────────────────────
const PLANS = [
    {
        id: 'trial',
        label: 'Trial',
        duration: '30 días gratis',
        max_users: 5,
        max_tables: 10,
        max_products: 50,
        color: 'border-amber-400 bg-amber-50',
        badge: 'bg-amber-100 text-amber-700',
        icon: '🧪',
    },
    {
        id: 'monthly',
        label: 'Mensual',
        duration: 'Renovación mensual',
        max_users: 15,
        max_tables: 30,
        max_products: 200,
        color: 'border-indigo-400 bg-indigo-50',
        badge: 'bg-indigo-100 text-indigo-700',
        icon: '📅',
    },
    {
        id: 'annual',
        label: 'Anual',
        duration: 'Mejor precio',
        max_users: 50,
        max_tables: 100,
        max_products: 1000,
        color: 'border-orange-400 bg-orange-50',
        badge: 'bg-orange-100 text-orange-700',
        icon: '⭐',
    },
];

type Step = 'restaurant' | 'plan' | 'admin' | 'success';

const STEPS: { id: Step; label: string; icon: typeof Building2 }[] = [
    { id: 'restaurant', label: 'Restaurante', icon: Building2 },
    { id: 'plan', label: 'Plan', icon: Package },
    { id: 'admin', label: 'Administrador', icon: User },
];

const emptyForm = {
    name: '',
    email: '',
    phone: '',
    address: '',
    tax_rate: 18,
    currency: 'DOP',
    subscription: 'trial',
    max_users: 5,
    max_tables: 10,
    max_products: 50,
    admin_nombre: '',
    admin_email: '',
    admin_password: '',
    admin_confirm: '',
};

const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        {children}
        {error && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
);

export const CreateRestaurantModal = ({ isOpen, onClose, onSuccess }: Props) => {
    const [step, setStep] = useState<Step>('restaurant');
    const [form, setForm] = useState({ ...emptyForm });
    const [showPass, setShowPass] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [successData, setSuccessData] = useState<any>(null);

    // Handle ESC key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen]);

    const currentStepIndex = STEPS.findIndex(s => s.id === step);

    const set = (field: string, value: any) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setErrors(prev => ({ ...prev, [field]: '' }));
    };

    const selectPlan = (planId: string) => {
        const plan = PLANS.find(p => p.id === planId)!;
        setForm(prev => ({
            ...prev,
            subscription: planId,
            max_users: plan.max_users,
            max_tables: plan.max_tables,
            max_products: plan.max_products,
        }));
    };

    // ── Validaciones por paso ─────────────────────────────────────────────
    const validateRestaurant = () => {
        const e: Record<string, string> = {};
        if (!form.name.trim()) e.name = 'El nombre es obligatorio';
        if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email inválido';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const validateAdmin = () => {
        const e: Record<string, string> = {};
        if (!form.admin_nombre.trim()) e.admin_nombre = 'El nombre es obligatorio';
        if (!form.admin_email.trim()) e.admin_email = 'El email es obligatorio';
        else if (!/\S+@\S+\.\S+/.test(form.admin_email)) e.admin_email = 'Email inválido';
        if (!form.admin_password) e.admin_password = 'La contraseña es obligatoria';
        else if (form.admin_password.length < 6) e.admin_password = 'Mínimo 6 caracteres';
        if (form.admin_password !== form.admin_confirm) e.admin_confirm = 'Las contraseñas no coinciden';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleNext = () => {
        if (step === 'restaurant' && !validateRestaurant()) return;
        if (step === 'plan') setStep('admin');
        else if (step === 'restaurant') setStep('plan');
    };

    const handleBack = () => {
        if (step === 'admin') setStep('plan');
        else if (step === 'plan') setStep('restaurant');
    };

    const handleSubmit = async () => {
        if (!validateAdmin()) return;
        setIsLoading(true);
        try {
            const payload = {
                name: form.name,
                email: form.email || undefined,
                phone: form.phone || undefined,
                address: form.address || undefined,
                tax_rate: form.tax_rate,
                currency: form.currency,
                subscription: form.subscription,
                max_users: form.max_users,
                max_tables: form.max_tables,
                max_products: form.max_products,
                admin: {
                    nombre: form.admin_nombre,
                    email: form.admin_email,
                    password: form.admin_password,
                },
            };
            const result = await superadminService.createRestaurant(payload);
            setSuccessData(result);
            setStep('success');
            onSuccess();
        } catch (err: any) {
            const detail = err?.response?.data?.detail || err?.message || 'Error al crear el restaurante';
            toast.error(detail);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setStep('restaurant');
        setForm({ ...emptyForm });
        setErrors({});
        setSuccessData(null);
        onClose();
    };

    const copy = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copiado al portapapeles');
    };

    const inputCls = (err?: string) =>
        `w-full px-3 py-2 border rounded-lg outline-none text-sm transition-colors ${err ? 'border-red-400 focus:ring-2 focus:ring-red-300' : 'border-gray-300 focus:ring-2 focus:ring-indigo-400 focus:border-transparent'}`;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={handleClose}
                >
                    <motion.div
                        initial={{ scale: 0.93, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.93, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                        onClick={e => e.stopPropagation()}
                        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-indigo-500 to-blue-600 p-5 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                    <Utensils className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold">Nuevo Restaurante</h2>
                                    <p className="text-white/70 text-xs">Configuración completa en 3 pasos</p>
                                </div>
                            </div>
                            <button onClick={handleClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Stepper */}
                        {step !== 'success' && (
                            <div className="flex items-center px-6 pt-4 pb-2 gap-2">
                                {STEPS.map((s, idx) => {
                                    const done = currentStepIndex > idx;
                                    const active = currentStepIndex === idx;
                                    const Icon = s.icon;
                                    return (
                                        <div key={s.id} className="flex items-center gap-2 flex-1">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${done ? 'bg-green-500 text-white' : active ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                                {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                                            </div>
                                            <span className={`text-xs font-medium hidden sm:block ${active ? 'text-indigo-600' : done ? 'text-green-600' : 'text-gray-400'}`}>{s.label}</span>
                                            {idx < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${done ? 'bg-green-400' : 'bg-gray-200'}`} />}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Content */}
                        <div className="p-6">
                            <AnimatePresence mode="wait">
                                {/* ── PASO 1: Restaurante ── */}
                                {step === 'restaurant' && (
                                    <motion.div key="restaurant" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                                        <Field label="Nombre del restaurante *" error={errors.name}>
                                            <input value={form.name} onChange={e => set('name', e.target.value)} className={inputCls(errors.name)} placeholder="Ej. Restaurante El Sabor" />
                                        </Field>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Field label="Email de contacto" error={errors.email}>
                                                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls(errors.email)} placeholder="contacto@email.com" />
                                            </Field>
                                            <Field label="Teléfono">
                                                <input value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls()} placeholder="809-555-5555" />
                                            </Field>
                                        </div>
                                        <Field label="Dirección">
                                            <textarea value={form.address} onChange={e => set('address', e.target.value)} rows={2} className={inputCls()} placeholder="Calle Principal #123, Ciudad" />
                                        </Field>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Field label="ITBIS / Impuesto (%)">
                                                <input type="number" step="0.01" min="0" max="100" value={form.tax_rate} onChange={e => set('tax_rate', parseFloat(e.target.value))} className={inputCls()} />
                                            </Field>
                                            <Field label="Moneda">
                                                <select value={form.currency} onChange={e => set('currency', e.target.value)} className={inputCls()}>
                                                    <option value="DOP">DOP — Peso Dom.</option>
                                                    <option value="USD">USD — Dólar</option>
                                                    <option value="EUR">EUR — Euro</option>
                                                </select>
                                            </Field>
                                        </div>
                                    </motion.div>
                                )}

                                {/* ── PASO 2: Plan ── */}
                                {step === 'plan' && (
                                    <motion.div key="plan" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                                        <p className="text-sm text-gray-500 mb-2">Selecciona el plan de suscripción del restaurante:</p>
                                        {PLANS.map(plan => (
                                            <button
                                                key={plan.id}
                                                type="button"
                                                onClick={() => selectPlan(plan.id)}
                                                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${form.subscription === plan.id ? plan.color : 'border-gray-200 bg-white hover:border-gray-300'}`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xl">{plan.icon}</span>
                                                        <span className="font-bold text-gray-900">{plan.label}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${plan.badge}`}>{plan.duration}</span>
                                                        {form.subscription === plan.id && <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                                                    <div className="bg-white/70 rounded-lg px-2 py-1 text-center">
                                                        <div className="font-bold text-gray-900">{plan.max_users}</div>
                                                        <div>Usuarios</div>
                                                    </div>
                                                    <div className="bg-white/70 rounded-lg px-2 py-1 text-center">
                                                        <div className="font-bold text-gray-900">{plan.max_tables}</div>
                                                        <div>Mesas</div>
                                                    </div>
                                                    <div className="bg-white/70 rounded-lg px-2 py-1 text-center">
                                                        <div className="font-bold text-gray-900">{plan.max_products}</div>
                                                        <div>Productos</div>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </motion.div>
                                )}

                                {/* ── PASO 3: Admin ── */}
                                {step === 'admin' && (
                                    <motion.div key="admin" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-sm text-indigo-700 flex items-start gap-2">
                                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                            <span>Este usuario será el <strong>administrador del restaurante</strong>. Podrá iniciar sesión en <code className="bg-indigo-100 px-1 rounded">/login</code>.</span>
                                        </div>
                                        <Field label="Nombre completo *" error={errors.admin_nombre}>
                                            <input value={form.admin_nombre} onChange={e => set('admin_nombre', e.target.value)} className={inputCls(errors.admin_nombre)} placeholder="Juan Pérez" />
                                        </Field>
                                        <Field label="Email del administrador *" error={errors.admin_email}>
                                            <input type="email" value={form.admin_email} onChange={e => set('admin_email', e.target.value)} className={inputCls(errors.admin_email)} placeholder="admin@restaurante.com" />
                                        </Field>
                                        <Field label="Contraseña *" error={errors.admin_password}>
                                            <div className="relative">
                                                <input type={showPass ? 'text' : 'password'} value={form.admin_password} onChange={e => set('admin_password', e.target.value)} className={inputCls(errors.admin_password) + ' pr-10'} placeholder="Mínimo 6 caracteres" />
                                                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </Field>
                                        <Field label="Confirmar contraseña *" error={errors.admin_confirm}>
                                            <input type={showPass ? 'text' : 'password'} value={form.admin_confirm} onChange={e => set('admin_confirm', e.target.value)} className={inputCls(errors.admin_confirm)} placeholder="Repite la contraseña" />
                                        </Field>
                                    </motion.div>
                                )}

                                {/* ── ÉXITO ── */}
                                {step === 'success' && successData && (
                                    <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
                                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                            <Check className="w-8 h-8 text-green-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900">¡Restaurante Creado!</h3>
                                            <p className="text-gray-500 text-sm mt-1">{successData.message}</p>
                                        </div>
                                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-left space-y-3">
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div>
                                                    <p className="text-gray-500 text-xs">Empresa</p>
                                                    <p className="font-semibold text-gray-900">{successData.company_name}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500 text-xs">Plan</p>
                                                    <p className="font-semibold capitalize text-gray-900">{successData.subscription}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500 text-xs">Mesas creadas</p>
                                                    <p className="font-semibold text-gray-900">{successData.tables_created}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500 text-xs">Admin</p>
                                                    <p className="font-semibold text-gray-900">{successData.admin_nombre}</p>
                                                </div>
                                            </div>
                                            <div className="border-t pt-3">
                                                <p className="text-xs text-gray-500 mb-1">Credenciales del administrador</p>
                                                <div className="flex items-center justify-between bg-white border rounded-lg px-3 py-2">
                                                    <span className="text-sm font-mono text-gray-700">{successData.admin_email}</span>
                                                    <button onClick={() => copy(successData.admin_email)} className="text-gray-400 hover:text-indigo-500 transition-colors">
                                                        <Copy className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={handleClose} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors">
                                            Cerrar
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Footer nav */}
                        {step !== 'success' && (
                            <div className="px-6 pb-6 flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={step === 'restaurant' ? handleClose : handleBack}
                                    className="flex items-center gap-1 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    {step === 'restaurant' ? 'Cancelar' : 'Atrás'}
                                </button>
                                {step !== 'admin' ? (
                                    <button
                                        type="button"
                                        onClick={handleNext}
                                        className="flex items-center gap-1 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-semibold shadow-sm"
                                    >
                                        Siguiente
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleSubmit}
                                        disabled={isLoading}
                                        className="flex items-center gap-2 px-5 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm font-semibold shadow-sm disabled:opacity-60"
                                    >
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        {isLoading ? 'Creando...' : 'Crear Restaurante'}
                                    </button>
                                )}
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
