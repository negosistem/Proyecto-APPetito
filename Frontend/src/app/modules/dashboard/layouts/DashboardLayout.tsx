import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/app/modules/auth/context/AuthContext';
import ConnectionStatus from '@/app/shared/components/ConnectionStatus';
import {
    Home,
    ChefHat,
    ShoppingBag,
    UtensilsCrossed,
    Users,
    UserCog,
    Armchair,
    DollarSign,
    Calendar,
    QrCode,
    Settings,
    LogOut,
    Menu as MenuIcon,
    X,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';

interface NavItem {
    path: string;
    label: string;
    icon: React.ReactNode;
}

const navItems: NavItem[] = [
    { path: '/dashboard', label: 'Inicio', icon: <Home className="w-5 h-5" /> },
    { path: '/dashboard/cocina', label: 'Cocina', icon: <ChefHat className="w-5 h-5" /> },
    { path: '/dashboard/pedidos', label: 'Pedidos', icon: <ShoppingBag className="w-5 h-5" /> },
    { path: '/dashboard/menu', label: 'Menú', icon: <UtensilsCrossed className="w-5 h-5" /> },
    { path: '/dashboard/mesas', label: 'Mesas', icon: <Armchair className="w-5 h-5" /> },
    { path: '/dashboard/clientes', label: 'Clientes', icon: <Users className="w-5 h-5" /> },
    { path: '/dashboard/staff', label: 'Staff', icon: <UserCog className="w-5 h-5" /> },
    { path: '/dashboard/finanzas', label: 'Finanzas', icon: <DollarSign className="w-5 h-5" /> },
    { path: '/dashboard/reservas', label: 'Reservas', icon: <Calendar className="w-5 h-5" /> },
    { path: '/dashboard/qr', label: 'Config. QR', icon: <QrCode className="w-5 h-5" /> },
    { path: '/dashboard/configuracion', label: 'Configuración', icon: <Settings className="w-5 h-5" /> },
];

export default function DashboardLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Expose sidebar width as a CSS variable so any child (e.g. KitchenKanban) can use it.
    // On mobile there is no sidebar, so we set 0px via a resize observer.
    useEffect(() => {
        const update = () => {
            const isMobile = window.innerWidth < 1024; // lg breakpoint
            document.documentElement.style.setProperty(
                '--sidebar-w',
                isMobile ? '0px' : sidebarOpen ? '256px' : '80px'
            );
        };
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, [sidebarOpen]);

    const isActiveRoute = (path: string) => {
        if (path === '/dashboard') {
            return location.pathname === path;
        }
        return location.pathname.startsWith(path);
    };

    // Route guard: Redirect if user tries to access a module they don't have permission for
    useEffect(() => {
        if (!user) return;
        if (user.role === 'admin' || user.role === 'super_admin') return;

        const pathSegments = location.pathname.split('/');
        const moduleName = pathSegments[2]; // e.g., '/dashboard/cocina' -> index 2 is 'cocina'

        if (moduleName && moduleName !== 'dashboard') {
            // Not a base dashboard route, check module permission
            if (!user.modules || !Array.isArray(user.modules) || !user.modules.includes(moduleName)) {
                navigate('/dashboard', { replace: true });
            }
        }
    }, [location.pathname, user, navigate]);

    // Filter navigation items based on user role and assigned modules
    const filteredNavItems = navItems.filter(item => {
        // Hide Staff menu for non-admin users
        if (item.path === '/dashboard/staff' && user?.role !== 'admin') {
            return false;
        }

        // Check if the user is an admin or super_admin, they have access to everything
        if (user?.role === 'admin' || user?.role === 'super_admin') {
            return true;
        }

        // For other users, check if they have specific module access
        // Extract the module name from the path (e.g., '/dashboard/cocina' -> 'cocina')
        const moduleName = item.path.split('/').pop() || '';

        // Allowed default paths for everyone
        if (moduleName === 'dashboard') {
            return true;
        }

        // If the user has assigned modules, check if this module is in their list
        if (user?.modules && Array.isArray(user.modules) && user.modules.includes(moduleName)) {
            return true;
        }

        // If not explicitly granted, hide the menu item
        return false;
    });

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Mobile Menu Button */}
            <div className="lg:hidden fixed top-4 left-4 z-50">
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="p-2 bg-white rounded-lg shadow-lg"
                >
                    {mobileMenuOpen ? <X className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
                </motion.button>
            </div>

            {/* Sidebar Desktop */}
            <motion.aside
                initial={false}
                animate={{ width: sidebarOpen ? 256 : 80 }}
                transition={{ duration: 0.3 }}
                className="hidden lg:block fixed left-0 top-0 h-screen bg-white border-r border-slate-200 shadow-sm z-40"
            >
                {/* Header */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200">
                    <AnimatePresence mode="wait">
                        {sidebarOpen ? (
                            <motion.div
                                key="logo-full"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center gap-3"
                            >
                                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                                    <span className="text-xl">🍽️</span>
                                </div>
                                <span className="text-xl font-bold text-slate-900">APPetito</span>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="logo-mini"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center"
                            >
                                <span className="text-xl">🍽️</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </motion.button>
                </div>

                {/* Navigation */}
                <nav className="p-3 space-y-1 h-[calc(100vh-8rem)] overflow-y-auto">
                    {filteredNavItems.map((item) => {
                        const isActive = isActiveRoute(item.path);
                        return (
                            <motion.button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                whileHover={{ x: 4 }}
                                whileTap={{ scale: 0.98 }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive
                                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md'
                                    : 'text-slate-700 hover:bg-slate-100'
                                    }`}
                            >
                                {item.icon}
                                <AnimatePresence>
                                    {sidebarOpen && (
                                        <motion.span
                                            initial={{ opacity: 0, width: 0 }}
                                            animate={{ opacity: 1, width: 'auto' }}
                                            exit={{ opacity: 0, width: 0 }}
                                            className="text-sm font-medium whitespace-nowrap"
                                        >
                                            {item.label}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </motion.button>
                        );
                    })}
                </nav>

                {/* User Section */}
                <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-200 bg-white">
                    <div className={`flex items-center gap-3 ${sidebarOpen ? '' : 'justify-center'}`}>
                        <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {user?.nombre?.charAt(0)}
                        </div>
                        <AnimatePresence>
                            {sidebarOpen && (
                                <motion.div
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: 'auto' }}
                                    exit={{ opacity: 0, width: 0 }}
                                    className="flex-1 min-w-0"
                                >
                                    <p className="text-sm font-medium text-slate-900 truncate">{user?.nombre}</p>
                                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        {sidebarOpen && (
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={handleLogout}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Cerrar sesión"
                            >
                                <LogOut className="w-4 h-4 text-slate-600" />
                            </motion.button>
                        )}
                    </div>
                </div>
            </motion.aside>

            {/* Mobile Sidebar */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileMenuOpen(false)}
                            className="lg:hidden fixed inset-0 bg-black/50 z-30"
                        />
                        <motion.aside
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            transition={{ type: 'spring', damping: 25 }}
                            className="lg:hidden fixed left-0 top-0 h-screen w-72 bg-white shadow-2xl z-40"
                        >
                            {/* Mobile Header */}
                            <div className="h-16 flex items-center gap-3 px-4 border-b border-slate-200">
                                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                                    <span className="text-xl">🍽️</span>
                                </div>
                                <span className="text-xl font-bold text-slate-900">APPetito</span>
                            </div>

                            {/* Mobile Navigation */}
                            <nav className="p-3 space-y-1">
                                {filteredNavItems.map((item) => {
                                    const isActive = isActiveRoute(item.path);
                                    return (
                                        <button
                                            key={item.path}
                                            onClick={() => {
                                                navigate(item.path);
                                                setMobileMenuOpen(false);
                                            }}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive
                                                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md'
                                                : 'text-slate-700 hover:bg-slate-100'
                                                }`}
                                        >
                                            {item.icon}
                                            <span className="text-sm font-medium">{item.label}</span>
                                        </button>
                                    );
                                })}
                            </nav>

                            {/* Mobile User Section */}
                            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 bg-white">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-semibold">
                                        {user?.nombre?.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-900 truncate">{user?.nombre}</p>
                                        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span className="text-sm font-medium">Cerrar sesión</span>
                                </button>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main
                className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
                    }`}
            >
                <div className="p-4 lg:p-8 pt-20 lg:pt-8 min-h-screen">
                    <Outlet />
                </div>
            </main>
            <ConnectionStatus />
        </div>
    );
}
