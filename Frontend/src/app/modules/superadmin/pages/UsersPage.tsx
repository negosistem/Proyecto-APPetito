/**
 * UsersPage - Gestión Global de Usuarios
 * Vista detallada de todos los usuarios de la plataforma
 */

import { useState, useEffect } from 'react';
import { superadminService } from '../services/superadminService';
// import { User } from '../types'; 
import { LoadingSpinner } from '../components/LoadingSpinner';
import {
    Search,
    Filter,
    Download,
    MoreVertical,
    Eye,
    Shield,
    Ban,
    UserPlus
} from 'lucide-react';
import { toast } from 'sonner';

export default function UsersPage() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState<string>('all');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            // Mock Data matching the reference image
            const mockUsers = [
                {
                    id: 1,
                    name: 'Marco Rossi',
                    email: 'marco@lapiazza.com',
                    role: 'Dueño',
                    restaurant: 'La Piazza Italiana',
                    status: 'active',
                    lastAccess: 'Hace 2 horas',
                    avatarColor: 'bg-orange-500',
                    joinedAt: '15 Ene 2024'
                },
                {
                    id: 2,
                    name: 'Sofia Rossi',
                    email: 'sofia@lapiazza.com',
                    role: 'Admin',
                    restaurant: 'La Piazza Italiana',
                    status: 'active',
                    lastAccess: 'Hace 5 horas',
                    avatarColor: 'bg-orange-600',
                    joinedAt: '20 Ene 2024'
                },
                {
                    id: 3,
                    name: 'Yuki Tanaka',
                    email: 'yuki@sushimaster.com',
                    role: 'Dueño',
                    restaurant: 'Sushi Master',
                    status: 'active',
                    lastAccess: 'Hace 1 día',
                    avatarColor: 'bg-red-500',
                    joinedAt: '03 Feb 2024'
                },
                {
                    id: 4,
                    name: 'John Smith',
                    email: 'john@burgerkingdom.com',
                    role: 'Dueño',
                    restaurant: 'Burger Kingdom',
                    status: 'active',
                    lastAccess: 'Hace 3 días',
                    avatarColor: 'bg-orange-500',
                    joinedAt: '20 Mar 2024'
                },
                {
                    id: 5,
                    name: 'Carlos',
                    email: 'carlos@tacoloco.com',
                    role: 'Gerente',
                    restaurant: 'Taco Loco',
                    status: 'inactive',
                    lastAccess: 'Hace 1 semana',
                    avatarColor: 'bg-amber-500',
                    joinedAt: '10 Abr 2024'
                }
            ];

            setUsers(mockUsers);
        } catch (error: any) {
            console.error('Error al cargar datos:', error);
            toast.error('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    // Derived stats
    const stats = {
        total: 1284,
        active: 1156,
        connected: 87,
        inactive: 128
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.restaurant.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = filterRole === 'all' || user.role === filterRole;
        return matchesSearch && matchesRole;
    });

    if (loading) {
        return <LoadingSpinner text="Cargando usuarios..." />;
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Usuarios Globales</h1>
                    <p className="text-gray-500 mt-1">Gestión de todos los usuarios de la plataforma</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm">
                        <Download className="w-4 h-4" />
                        Exportar
                    </button>
                    <button
                        onClick={() => toast.success('Crear usuario próximamente')}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium shadow-sm shadow-red-200"
                    >
                        <UserPlus className="w-4 h-4" />
                        Nuevo Usuario
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500 font-medium">Total Usuarios</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.total.toLocaleString()}</h3>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500 font-medium">Usuarios Activos</p>
                    <h3 className="text-2xl font-bold text-green-600 mt-1">{stats.active.toLocaleString()}</h3>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500 font-medium">Conectados Ahora</p>
                    <h3 className="text-2xl font-bold text-blue-600 mt-1">{stats.connected}</h3>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500 font-medium">Inactivos</p>
                    <h3 className="text-2xl font-bold text-red-600 mt-1">{stats.inactive}</h3>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, email o restaurante..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <select
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value)}
                            className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-700 min-w-[180px]"
                        >
                            <option value="all">Todos los roles</option>
                            <option value="Dueño">Dueño</option>
                            <option value="Admin">Admin</option>
                            <option value="Gerente">Gerente</option>
                            <option value="Cajero">Cajero</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuario</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rol</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Restaurante</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Último Acceso</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50/80 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm ${user.avatarColor}`}>
                                                {user.name.split(' ').map((n: string) => n[0]).join('')}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900 text-sm">{user.name}</p>
                                                <p className="text-xs text-gray-500">Desde {user.joinedAt}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            {/* Could add Main/Alt icon if needed */}
                                            <span>{user.email}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${user.role === 'Dueño' ? 'bg-purple-100 text-purple-700' :
                                                user.role === 'Admin' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-gray-100 text-gray-700'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-600">{user.restaurant}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {user.status === 'active' ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-500">{user.lastAccess}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-1 text-blue-600 hover:bg-blue-50 rounded tooltip" title="Ver Detalles">
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button className="p-1 text-purple-600 hover:bg-purple-50 rounded tooltip" title="Permisos">
                                                <Shield className="w-4 h-4" />
                                            </button>
                                            <button className="p-1 text-red-600 hover:bg-red-50 rounded tooltip" title="Suspender">
                                                <Ban className="w-4 h-4" />
                                            </button>
                                            <button className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
