import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '@/app/modules/auth/context/AuthContext';
import { User, Mail, Lock, ArrowRight, Loader2, Utensils, Store } from 'lucide-react';
import { toast } from 'sonner';

export default function Register() {
    const [restaurantName, setRestaurantName] = useState('');
    const [ownerName, setOwnerName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<{
        restaurantName?: string;
        ownerName?: string;
        email?: string;
        password?: string;
        confirmPassword?: string;
    }>({});

    const { register } = useAuth();
    const navigate = useNavigate();

    const validateForm = () => {
        const newErrors: typeof errors = {};

        if (!restaurantName.trim()) {
            newErrors.restaurantName = 'El nombre del restaurante es requerido';
        }

        if (!ownerName.trim()) {
            newErrors.ownerName = 'El nombre del responsable es requerido';
        }

        if (!email) {
            newErrors.email = 'El email es requerido';
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Email invalido';
        }

        if (!password) {
            newErrors.password = 'La contrasena es requerida';
        } else if (password.length < 6) {
            newErrors.password = 'La contrasena debe tener al menos 6 caracteres';
        }

        if (!confirmPassword) {
            newErrors.confirmPassword = 'Debes confirmar la contrasena';
        } else if (password !== confirmPassword) {
            newErrors.confirmPassword = 'Las contrasenas no coinciden';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsLoading(true);
        try {
            await register(restaurantName, ownerName, email, password);
            toast.success('Restaurante creado exitosamente');
            navigate('/dashboard');
        } catch {
            toast.error('Error al crear el restaurante');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                        className="inline-block"
                    >
                        <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mb-4 mx-auto shadow-lg relative">
                            <Utensils className="w-8 h-8 text-white relative z-10" />
                            <div className="absolute inset-0 bg-white/20 blur-xl rounded-full" />
                        </div>
                    </motion.div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">APPetito</h1>
                    <p className="text-slate-600">Crea tu restaurante y su cuenta administradora</p>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200"
                >
                    <h2 className="text-2xl font-semibold text-slate-900 mb-6">Registro inicial</h2>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="restaurantName" className="block text-sm font-medium text-slate-700 mb-2">
                                Nombre del restaurante
                            </label>
                            <div className="relative">
                                <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    id="restaurantName"
                                    type="text"
                                    value={restaurantName}
                                    onChange={(e) => {
                                        setRestaurantName(e.target.value);
                                        setErrors({ ...errors, restaurantName: undefined });
                                    }}
                                    className={`w-full pl-11 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all ${errors.restaurantName ? 'border-red-500' : 'border-slate-300'
                                        }`}
                                    placeholder="Bistro Central"
                                />
                            </div>
                            {errors.restaurantName && (
                                <motion.p
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="text-red-500 text-sm mt-1"
                                >
                                    {errors.restaurantName}
                                </motion.p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="ownerName" className="block text-sm font-medium text-slate-700 mb-2">
                                Nombre del responsable
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    id="ownerName"
                                    type="text"
                                    value={ownerName}
                                    onChange={(e) => {
                                        setOwnerName(e.target.value);
                                        setErrors({ ...errors, ownerName: undefined });
                                    }}
                                    className={`w-full pl-11 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all ${errors.ownerName ? 'border-red-500' : 'border-slate-300'
                                        }`}
                                    placeholder="Juan Perez"
                                />
                            </div>
                            {errors.ownerName && (
                                <motion.p
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="text-red-500 text-sm mt-1"
                                >
                                    {errors.ownerName}
                                </motion.p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                                Email administrativo
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        setErrors({ ...errors, email: undefined });
                                    }}
                                    className={`w-full pl-11 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all ${errors.email ? 'border-red-500' : 'border-slate-300'
                                        }`}
                                    placeholder="admin@restaurante.com"
                                />
                            </div>
                            {errors.email && (
                                <motion.p
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="text-red-500 text-sm mt-1"
                                >
                                    {errors.email}
                                </motion.p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                                Contrasena
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setErrors({ ...errors, password: undefined });
                                    }}
                                    className={`w-full pl-11 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all ${errors.password ? 'border-red-500' : 'border-slate-300'
                                        }`}
                                    placeholder="********"
                                />
                            </div>
                            {errors.password && (
                                <motion.p
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="text-red-500 text-sm mt-1"
                                >
                                    {errors.password}
                                </motion.p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
                                Confirmar contrasena
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => {
                                        setConfirmPassword(e.target.value);
                                        setErrors({ ...errors, confirmPassword: undefined });
                                    }}
                                    className={`w-full pl-11 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all ${errors.confirmPassword ? 'border-red-500' : 'border-slate-300'
                                        }`}
                                    placeholder="********"
                                />
                            </div>
                            {errors.confirmPassword && (
                                <motion.p
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="text-red-500 text-sm mt-1"
                                >
                                    {errors.confirmPassword}
                                </motion.p>
                            )}
                        </div>

                        <motion.button
                            type="submit"
                            disabled={isLoading}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Creando restaurante...
                                </>
                            ) : (
                                <>
                                    Crear restaurante
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </motion.button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-slate-600">
                            Ya tienes acceso?{' '}
                            <Link
                                to="/login"
                                className="text-orange-500 hover:text-orange-600 font-medium transition-colors"
                            >
                                Inicia sesion
                            </Link>
                        </p>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}
