import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, ChefHat, UserCog, User, Edit2, Trash2, X, AlertCircle, CheckCircle, Users } from 'lucide-react';
import { staffService, StaffMember, StaffCreateInput, StaffUpdateInput, StaffStats } from '../services/staffService';
import { rolesService, Role } from '@/app/modules/roles/services/rolesService';
import StatCard from '@/app/shared/components/StatCard';

export default function Staff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [stats, setStats] = useState<StaffStats | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    role_id: 0,
    turno: 'Mañana' as 'Mañana' | 'Tarde' | 'Noche',
    is_active: true
  });

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Load all data in parallel
      const [staffData, rolesData, statsData] = await Promise.all([
        staffService.getAllStaff(),
        rolesService.getAllRoles(),
        staffService.getStaffStats()
      ]);
      setStaff(staffData);
      setRoles(rolesData);
      setStats(statsData);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar datos');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Refresh only stats and staff list (e.g. after CRUD)
  const refreshData = async () => {
    try {
      const [staffData, statsData] = await Promise.all([
        staffService.getAllStaff(),
        staffService.getStaffStats()
      ]);
      setStaff(staffData);
      setStats(statsData);
    } catch (err) {
      console.error('Error refreshing data:', err);
    }
  };

  const handleOpenModal = (member?: StaffMember) => {
    if (member) {
      setEditingStaff(member);
      setFormData({
        nombre: member.nombre,
        email: member.email,
        password: '',
        role_id: member.role_id,
        turno: member.turno || 'Mañana',
        is_active: member.is_active
      });
    } else {
      setEditingStaff(null);
      // Default to first role or 0
      const defaultRoleId = roles.length > 0 ? roles[0].id : 0;
      setFormData({
        nombre: '',
        email: '',
        password: '',
        role_id: defaultRoleId,
        turno: 'Mañana',
        is_active: true
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingStaff(null);
    setFormData({
      nombre: '',
      email: '',
      password: '',
      role_id: 0,
      turno: 'Mañana',
      is_active: true
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate role_id
    if (!formData.role_id) {
      setError('Debes seleccionar un rol');
      return;
    }

    try {
      if (editingStaff) {
        // Update existing staff
        const updateData: StaffUpdateInput = {
          nombre: formData.nombre,
          email: formData.email,
          role_id: formData.role_id,
          turno: formData.turno,
          is_active: formData.is_active
        };

        // Only include password if it was changed
        if (formData.password) {
          updateData.password = formData.password;
        }

        await staffService.updateStaff(editingStaff.id, updateData);
        setSuccessMessage('Empleado actualizado exitosamente');
      } else {
        // Create new staff
        if (!formData.password) {
          setError('La contraseña es requerida para nuevos empleados');
          return;
        }

        const createData: StaffCreateInput = {
          nombre: formData.nombre,
          email: formData.email,
          password: formData.password,
          role_id: formData.role_id,
          turno: formData.turno,
          is_active: formData.is_active
        };

        await staffService.createStaff(createData);
        setSuccessMessage('Empleado creado exitosamente');
      }

      handleCloseModal();
      refreshData(); // Refresh list and stats

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al guardar el empleado');
      console.error('Error saving staff:', err);
    }
  };

  const handleDeactivate = async (id: number, nombre: string) => {
    if (!confirm(`¿Estás seguro de desactivar a ${nombre}?`)) {
      return;
    }

    try {
      setError(null);
      await staffService.deactivateStaff(id);
      setSuccessMessage('Empleado desactivado exitosamente');
      refreshData();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al desactivar el empleado');
      console.error('Error deactivating staff:', err);
    }
  };

  const getRoleIcon = (roleName: string = '') => {
    const lower = (roleName || '').toLowerCase();
    if (lower.includes('admin')) return <UserCog className="w-5 h-5" />;
    if (lower.includes('cocina')) return <ChefHat className="w-5 h-5" />;
    return <User className="w-5 h-5" />;
  };

  const getRoleColor = (roleName: string = '') => {
    const lower = (roleName || '').toLowerCase();
    if (lower.includes('admin')) return 'bg-gradient-to-br from-purple-500 to-indigo-600';
    if (lower.includes('gerente')) return 'bg-gradient-to-br from-blue-500 to-cyan-600';
    if (lower.includes('cocina')) return 'bg-gradient-to-br from-orange-500 to-red-600';
    if (lower.includes('cajero')) return 'bg-gradient-to-br from-emerald-500 to-teal-600';
    return 'bg-gradient-to-br from-slate-500 to-gray-600';
  }

  const getRoleBadge = (roleName: string = '') => {
    const lower = (roleName || '').toLowerCase();
    if (lower.includes('admin')) return 'bg-purple-100 text-purple-700';
    if (lower.includes('cocina')) return 'bg-orange-100 text-orange-700';
    if (lower.includes('mesero')) return 'bg-blue-100 text-blue-700';
    if (lower.includes('cajero')) return 'bg-emerald-100 text-emerald-700';
    return 'bg-slate-100 text-slate-700';
  };

  if (loading && !staff.length) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Staff</h1>
          <p className="text-slate-600">Gestión de personal</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-shadow flex items-center gap-2"
        >
          <UserPlus className="w-5 h-5" />
          Nuevo Miembro
        </motion.button>
      </div>

      {/* Metrics Section */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Staff"
            value={stats.total.toString()}
            icon={<Users className="w-6 h-6 text-white" />}
            color="bg-gradient-to-br from-slate-700 to-slate-900"
            change={0}
          />
          {/* Dynamic Role Stats */}
          {Object.entries(stats.by_role).map(([roleName, count]) => (
            <StatCard
              key={roleName}
              title={(roleName || 'Desconocido').toString()}
              value={count.toString()}
              icon={getRoleIcon(roleName)}
              color={getRoleColor(roleName)}
              change={0}
            />
          ))}
        </div>
      )}

      {/* Success Message */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            {successMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staff && staff.length > 0 && staff.map((miembro, index) => (
          <motion.div
            key={miembro.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => handleOpenModal(miembro)}
            className="bg-white rounded-xl p-6 shadow-md border border-slate-200 hover:shadow-lg transition-shadow cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white text-xl font-semibold">
                {miembro.nombre.charAt(0)}
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${miembro.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                  {miembro.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>

            <h3 className="font-semibold text-slate-900 mb-1">{miembro.nombre}</h3>
            <p className="text-sm text-slate-600 mb-4">{miembro.email}</p>

            <div className="flex items-center justify-between mb-4">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-medium ${getRoleBadge(miembro.role?.name)}`}>
                {getRoleIcon(miembro.role?.name)}
                {miembro.role?.name
                  ? miembro.role.name.charAt(0).toUpperCase() + miembro.role.name.slice(1)
                  : 'Sin Rol'}
              </span>
              {miembro.turno && (
                <span className="text-sm text-slate-600 font-medium">{miembro.turno}</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {(!staff || staff.length === 0) && !loading && (
        <div className="text-center py-12">
          <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No hay personal registrado</h3>
          <p className="text-slate-600 mb-4">Comienza agregando tu primer miembro del equipo</p>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-medium hover:shadow-lg transition-shadow"
          >
            Agregar Miembro
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={handleCloseModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">
                  {editingStaff ? 'Editar Empleado' : 'Nuevo Empleado'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Ej: Juan Pérez"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="ejemplo@appetito.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Contraseña {editingStaff && '(dejar en blanco para no cambiar)'}
                  </label>
                  <input
                    type="password"
                    required={!editingStaff}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Rol
                  </label>
                  <select
                    value={formData.role_id}
                    onChange={(e) => setFormData({ ...formData, role_id: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value={0} disabled>Seleccionar Rol</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>
                        {role.name ? (role.name.charAt(0).toUpperCase() + role.name.slice(1)) : 'Sin Nombre'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Turno
                  </label>
                  <select
                    value={formData.turno}
                    onChange={(e) => setFormData({ ...formData, turno: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="Mañana">Mañana</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Noche">Noche</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-orange-500 border-slate-300 rounded focus:ring-orange-500"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
                    Activo
                  </label>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  {editingStaff && (
                    <button
                      type="button"
                      onClick={() => {
                        handleDeactivate(editingStaff.id, editingStaff.nombre);
                        handleCloseModal();
                      }}
                      className={`px-4 py-2 ${editingStaff.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'} rounded-lg transition-colors`}
                      title={editingStaff.is_active ? "Desactivar empleado" : "Activar empleado"}
                    >
                      {editingStaff.is_active ? <Trash2 className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                    </button>
                  )}
                  <div className="flex-1 flex gap-3">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:shadow-lg transition-shadow font-medium"
                    >
                      {editingStaff ? 'Actualizar' : 'Crear'}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
