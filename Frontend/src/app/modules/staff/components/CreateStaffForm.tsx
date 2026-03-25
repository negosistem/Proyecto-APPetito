import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { staffService } from '@/app/modules/staff/services/staffService';
import { rolesService, Role } from '@/app/modules/roles/services/rolesService';
import { User, ShieldCheck, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const NOMBRE_A_TIPO: Record<string, string> = {
  "Admin":   "admin",
  "Gerente": "gerente",
  "Cajero":  "cajero",
  "Mesero":  "mesero",
  "Cocina":  "cocina",
};

const derivarTipo = (nombreRol: string): string => {
  return NOMBRE_A_TIPO[nombreRol] ?? "mesero"; // fallback seguro
};

const ROLE_NAMES: Record<string, string> = {
  admin: "Admin",
  gerente: "Gerente",
  cajero: "Cajero",
  mesero: "Mesero",
  cocina: "Cocina",
};

const ROLE_DEFAULTS: Record<string, Record<string, boolean>> = {
  admin:   { dashboard:true,  orders:true,  tables:true,  kitchen:true,  products:true,  customers:true,  payments:true,  finances:true,  staff:true,  settings:true  },
  gerente: { dashboard:true,  orders:true,  tables:true,  kitchen:false, products:true,  customers:true,  payments:false, finances:true,  staff:true,  settings:false },
  cajero:  { dashboard:false, orders:true,  tables:true,  kitchen:false, products:false, customers:true,  payments:true,  finances:false, staff:false, settings:false },
  mesero:  { dashboard:false, orders:true,  tables:true,  kitchen:false, products:false, customers:true,  payments:false, finances:false, staff:false, settings:false },
  cocina:  { dashboard:false, orders:false, tables:false, kitchen:true,  products:false, customers:false, payments:false, finances:false, staff:false, settings:false },
};

const PERM_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  orders:    "Pedidos",
  tables:    "Mesas",
  kitchen:   "Cocina",
  products:  "Productos",
  customers: "Clientes",
  payments:  "Pagos",
  finances:  "Finanzas",
  staff:     "Personal",
  settings:  "Configuración",
};

