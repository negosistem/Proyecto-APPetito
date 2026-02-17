/**
 * SuperAdminRoute - Protected Route for Super Admin
 * Protege las rutas del panel de Super Admin
 * Solo permite acceso a usuarios con rol super_admin
 */

import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../context/AuthContext';

export const SuperAdminRoute = () => {
    const { user, isLoading, isSuperAdmin } = useAuth();

    // Mostrar loading mientras se verifica autenticación
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-50">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                    <p className="text-gray-600">Verificando acceso...</p>
                </div>
            </div>
        );
    }

    // No autenticado → Login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Usuario normal intentando acceder a super admin → Dashboard normal
    if (!isSuperAdmin()) {
        return <Navigate to="/dashboard" replace />;
    }

    // Super Admin autenticado → Permitir acceso
    return <Outlet />;
};
