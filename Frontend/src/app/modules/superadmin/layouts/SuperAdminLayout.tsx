/**
 * SuperAdminLayout - Layout principal para el panel de Super Admin
 */

import { Outlet, Link } from 'react-router';
import { SuperAdminSidebar } from '../components/SuperAdminSidebar';
import { useAuth } from '../../auth/context/AuthContext';
import { Search, Bell, Plus, ChevronDown, Globe } from 'lucide-react';

export default function SuperAdminLayout() {
    const { user } = useAuth();

    return (
        <div className="flex h-screen bg-gray-50 font-sans">
            {/* Sidebar */}
            <SuperAdminSidebar />

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="bg-white border-b border-gray-200 h-16 px-6 flex items-center justify-between sticky top-0 z-10">
                    {/* Search */}
                    <div className="flex-1 max-w-xl">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar restaurantes, usuarios..."
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                            />
                        </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-4 ml-4">
                        {/* Environment Badge */}
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full border border-gray-200 cursor-pointer hover:bg-gray-200 transition-colors">
                            <Globe className="w-3.5 h-3.5 text-gray-500" />
                            <span className="text-xs font-medium text-gray-700">Producción</span>
                            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                        </div>

                        {/* Notifications */}
                        <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                        </button>

                        <div className="h-6 w-px bg-gray-200 mx-1"></div>

                        {/* Create Button */}
                        <Link
                            to="/superadmin/companies"
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm shadow-indigo-200"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Nuevo Restaurante</span>
                        </Link>

                        {/* User Profile (Minimal) */}
                        <div className="flex items-center gap-3 ml-2 cursor-pointer">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs">
                                {user?.nombre?.substring(0, 2).toUpperCase() || 'SA'}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
