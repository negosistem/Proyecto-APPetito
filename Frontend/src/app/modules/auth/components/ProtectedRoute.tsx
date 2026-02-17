import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';

/**
 * Componente para proteger rutas privadas
 * Redirige al login si el usuario no está autenticado
 */
export const ProtectedRoute: React.FC = () => {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        // Puedes colocar un spinner o splash screen aquí
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        // Redirigir al login pero guardando la ubicación actual para volver después
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <Outlet />;
};
