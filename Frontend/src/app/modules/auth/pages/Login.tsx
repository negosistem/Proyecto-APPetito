import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '@/app/modules/auth/context/AuthContext';
import { Mail, Lock, ArrowRight, Loader2, Utensils, Building2, Crown } from 'lucide-react';
import { toast } from 'sonner';

type UserType = 'restaurant' | 'superadmin';

export default function Login() {
  const [userType, setUserType] = useState<UserType>('restaurant');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const { login } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email inválido';
    }

    if (!password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await login(email, password);

      // ✨ Redirección automática según rol y tipo de login seleccionado
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);

        // Validación cruzada
        if (userType === 'superadmin') {
          if (user.role !== 'super_admin') {
            throw new Error('No tienes permisos de Super Admin');
          }
          toast.success('¡Bienvenido Super Admin!');
          navigate('/superadmin/dashboard');
        } else {
          // Intento de login como restaurante
          if (user.role === 'super_admin') {
            throw new Error('Super Admin debe usar acceso administrativo');
          }
          toast.success('¡Bienvenido a APPetito!');
          navigate('/dashboard');
        }
      } else {
        navigate('/dashboard'); // Fallback
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  const isSuperAdmin = userType === 'superadmin';

  return (
    <div className={`min-h-screen flex items-center justify-center transition-colors duration-500 p-4 ${isSuperAdmin
      ? 'bg-gradient-to-br from-violet-50 via-white to-fuchsia-50'
      : 'bg-gradient-to-br from-slate-50 via-white to-slate-100'
      }`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Toggle User Type */}
        <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 mb-8 flex relative">
          <motion.div
            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg shadow-sm transition-colors duration-300 ${isSuperAdmin ? 'bg-violet-600' : 'bg-orange-500'
              }`}
            animate={{
              x: isSuperAdmin ? '100%' : '0%',
              left: isSuperAdmin ? '4px' : '4px' // Ajuste fino
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
          <button
            onClick={() => setUserType('restaurant')}
            className={`flex-1 relative z-10 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors duration-300 ${!isSuperAdmin ? 'text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Building2 className="w-4 h-4" />
            Restaurante
          </button>
          <button
            onClick={() => setUserType('superadmin')}
            className={`flex-1 relative z-10 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors duration-300 ${isSuperAdmin ? 'text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Crown className="w-4 h-4" />
            Super Admin
          </button>
        </div>

        {/* Logo y título */}
        <div className="text-center mb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={userType}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="inline-block"
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 mx-auto shadow-lg relative bg-gradient-to-br ${isSuperAdmin ? 'from-violet-500 to-fuchsia-600' : 'from-orange-500 to-red-500'
                }`}>
                {isSuperAdmin ? (
                  <Crown className="w-8 h-8 text-white relative z-10" />
                ) : (
                  <Utensils className="w-8 h-8 text-white relative z-10" />
                )}
                <div className="absolute inset-0 bg-white/20 blur-xl rounded-full" />
              </div>
            </motion.div>
          </AnimatePresence>

          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {isSuperAdmin ? 'Panel Administrativo' : 'APPetito'}
          </h1>
          <p className="text-slate-600">
            {isSuperAdmin ? 'Gestión global del sistema' : 'Gestión integral de restaurantes'}
          </p>
        </div>

        {/* Formulario */}
        <motion.div
          layout
          className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200"
        >
          <h2 className="text-2xl font-semibold text-slate-900 mb-6">
            {isSuperAdmin ? 'Acceso Seguro' : 'Iniciar Sesión'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email {isSuperAdmin ? 'Administrativo' : ''}
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
                  className={`w-full pl-11 pr-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent outline-none transition-all ${errors.email ? 'border-red-500' : 'border-slate-300'
                    } ${isSuperAdmin ? 'focus:ring-violet-500' : 'focus:ring-orange-500'}`}
                  placeholder={isSuperAdmin ? "admin@appetito.com" : "tu@email.com"}
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

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                Contraseña
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
                  className={`w-full pl-11 pr-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent outline-none transition-all ${errors.password ? 'border-red-500' : 'border-slate-300'
                    } ${isSuperAdmin ? 'focus:ring-violet-500' : 'focus:ring-orange-500'}`}
                  placeholder="••••••••"
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

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full text-white py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${isSuperAdmin
                ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-violet-200'
                : 'bg-gradient-to-r from-orange-500 to-red-500 shadow-orange-200'
                }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Ingresando...
                </>
              ) : (
                <>
                  {isSuperAdmin ? 'Acceder al Panel' : 'Iniciar Sesión'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </form>

          {/* Registro - Solo para Restaurantes */}
          {!isSuperAdmin && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 text-center"
            >
              <p className="text-slate-600">
                ¿No tienes cuenta?{' '}
                <Link
                  to="/register"
                  className="text-orange-500 hover:text-orange-600 font-medium transition-colors"
                >
                  Regístrate aquí
                </Link>
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* Info demo */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-center text-sm text-slate-500"
        >
          <p>© {new Date().getFullYear()} APPetito SaaS. Todos los derechos reservados.</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
