import { NavLink, useNavigate } from 'react-router';
import {
    LayoutDashboard,
    Building2,
    CreditCard,
    FileText,
    LogOut,
    Settings,
    HelpCircle,
    PieChart,
    Users,
    Crown
} from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext';
import { toast } from 'sonner';

export const SuperAdminSidebar = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        toast.success('Sesión cerrada');
        navigate('/login');
    };

    const navItems = [
        {
            to: '/superadmin/dashboard',
            icon: LayoutDashboard,
            label: 'Dashboard',
        },
        {
            to: '/superadmin/companies',
            icon: Building2,
            label: 'Restaurantes',
        },
        {
            to: '/superadmin/subscriptions',
            icon: CreditCard,
            label: 'Suscripciones',
        },
        {
            to: '/superadmin/plans', // Placeholder/Future
            icon: FileText,
            label: 'Planes',
        },
        {
            to: '/superadmin/billing', // Placeholder/Future
            icon: PieChart, // Using PieChart as placeholder for Billing
            label: 'Facturación',
        },
        {
            to: '/superadmin/users',
            icon: Users,
            label: 'Usuarios Globales',
        },
        {
            to: '/superadmin/reports',
            icon: FileText, // Reusing FileText for Reports/Audit
            label: 'Reportes',
        },
        {
            to: '/superadmin/settings',
            icon: Settings,
            label: 'Configuración Global',
        },
        {
            to: '/superadmin/support',
            icon: HelpCircle,
            label: 'Soporte',
        },
    ];

    return (
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
            {/* Logo */}
            <div className="p-6">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200">
                        <Crown className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg text-gray-900 leading-tight">APPetito</h1>
                        <p className="text-xs text-gray-500 font-medium">SuperAdmin</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {/* Section Header */}
                <div className="px-3 mb-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Sistema Operativo</p>
                </div>

                {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${isActive
                                    ? 'bg-indigo-50 text-indigo-600 font-medium'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <Icon
                                        className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`}
                                    />
                                    <span className="text-sm">{item.label}</span>
                                </>
                            )}
                        </NavLink>
                    );
                })}
            </nav>

            {/* User Profile / Logout */}
            <div className="p-4 border-t border-gray-100">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all group"
                >
                    <LogOut className="w-5 h-5 text-gray-400 group-hover:text-red-500" />
                    <span className="text-sm font-medium">Cerrar Sesión</span>
                </button>
            </div>
        </aside>
    );
};
