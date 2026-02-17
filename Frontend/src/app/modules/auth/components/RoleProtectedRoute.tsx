import React from 'react';
import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { AlertCircle } from 'lucide-react';

interface RoleProtectedRouteProps {
    allowedRoles: string[];
}

/**
 * Component to protect routes based on user role.
 * Redirects to login if not authenticated.
 * Shows access denied message if user doesn't have required role.
 */
export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ allowedRoles }) => {
    const { user, isAuthenticated, isLoading } = useAuth();

    // Show loading spinner while checking authentication
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated || !user) {
        return <Navigate to="/login" replace />;
    }

    // Check if user has required role
    if (!allowedRoles.includes(user.role)) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Acceso Denegado</h2>
                    <p className="text-slate-600 mb-6">
                        No tienes permisos para acceder a esta sección.
                    </p>
                    <button
                        onClick={() => window.history.back()}
                        className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-medium hover:shadow-lg transition-shadow"
                    >
                        Volver
                    </button>
                </div>
            </div>
        );
    }

    // User has required role, render the protected route
    return <Outlet />;
};