const staffSchema = z.object({
  nombre: z.string().min(2, "Mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  tipo_empleado: z.string(),
  id_rol: z.number({ required_error: "Debes seleccionar un rol" }).refine(val => val !== 0, {
    message: "Debes seleccionar un rol",
  }),
  turno: z.enum(["Mañana", "Tarde", "Noche"]).optional().default("Mañana"),
  telefono: z.string().optional(),
  cedula: z.string().optional(),
  direccion: z.string().optional(),
  is_active: z.boolean().default(true),
  permissions: z.record(z.string(), z.boolean()).optional(),
});

type StaffFormData = z.infer<typeof staffSchema>;

interface CreateStaffFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CreateStaffForm({ onSuccess, onCancel }: CreateStaffFormProps) {
  const [rolesDisponibles, setRolesDisponibles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [permisos, setPermisos] = useState<Record<string, boolean>>(ROLE_DEFAULTS["mesero"]);
  const [permisosEstado, setPermisosEstado] = useState<"predefinido" | "personalizado">("predefinido");
  const [showPermisos, setShowPermisos] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors }
  } = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema) as any,
    defaultValues: {
      nombre: '',
      email: '',
      password: '',
      tipo_empleado: 'mesero',
      id_rol: 0,
      turno: 'Mañana',
      telefono: '',
      cedula: '',
      direccion: '',
      is_active: true
    }
  });

  const watchIdRol = watch('id_rol');

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const rolesData = await rolesService.getAllRoles();
        setRolesDisponibles(rolesData);
      } catch (err) {
        console.error("Error al cargar roles", err);
      } finally {
        setLoadingRoles(false);
      }
    };
    fetchRoles();
  }, []);

  // Cuando cambia id_rol manualmente → cargar permisos del rol desde la API
  useEffect(() => {
    const rolId = watchIdRol;
    if (rolId === 0) return;
    const rolSeleccionado = rolesDisponibles.find(r => r.id === rolId);
    if (!rolSeleccionado) return;
    
    // Derivar tipo_empleado
    const tipo = derivarTipo(rolSeleccionado.name || "");
    setValue("tipo_empleado", tipo);
    
    // Setear Permisos
    if (rolSeleccionado.permissions && Object.keys(rolSeleccionado.permissions).length > 0) {
      const formPerms = { ...rolSeleccionado.permissions };
      delete formPerms.all;
      setPermisos(formPerms as Record<string, boolean>);
      setPermisosEstado("predefinido");
    } else {
      if (ROLE_DEFAULTS[tipo]) {
        setPermisos(ROLE_DEFAULTS[tipo]);
        setPermisosEstado("predefinido");
      }
    }
  }, [watchIdRol, rolesDisponibles, setValue]);

  const onSubmit = async (data: StaffFormData) => {
    setSubmitting(true);
    setGlobalError(null);
    try {
      await staffService.createStaff({
        nombre: data.nombre,
        email: data.email,
        password: data.password,
        tipo_empleado: data.tipo_empleado,
        id_rol: data.id_rol,
        turno: data.turno,
        telefono: data.telefono,
        cedula: data.cedula,
        direccion: data.direccion,
        is_active: data.is_active,
        modules: [],
        permissions: permisos
      } as any);
      onSuccess();
    } catch (err: any) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      
      if (status === 409) {
        setError("email", { message: "Este email ya está registrado" });
      } else if (status === 403) {
        setError("id_rol", { message: "Rol no válido para esta empresa" });
      } else if (status === 422) {
        setGlobalError("Error de validación en los datos enviados");
      } else {
        setGlobalError(detail || "Error al crear el empleado");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const selectedRoleData = rolesDisponibles.find(r => r.id === watchIdRol);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {globalError && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
          {globalError}
        </div>
      )}
      
      <div className="flex items-center gap-4 mb-2 pb-4 border-b border-slate-100">
        <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-md">
          <User className="w-8 h-8" />
        </div>
        <div className="flex-1">
          <input
            {...register("nombre")}
            className="w-full text-xl font-bold text-slate-800 bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-orange-500 focus:ring-0 px-0 placeholder-slate-400 transition-colors"
            placeholder="Nombre Completo"
          />
          {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-widest">Credenciales</h4>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              {...register("email")}
              type="email"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
              placeholder="ejemplo@appetito.com"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
            <input
              {...register("password")}
              type="password"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
              placeholder="Mínimo 8 caracteres"
            />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-bold text-orange-600 uppercase tracking-widest">Rol y Perfil</h4>
          
          <input type="hidden" {...register("tipo_empleado")} />
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rol de Sistema</label>
            <select
              {...register("id_rol", { valueAsNumber: true })}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-colors"
              disabled={loadingRoles}
            >
              <option value={0} disabled>Seleccionar Rol</option>
              {rolesDisponibles.map(role => (
                <option key={role.id} value={role.id}>
                  {role.name ? (role.name.charAt(0).toUpperCase() + role.name.slice(1)) : 'Sin Nombre'}
                </option>
              ))}
            </select>
            {errors.id_rol && <p className="text-red-500 text-xs mt-1">{errors.id_rol.message}</p>}
            
            {/* Toggles de Permisos Colapsable */}
            <div className="border border-slate-200 rounded-lg overflow-hidden mt-3">
              {/* Header del panel */}
              <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Permisos del rol</span>
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${
                    permisosEstado === "predefinido"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-orange-100 text-orange-700"
                  }`}>
                    {permisosEstado === "predefinido" ? "Predefinido" : "Personalizado"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPermisos(prev => !prev)}
                  className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded focus:outline-none"
                  title={showPermisos ? "Ocultar permisos" : "Ver permisos"}
                >
                  {showPermisos ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Lista de toggles */}
              {showPermisos && (
                <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                  {Object.entries(PERM_LABELS).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-sm text-slate-700">{label}</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={permisos[key]}
                        onClick={() => {
                          setPermisos(prev => ({ ...prev, [key]: !prev[key] }));
                          setPermisosEstado("personalizado");
                        }}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                          permisos[key] ? "bg-orange-500" : "bg-slate-300"
                        }`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                          permisos[key] ? "translate-x-4" : "translate-x-1"
                        }`} />
                      </button>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-6 mt-4 border-t border-slate-200 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:shadow-lg transition-shadow font-medium disabled:opacity-70 flex items-center gap-2"
        >
          {submitting ? 'Creando...' : 'Crear Empleado'}
        </button>
      </div>
    </form>
  );
}
