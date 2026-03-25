import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, ChefHat, UserCog, User, Edit2, Trash2, X, AlertCircle, CheckCircle, Users, ShoppingBag, UtensilsCrossed, Armchair, DollarSign, Calendar, QrCode, Settings, ShieldCheck } from 'lucide-react';
import { staffService, StaffMember, StaffCreateInput, StaffUpdateInput, StaffStats } from '../services/staffService';
import { rolesService, Role } from '@/app/modules/roles/services/rolesService';
import { useAuth } from '@/app/modules/auth/context/AuthContext';
import StatCard from '@/app/shared/components/StatCard';
import CreateStaffForm from '../components/CreateStaffForm';

export default function Staff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [stats, setStats] = useState<StaffStats | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 'access' = Vista principal de Roles/Módulos, 'personal' = Vista de datos sensibles (cédula, contraseña, etc.)
  const [viewMode, setViewMode] = useState<'access' | 'personal'>('access');

  const { user, updateUser } = useAuth();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    telefono: '',
    cedula: '',
    direccion: '',
    foto: '',
    role_id: 0,
    turno: 'Mañana' as 'Mañana' | 'Tarde' | 'Noche',
    modules: [] as string[],
    is_active: true
  });

  // System Modules
  const systemModules = [
    { id: 'cocina', label: 'Cocina', icon: <ChefHat className="w-4 h-4" /> },
    { id: 'pedidos', label: 'Pedidos', icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'menu', label: 'Menú', icon: <UtensilsCrossed className="w-4 h-4" /> },
    { id: 'mesas', label: 'Mesas', icon: <Armchair className="w-4 h-4" /> },
    { id: 'clientes', label: 'Clientes', icon: <Users className="w-4 h-4" /> },
    { id: 'finanzas', label: 'Finanzas', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'reservas', label: 'Reservas', icon: <Calendar className="w-4 h-4" /> },
    { id: 'qr', label: 'Config. QR', icon: <QrCode className="w-4 h-4" /> },
    { id: 'configuracion', label: 'Configuración', icon: <Settings className="w-4 h-4" /> },
  ];

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

  // Global Escape key listener to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showModal) {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal]);

  const handleOpenModal = (member?: StaffMember) => {
    if (member) {
      setViewMode('access'); // Iniciar en la vista principal al editar
      setEditingStaff(member);
      setFormData({
        nombre: member.nombre,
        email: member.email,
        password: '',
        telefono: member.telefono || '',
        cedula: member.cedula || '',
        direccion: member.direccion || '',
        foto: member.foto || '',
        role_id: member.role_id,
        turno: member.turno || 'Mañana',
        modules: member.modules || [],
        is_active: member.is_active
      });
    } else {
      setViewMode('personal'); // Iniciar en datos personales para pedir credenciales primero al crear
      setEditingStaff(null);
      // Default to first role or 0
      const defaultRoleId = roles.length > 0 ? roles[0].id : 0;
      setFormData({
        nombre: '',
        email: '',
        password: '',
        telefono: '',
        cedula: '',
        direccion: '',
        foto: '',
        role_id: defaultRoleId,
        turno: 'Mañana',
        modules: [],
        is_active: true
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingStaff(null);
    setViewMode('access');
    setFormData({
      nombre: '',
      email: '',
      password: '',
      telefono: '',
      cedula: '',
      direccion: '',
      foto: '',
      role_id: 0,
      turno: 'Mañana',
      modules: [],
      is_active: true
    });
  };

  const handleToggleModule = async (moduleId: string) => {
    // If we're creating a new user, just toggle in state
    if (!editingStaff) {
      setFormData(prev => ({
        ...prev,
        modules: prev.modules.includes(moduleId)
          ? prev.modules.filter(m => m !== moduleId)
          : [...prev.modules, moduleId]
      }));
      return;
    }

    // If editing existing user, update directly to API
    try {
      const currentModules = editingStaff.modules || [];
      const newModules = currentModules.includes(moduleId)
        ? currentModules.filter(m => m !== moduleId)
        : [...currentModules, moduleId];

      // Optomistically update UI
      setEditingStaff(prev => prev ? { ...prev, modules: newModules } : prev);
      setFormData(prev => ({ ...prev, modules: newModules }));

      await staffService.updateStaff(editingStaff.id, { modules: newModules });
      refreshData();

      // Si el administrador actual está editando sus propios permisos, actualizamos su sesión en vivo
      if (user && editingStaff.id.toString() === user.id.toString()) {
        updateUser({ modules: newModules });
      }

    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al actualizar permisos de módulo');
      // Rollback optimistic update
      setEditingStaff(prev => prev ? { ...prev, modules: editingStaff.modules } : prev);
      setFormData(prev => ({ ...prev, modules: editingStaff.modules || [] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Front-end validations for required fields since they might be hidden from HTML5 validation
    if (!formData.nombre.trim() || !formData.email.trim() || (!editingStaff && !formData.password.trim())) {
      setError('Por favor completa los datos obligatorios (Nombre, Email, Contraseña).');
      setViewMode('personal'); // Navigate user to the missing fields
      return;
    }

    if (!editingStaff && formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      setViewMode('personal');
      return;
    }

    // Validate role_id
    if (!formData.role_id) {
      setError('Debes seleccionar un rol para este empleado.');
      setViewMode('access');
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
          telefono: formData.telefono,
          cedula: formData.cedula,
          direccion: formData.direccion,
          foto: formData.foto,
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
        const createData: StaffCreateInput = {
          nombre: formData.nombre,
          email: formData.email,
          password: formData.password,
          role_id: formData.role_id,
          turno: formData.turno,
          telefono: formData.telefono,
          cedula: formData.cedula,
          direccion: formData.direccion,
          foto: formData.foto,
          modules: formData.modules,
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
    if (lower.includes('admin')) return <UserCog className="w-4 h-4" />;
    if (lower.includes('cocina')) return <ChefHat className="w-4 h-4" />;
    return <User className="w-4 h-4" />;
  };

  const getRoleColor = (roleName: string = '', isSelected: boolean = false) => {
    const lower = (roleName || '').toLowerCase();
    if (selectedRole !== null && selectedRole !== roleName) {
      return 'bg-slate-100 opacity-60'; // Dim unselected cards
    }
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

  const toggleRoleFilter = (roleName: string) => {
    if (selectedRole === roleName) {
      setSelectedRole(null); // Deselect if already selected
    } else {
      setSelectedRole(roleName);
    }
  };

  if (loading && !staff.length) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // Determine grid columns dynamically based on number of roles + 1 for total
  const numRoleCards = stats ? Object.keys(stats.by_role).length + 1 : 1;
  let gridColsClass = '';
  if (numRoleCards <= 3) gridColsClass = 'grid-cols-2 md:grid-cols-3 lg:grid-cols-3';
  else if (numRoleCards === 4) gridColsClass = 'grid-cols-2 md:grid-cols-4 lg:grid-cols-4';
  else gridColsClass = 'grid-cols-2 md:grid-cols-3 lg:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]';

  // Helper function to format role name for matching
  const formatRoleName = (roleName: string | undefined): string => {
    if (!roleName) return 'Sin Rol';
    // Backend roles are typically lowercase, Stats might have them capitalized
    // We want to match exactly what the StatCard shows, which is the key from `stats.by_role`
    return roleName; // Keep raw for now to match backend stats key if stats.by_role uses raw DB names
  };

  const filteredStaff = staff.filter(miembro => {
    if (!selectedRole) return true;

    // Matcheamos el nombre de rol del miembro (ej. "admin") directamente con selectedRole
    // Nota: depends on how `stats.by_role` keys are formatted. 
    // They are usually identical to DB Role.name strings
    const memberRoleName = miembro.role?.name || 'Sin Rol';
    return memberRoleName === selectedRole;
  });

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
        <div className={`grid ${gridColsClass} gap-3`}>
          <div onClick={() => setSelectedRole(null)} className="cursor-pointer">
            <StatCard
              title="Total Staff"
              value={stats.total.toString()}
              icon={<Users className="w-4 h-4 text-white" />}
              color={selectedRole === null ? "bg-gradient-to-br from-slate-700 to-slate-900" : "bg-slate-100 opacity-60"}
              change={0}
            />
          </div>
          {/* Dynamic Role Stats */}
          {Object.entries(stats.by_role).map(([roleName, count]) => {
            const formattedRoleName = roleName || 'Desconocido';
            return (
              <div
                key={formattedRoleName}
                onClick={() => toggleRoleFilter(formattedRoleName)}
                className={`cursor-pointer transition-all duration-200 ${selectedRole === formattedRoleName ? 'ring-2 ring-orange-400 ring-offset-2 rounded-2xl scale-[1.02]' : ''}`}
              >
                <StatCard
                  title={formattedRoleName.charAt(0).toUpperCase() + formattedRoleName.slice(1)} // Only capitalize the UI title
                  value={count.toString()}
                  icon={getRoleIcon(formattedRoleName)}
                  color={getRoleColor(formattedRoleName, selectedRole === formattedRoleName)}
                  change={0}
                />
              </div>
            );
          })}
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
        {filteredStaff && filteredStaff.length > 0 &&
          filteredStaff.map((miembro, index) => (
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
      {(!filteredStaff || filteredStaff.length === 0) && !loading && (
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
              className="bg-white rounded-xl shadow-xl max-w-4xl w-full p-6 lg:p-8 lg:pb-24 relative overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {editingStaff ? 'Perfil del Empleado' : 'Nuevo Empleado'}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {editingStaff ? 'Gestiona la información y accesos.' : 'Registra un nuevo miembro del staff.'}
                  </p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {editingStaff ? (
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">

                {/* === VISTA PRINCIPAL: ROLES Y ACCESOS === */}
                {viewMode === 'access' && (
                  <div className="flex flex-col lg:flex-row gap-8">
                    {/* Izquierda: Info básica y Rol */}
                    <div className="flex-1 space-y-4">

                      {/* Cabecera de empleado / Foto */}
                      <div className="flex items-center gap-4 mb-2 pb-4 border-b border-slate-100">
                        <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-md">
                          {formData.nombre ? formData.nombre.charAt(0).toUpperCase() : <User className="w-8 h-8" />}
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            required
                            value={formData.nombre}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                            className="w-full text-xl font-bold text-slate-800 bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-orange-500 focus:ring-0 px-0 placeholder-slate-400 transition-colors"
                            placeholder="Nombre Completo"
                          />
                          <p className="text-sm text-slate-500 mt-1">Configuración Operativa</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Rol Asignado
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
                      </div>

                      <div className="pt-4 flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="is_active"
                            checked={formData.is_active}
                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                            className="w-4 h-4 text-orange-500 border-slate-300 rounded focus:ring-orange-500"
                          />
                          <label htmlFor="is_active" className="text-sm font-medium text-slate-700 cursor-pointer">
                            Usuario Activo
                          </label>
                        </div>

                        <button
                          type="button"
                          onClick={() => setViewMode('personal')}
                          className="text-sm text-indigo-600 font-medium hover:text-indigo-800 transition-colors underline underline-offset-2"
                        >
                          Ver Datos Personales
                        </button>
                      </div>
                    </div>

                    {/* Vertical Divider */}
                    <div className="hidden lg:block w-px bg-slate-200"></div>

                    {/* Derecha: Módulos */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-2">
                        <ShieldCheck className="w-5 h-5 text-indigo-500" />
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                          Permisos de Sistema
                        </h3>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 max-h-[300px] overflow-y-auto">
                        {systemModules.map((modulo) => {
                          const isAssigned = formData.modules.includes(modulo.id);
                          return (
                            <div key={modulo.id} className="flex items-center justify-between p-2 hover:bg-white rounded-lg transition-colors group">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${isAssigned ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                  {modulo.icon}
                                </div>
                                <span className={`font-medium ${isAssigned ? 'text-slate-900' : 'text-slate-500'}`}>
                                  {modulo.label}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleToggleModule(modulo.id)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${isAssigned ? 'bg-indigo-500' : 'bg-slate-200'}`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAssigned ? 'translate-x-6' : 'translate-x-1'}`}
                                />
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {editingStaff && (
                        <p className="text-xs text-slate-500 text-center mt-2">
                          *Los cambios de módulos se guardan automáticamente.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* === VISTA SECUNDARIA: DATOS PERSONALES === */}
                {viewMode === 'personal' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => setViewMode('access')}
                          className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium text-sm flex items-center gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                          <span className="hidden sm:inline">Rol y Accesos</span>
                        </button>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">Datos Personales y de Contacto</h3>
                          <p className="text-sm text-slate-500">Administra la información privada del empleado.</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Correo y Contraseña */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-widest">Credenciales</h4>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Email
                          </label>
                          <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                            placeholder="ejemplo@appetito.com"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Contraseña
                            {editingStaff && <span className="text-xs font-normal text-slate-400 ml-2">(vacío para no cambiar)</span>}
                          </label>
                          <input
                            type="password"
                            required={!editingStaff}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                            placeholder="Mínimo 6 caracteres"
                            minLength={6}
                          />
                        </div>
                      </div>

                      {/* Info Personal */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-orange-600 uppercase tracking-widest">Identidad</h4>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Nombre Completo
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.nombre}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-colors"
                            placeholder="Ej: Juan Pérez"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Cédula / ID
                            </label>
                            <input
                              type="text"
                              value={formData.cedula}
                              onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                              className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-colors"
                              placeholder="Ej: 000-0000000-0"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Teléfono
                            </label>
                            <input
                              type="tel"
                              value={formData.telefono}
                              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                              className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-colors"
                              placeholder="Ej: 809-123-4567"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Dirección (Ocupa las dos columnas) */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Dirección Domiciliaria
                        </label>
                        <textarea
                          rows={2}
                          value={formData.direccion}
                          onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:bg-white transition-colors resize-none"
                          placeholder="Calle, número, sector, ciudad..."
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons (Full Width at bottom) */}
                <div className="lg:w-full lg:col-span-2 flex gap-3 pt-6 mt-4 border-t border-slate-200 lg:absolute lg:bottom-6 lg:right-6 lg:left-6 lg:pt-0 lg:border-t-0 lg:mt-0 lg:justify-end">
                  {editingStaff && (
                    <button
                      type="button"
                      onClick={() => {
                        handleDeactivate(editingStaff.id, editingStaff.nombre);
                        handleCloseModal();
                      }}
                      className={`px-4 py-2 ${editingStaff.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'} rounded-lg transition-colors flex items-center gap-2`}
                      title={editingStaff.is_active ? "Desactivar empleado" : "Activar empleado"}
                    >
                      {editingStaff.is_active ? <Trash2 className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                      <span className="hidden sm:inline">
                        {editingStaff.is_active ? 'Desactivar' : 'Activar'}
                      </span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:shadow-lg transition-shadow font-medium"
                  >
                    Actualizar Perfil
                  </button>
                </div>
              </form>
              ) : (
                <CreateStaffForm 
                  onSuccess={() => {
                    handleCloseModal();
                    refreshData();
                    setSuccessMessage('Empleado creado exitosamente');
                    setTimeout(() => setSuccessMessage(null), 3000);
                  }}
                  onCancel={handleCloseModal}
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
