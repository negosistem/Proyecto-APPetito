import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CalendarDays, List, Users, Phone, Clock, Plus, Search,
  X, Eye, Edit2, CheckCircle, XCircle, ChevronLeft,
  ChevronRight, Utensils, StickyNote, BarChart2,
  AlertCircle, Filter, Check, ChevronUp, ChevronDown,
  CalendarCheck, UserCheck, TrendingUp, Percent
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useReservations } from '../hooks/useReservations';
import { Reservation, ReservationCreate, ReservationUpdate, ReservationStatus } from '../types/reservation';
import { reservationsService } from '../services/reservationService';

// ─── Types ────────────────────────────────────────────────────────────────────

type SortDir = 'asc' | 'desc';
type ViewMode = 'list' | 'calendar';

interface SortConfig {
  key: keyof Reservation | 'customer_name';
  dir: SortDir;
}

// ─── Config de estados ────────────────────────────────────────────────────────

const estadoConfig: Record<ReservationStatus, { label: string; bg: string; text: string; dot: string; icon: React.ReactNode }> = {
  confirmada: { label: 'Confirmada', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  pendiente:  { label: 'Pendiente',  bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500', icon: <AlertCircle className="w-3.5 h-3.5" /> },
  cancelada:  { label: 'Cancelada',  bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500',    icon: <XCircle className="w-3.5 h-3.5" /> },
  completada: { label: 'Completada', bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500',   icon: <CalendarCheck className="w-3.5 h-3.5" /> },
  no_show: { label: 'No Show', bg: 'bg-gray-100',   text: 'text-gray-700',   dot: 'bg-gray-500',   icon: <XCircle className="w-3.5 h-3.5" /> }
};

const RESTAURANT_CAPACITY = 60;
const ITEMS_PER_PAGE = 8;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatFecha = (s: string) => {
  if (!s) return '';
  const [y, m, d] = s.split('T')[0].split('-');
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${parseInt(d)} ${meses[parseInt(m) - 1]} ${y}`;
};

const extractTime = (isoString?: string) => {
  if (!isoString) return '19:00';
  if (isoString.includes('T')) {
    return isoString.split('T')[1].slice(0, 5);
  }
  return '19:00';
};

const extractDate = (isoString?: string) => {
  if (!isoString) return new Date().toISOString().split('T')[0];
  return isoString.split('T')[0];
};

const TODAY = new Date().toISOString().split('T')[0];

function buildCalendarGrid(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const grid: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) grid.push(null);
  for (let d = 1; d <= daysInMonth; d++) grid.push(d);
  while (grid.length % 7 !== 0) grid.push(null);
  return grid;
}

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAY_NAMES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

// ─── EstadoBadge ──────────────────────────────────────────────────────────────

const EstadoBadge = ({ estado }: { estado: ReservationStatus }) => {
  const cfg = estadoConfig[estado] || estadoConfig['pendiente'];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
};


// ─── StatCard ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, sub, icon, iconBg, iconColor, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    whileHover={{ y: -3, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
    className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-200"
  >
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-500 mb-1 truncate">{title}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
      <div className={`w-11 h-11 ${iconBg} rounded-lg flex items-center justify-center shrink-0 ml-3`}>
        <span className={iconColor}>{icon}</span>
      </div>
    </div>
  </motion.div>
);

// ─── Modal Crear/Editar ────────────────────────────────────────────────────────

interface CreateModalProps {
  onClose: () => void;
  onSave: (r: ReservationCreate, isEditing: boolean, editId?: number) => void;
  editing?: Reservation | null;
  availableTables: any[];
}

const CreateModal: React.FC<CreateModalProps> = ({ onClose, onSave, editing, availableTables }) => {
  const [form, setForm] = useState({
    cliente:  editing?.customer_name  || '',
    telefono: editing?.customer_phone || '',
    fecha:    extractDate(editing?.reservation_date)    || TODAY,
    hora:     extractTime(editing?.reservation_date)    || '19:00',
    personas: editing?.party_size || 2,
    mesa:     editing?.table_name || '',
    estado:   (editing?.status  || 'pendiente') as ReservationStatus,
    notas:    editing?.notes    || '',
  });

  const suggestedMesas = availableTables.filter(m => m.capacity >= form.personas && m.status !== 'OCUPADA');

  const set = (key: string, val: string | number) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cliente || !form.telefono || !form.fecha || !form.hora || !form.mesa) return;
    
    // Find table id
    const selectedTable = availableTables.find(t => t.nombre === form.mesa);
    const tableId = selectedTable ? selectedTable.id : null;

    // Combine date and time
    const combinedDate = new Date(`${form.fecha}T${form.hora}:00`).toISOString();

    const reservationData: ReservationCreate = {
       customer_name: form.cliente,
       customer_phone: form.telefono,
       reservation_date: combinedDate,
       party_size: Number(form.personas),
       id_table: tableId,
       status: form.estado,
       notes: form.notas,
       arrival_time: combinedDate
    };

    onSave(reservationData, !!editing, editing?.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{editing ? 'Editar Reserva' : 'Nueva Reserva'}</h2>
            <p className="text-sm text-slate-500">{editing ? 'Modifica los datos de la reserva' : 'Completa el formulario para crear una reserva'}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Cliente + Teléfono */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre del cliente *</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text" required value={form.cliente}
                  onChange={e => set('cliente', e.target.value)}
                  placeholder="Nombre completo"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Teléfono *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text" required value={form.telefono}
                  onChange={e => set('telefono', e.target.value)}
                  placeholder="+34 600 000 000"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>

          {/* Fecha + Hora */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Fecha *</label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date" required value={form.fecha}
                  onChange={e => set('fecha', e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Hora *</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="time" required value={form.hora}
                  onChange={e => set('hora', e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>

          {/* Personas + Mesa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Número de personas *</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="number" min={1} max={20} required value={form.personas}
                  onChange={e => set('personas', parseInt(e.target.value))}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Mesa asignada *</label>
              <div className="relative">
                <Utensils className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  required value={form.mesa}
                  onChange={e => set('mesa', e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-all appearance-none"
                >
                  <option value="">Seleccionar mesa</option>
                  {availableTables.map(m => (
                    <option key={m.id} value={m.nombre} disabled={m.status === 'OCUPADA' && form.mesa !== m.nombre}>
                      {m.nombre} — {m.capacity} personas {m.status === 'OCUPADA' && form.mesa !== m.nombre ? '(ocupada)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Sugerencia de mesa */}
          {suggestedMesas.length > 0 && !form.mesa && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-orange-50 border border-orange-200 rounded-lg p-3"
            >
              <p className="text-xs font-medium text-orange-700 mb-2">💡 Mesas sugeridas para {form.personas} personas:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedMesas.slice(0, 4).map(m => (
                  <button
                    key={m.id} type="button"
                    onClick={() => set('mesa', m.nombre)}
                    className="px-3 py-1 bg-orange-100 text-orange-700 rounded-md text-xs font-medium hover:bg-orange-200 transition-colors"
                  >
                    {m.nombre} ({m.capacity} pax)
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Estado</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['confirmada', 'pendiente', 'cancelada', 'completada'] as ReservationStatus[]).map(est => {
                const cfg = estadoConfig[est];
                return (
                  <button
                    key={est} type="button"
                    onClick={() => set('estado', est)}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border-2 transition-all ${
                      form.estado === est
                        ? `${cfg.bg} ${cfg.text} border-current`
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {cfg.icon}
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Notas especiales</label>
            <div className="relative">
              <StickyNote className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <textarea
                value={form.notas}
                onChange={e => set('notas', e.target.value)}
                rows={3}
                placeholder="Alergias, ocasiones especiales, preferencias..."
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-all resize-none"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <motion.button
              type="submit"
              whileTap={{ scale: 0.97 }}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-shadow"
            >
              {editing ? 'Guardar cambios' : 'Crear Reserva'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// ─── Modal Detalle ────────────────────────────────────────────────────────────

const DetailModal: React.FC<{ reserva: Reservation; onClose: () => void; onEdit: () => void }> = ({ reserva, onClose, onEdit }) => {
  const [historial, setHistorial] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (reserva.id_customer) {
      reservationsService.getAll({} as any)
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/reservations/?id_customer=${reserva.id_customer}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      })
      .then(r => r.json())
      .then(data => {
         const past = data.filter((x: any) => x.id !== reserva.id).slice(0, 5);
         setHistorial(past);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [reserva]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto z-10"
      >
        {/* Header con gradiente */}
        <div className="bg-gradient-to-br from-orange-500 to-red-500 p-6 rounded-t-2xl text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-3">
                <span className="text-xl font-bold">{reserva.customer_name.charAt(0)}</span>
              </div>
              <h2 className="text-xl font-bold">{reserva.customer_name}</h2>
              <p className="text-orange-100 text-sm mt-0.5">{reserva.customer_phone}</p>
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-4">
            <EstadoBadge estado={reserva.status as ReservationStatus} />
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: <CalendarDays className="w-4 h-4" />, label: 'Fecha', value: formatFecha(reserva.reservation_date) },
              { icon: <Clock className="w-4 h-4" />, label: 'Hora', value: extractTime(reserva.reservation_date) },
              { icon: <Users className="w-4 h-4" />, label: 'Personas', value: `${reserva.party_size} personas` },
              { icon: <Utensils className="w-4 h-4" />, label: 'Mesa', value: reserva.table_name || 'Sin asignar' },
              ...(reserva.arrival_time ? [{ icon: <UserCheck className="w-4 h-4" />, label: 'Llegada', value: extractTime(reserva.arrival_time) }] : []),
            ].map((item, i) => (
              <div key={i} className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  {item.icon}
                  <span className="text-xs">{item.label}</span>
                </div>
                <p className="text-sm font-medium text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Notas */}
          {reserva.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <StickyNote className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-700">Notas especiales</span>
              </div>
              <p className="text-sm text-amber-800">{reserva.notes}</p>
            </div>
          )}

          {/* Historial */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              Historial del cliente
            </h3>
            {loading ? (
              <p className="text-sm text-slate-400 italic text-center py-3">Cargando historial...</p>
            ) : historial.length > 0 ? (
              <div className="space-y-2">
                {historial.map((h, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs text-slate-600">{formatFecha(h.reservation_date)}</span>
                      <span className="text-xs text-slate-400">· {h.party_size} pax</span>
                    </div>
                    <EstadoBadge estado={h.status as ReservationStatus} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic text-center py-3">{reserva.id_customer ? 'Primera reserva del cliente' : 'Cliente sin cuenta registrada'}</p>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">
              Cerrar
            </button>
            <motion.button
              onClick={onEdit} whileTap={{ scale: 0.97 }}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-shadow flex items-center justify-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Editar
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Modal Confirmar Cancelación ──────────────────────────────────────────────

const ConfirmCancelModal: React.FC<{ nombre: string; onConfirm: () => void; onClose: () => void }> = ({ nombre, onConfirm, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    />
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10 text-center"
    >
      <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <XCircle className="w-7 h-7 text-red-500" />
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">¿Cancelar reserva?</h3>
      <p className="text-sm text-slate-500 mb-6">
        Se cancelará la reserva de <span className="font-medium text-slate-700">{nombre}</span>. Esta acción no se puede deshacer.
      </p>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">
          Volver
        </button>
        <motion.button
          onClick={onConfirm} whileTap={{ scale: 0.97 }}
          className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
        >
          Cancelar reserva
        </motion.button>
      </div>
    </motion.div>
  </div>
);

// ─── Vista Calendario ─────────────────────────────────────────────────────────

interface CalendarViewProps {
  reservas: Reservation[];
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
  onDayClick: (day: number) => void;
  selectedDay: number | null;
}

const CalendarView: React.FC<CalendarViewProps> = ({ reservas, year, month, onPrev, onNext, onDayClick, selectedDay }) => {
  const grid = buildCalendarGrid(year, month);

  const getReservasByDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return reservas.filter(r => extractDate(r.reservation_date) === dateStr);
  };

  const selectedDateStr = selectedDay
    ? `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
    : null;
  const selectedReservas = selectedDateStr ? reservas.filter(r => extractDate(r.reservation_date) === selectedDateStr) : [];
  const isToday = (day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` === TODAY;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
    >
      {/* Calendar Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <button onClick={onPrev} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h3 className="font-semibold text-slate-900">{MONTH_NAMES[month]} {year}</h3>
        <button onClick={onNext} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3">
        {/* Grid */}
        <div className="lg:col-span-2 p-4">
          {/* Day names */}
          <div className="grid grid-cols-7 mb-2">
            {DAY_NAMES.map(d => (
              <div key={d} className="text-center text-xs font-medium text-slate-400 py-2">{d}</div>
            ))}
          </div>
          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {grid.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />;
              const dayReservas = getReservasByDay(day);
              const isSelected = selectedDay === day;
              const today = isToday(day);
              return (
                <motion.button
                  key={`day-${i}`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onDayClick(day)}
                  className={`relative p-2 rounded-lg text-sm transition-all min-h-[52px] flex flex-col items-center gap-1 ${
                    isSelected
                      ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-md'
                      : today
                      ? 'bg-orange-50 border-2 border-orange-300 text-orange-700'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="font-medium">{day}</span>
                  {dayReservas.length > 0 && (
                    <div className="flex gap-0.5 flex-wrap justify-center mt-1 w-full max-w-[24px]">
                      {(Object.keys(estadoConfig) as ReservationStatus[]).map(est => {
                        const count = dayReservas.filter(r => r.status === est).length;
                        if (!count) return null;
                        return (
                          <span
                            key={est}
                            className={`w-1.5 h-1.5 rounded-full block basis-1/2 flex-shrink-0 mb-0.5 ${isSelected ? 'bg-white/80' : estadoConfig[est].dot}`}
                          />
                        );
                      })}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-100">
            {(Object.entries(estadoConfig) as [ReservationStatus, typeof estadoConfig[ReservationStatus]][]).map(([est, cfg]) => (
              <div key={est} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                <span className="text-xs text-slate-500">{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Day detail panel */}
        <div className="border-t lg:border-t-0 lg:border-l border-slate-100 p-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">
            {selectedDay
              ? `${selectedDay} de ${MONTH_NAMES[month]}`
              : 'Selecciona un día'}
          </h4>
          {selectedDay ? (
            selectedReservas.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {selectedReservas
                  .sort((a, b) => extractTime(a.reservation_date).localeCompare(extractTime(b.reservation_date)))
                  .map(r => (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <div className={`w-1.5 rounded-full self-stretch ${estadoConfig[r.status as ReservationStatus]?.dot || 'bg-gray-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-900 truncate">{r.customer_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-slate-500">{extractTime(r.reservation_date)}</span>
                          <span className="text-xs text-slate-400">·</span>
                          <span className="text-xs text-slate-500">{r.party_size} pax</span>
                          <span className="text-xs text-slate-400">·</span>
                          <span className="text-xs text-slate-500">{r.table_name || 'Sin Mesa'}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <CalendarDays className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-xs">Sin reservas este día</p>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-slate-300">
              <CalendarDays className="w-8 h-8 mb-2" />
              <p className="text-xs">Haz clic en un día</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function Reservas() {
  const {
    reservations,
    isLoading,
    error,
    filters,
    setFilters,
    createReservation,
    updateReservation,
    changeStatus,
    cancelReservation
  } = useReservations();

  const [mesas, setMesas] = useState<any[]>([]);

  useEffect(() => {
    reservationsService.getTables().then(setMesas).catch(console.error);
  }, []);

  const [view, setView] = useState<ViewMode>('list');
  const [sort, setSort] = useState<SortConfig>({ key: 'reservation_date', dir: 'asc' });
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Calendar
  const [calYear, setCalYear]   = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calDay, setCalDay]     = useState<number | null>(new Date().getDate());

  // Modals
  const [showCreate, setShowCreate]   = useState(false);
  const [editingRes, setEditingRes]   = useState<Reservation | null>(null);
  const [detailRes, setDetailRes]     = useState<Reservation | null>(null);
  const [cancelId, setCancelId]       = useState<number | null>(null);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const hoyReservas   = reservations.filter(r => extractDate(r.reservation_date) === TODAY);
  const confirmadas   = reservations.filter(r => r.status === 'confirmada').length;
  const pendientes    = reservations.filter(r => r.status === 'pendiente').length;
  const canceladas    = reservations.filter(r => r.status === 'cancelada').length;
  const personasHoy   = hoyReservas.reduce((s, r) => s + r.party_size, 0);
  const ocupacion     = Math.round((personasHoy / RESTAURANT_CAPACITY) * 100);

  // ── Filtering & Sorting ────────────────────────────────────────────────────
  const sortedReservations = useMemo(() => {
    let arr = [...reservations];
    arr.sort((a, b) => {
      let av: string | number = '';
      let bv: string | number = '';

      if (sort.key === 'reservation_date') {
        av = new Date(a.reservation_date).getTime();
        bv = new Date(b.reservation_date).getTime();
      } else if (sort.key === 'customer_name') {
        av = a.customer_name || '';
        bv = b.customer_name || '';
      } else {
        av = (a as any)[sort.key] || '';
        bv = (b as any)[sort.key] || '';
      }
      
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [reservations, sort]);

  const totalPages = Math.ceil(sortedReservations.length / ITEMS_PER_PAGE);
  const paginated  = sortedReservations.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const hasFilters = !!(filters.search || filters.fecha || filters.status || filters.party_size);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const setFilter = (key: keyof Filters, val: string) => {
    setFilters(f => ({ ...f, [key]: val }));
    setPage(1);
  };

  const toggleSort = (key: keyof Reservation | 'customer_name') => {
    setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  };

  const SortIcon = ({ col }: { col: keyof Reservation | 'customer_name' }) => {
    if (sort.key !== col) return <ChevronUp className="w-3 h-3 text-slate-300" />;
    return sort.dir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-orange-500" />
      : <ChevronDown className="w-3 h-3 text-orange-500" />;
  };

  const toggleSelect = (id: number) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleSelectAll = () =>
    setSelectedIds(prev => prev.length === paginated.length ? [] : paginated.map(r => r.id));

  const handleBulkAction = async (action: 'confirm' | 'cancel') => {
    const status = action === 'confirm' ? 'confirmada' : 'cancelada';
    try {
      for (const id of selectedIds) {
        await changeStatus(id, status);
      }
      setSelectedIds([]);
      toast.success("Acción masiva completada");
    } catch (e: any) {
      toast.error(e.message || "Error en acción en lote");
    }
  };

  const handleChangeEstado = async (id: number, estado: ReservationStatus) => {
    try {
      await changeStatus(id, estado);
    } catch (e: any) {}
  };

  const handleCancelConfirm = async () => {
    if (cancelId !== null) {
      try {
        await cancelReservation(cancelId);
        setCancelId(null);
      } catch (e) {}
    }
  };

  const handleSave = async (data: ReservationCreate, isEditing: boolean, editId?: number) => {
    try {
      if (isEditing && editId) {
        await updateReservation(editId, data);
        setEditingRes(null);
        toast.success("Reserva actualizada");
      } else {
        await createReservation(data);
        toast.success("Reserva creada con éxito");
      }
      setShowCreate(false);
    } catch (e: any) {
      toast.error(e.message || "La mesa está ocupada u ocurrió un error");
      // Mantenemos modal abierto
    }
  };

  const calPrev = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
    setCalDay(null);
  };
  const calNext = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
    setCalDay(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Error Banner ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Reservas</h1>
          <p className="text-slate-500">Gestión completa de reservas del restaurante</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => { setEditingRes(null); setShowCreate(true); }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-shadow self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          Nueva Reserva
        </motion.button>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard title="Reservas hoy"   value={hoyReservas.length} sub={`De ${reservations.length} totales`} icon={<CalendarDays className="w-5 h-5" />} iconBg="bg-blue-100"   iconColor="text-blue-600"   delay={0.0} />
        <StatCard title="Confirmadas"    value={confirmadas}        icon={<CheckCircle className="w-5 h-5" />}   iconBg="bg-green-100"  iconColor="text-green-600"  delay={0.05} />
        <StatCard title="Pendientes"     value={pendientes}         icon={<AlertCircle className="w-5 h-5" />}   iconBg="bg-yellow-100" iconColor="text-yellow-600" delay={0.1} />
        <StatCard title="Canceladas"     value={canceladas}         icon={<XCircle className="w-5 h-5" />}       iconBg="bg-red-100"    iconColor="text-red-600"    delay={0.15} />
        <StatCard title="Personas hoy"   value={personasHoy}        sub="Comensales confirmados" icon={<Users className="w-5 h-5" />}    iconBg="bg-purple-100" iconColor="text-purple-600" delay={0.2} />
        <StatCard title="Ocupación"      value={`${ocupacion}%`}    sub={`Af. ${personasHoy}/${RESTAURANT_CAPACITY}`} icon={<Percent className="w-5 h-5" />}    iconBg="bg-orange-100" iconColor="text-orange-600" delay={0.25} />
      </div>

      {/* ── Filter Bar ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl shadow-sm border border-slate-200 p-4"
      >
        <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
          <div className="flex items-center gap-2 text-slate-500 shrink-0">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filtros</span>
          </div>

          <div className="flex flex-wrap gap-3 flex-1">
            {/* Search */}
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text" placeholder="Buscar cliente..."
                value={filters.search}
                onChange={e => setFilter('search', e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-all"
              />
            </div>
            {/* Fecha */}
            <input
              type="date" value={filters.fecha}
              onChange={e => setFilter('fecha', e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-all"
            />
            {/* Estado */}
            <select
              value={filters.status}
              onChange={e => setFilter('status', e.target.value as ReservationStatus)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-all"
            >
              <option value="">Todos los estados</option>
              <option value="confirmada">Confirmada</option>
              <option value="pendiente">Pendiente</option>
              <option value="cancelada">Cancelada</option>
              <option value="completada">Completada</option>
            </select>
            {/* Personas */}
            <select
              value={filters.party_size}
              onChange={e => setFilter('party_size', e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition-all"
            >
              <option value="">Todas las personas</option>
              <option value="1">1+ persona</option>
              <option value="2">2+ personas</option>
              <option value="4">4+ personas</option>
              <option value="6">6+ personas</option>
              <option value="8">8+ personas</option>
            </select>
          </div>

          {/* Clear */}
          <AnimatePresence>
            {hasFilters && (
               <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => { setFilters({ search: '', fecha: '', status: '' as any, party_size: '' }); setPage(1); }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
                Limpiar
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── View Toggle & Bulk Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Toggle */}
        <div className="flex items-center bg-slate-100 rounded-lg p-1 w-fit">
          {([{ id: 'list', icon: <List className="w-4 h-4" />, label: 'Lista' }, { id: 'calendar', icon: <CalendarDays className="w-4 h-4" />, label: 'Calendario' }] as const).map(btn => (
            <motion.button
              key={btn.id}
              onClick={() => setView(btn.id)}
              whileTap={{ scale: 0.96 }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                view === btn.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {btn.icon}
              {btn.label}
            </motion.button>
          ))}
        </div>

        {/* Bulk actions */}
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-4 py-2"
            >
              <span className="text-sm font-medium text-orange-700">{selectedIds.length} seleccionadas</span>
              <button onClick={() => handleBulkAction('confirm')} className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-md text-xs font-medium hover:bg-green-200 transition-colors">
                <Check className="w-3 h-3" /> Confirmar
              </button>
              <button onClick={() => handleBulkAction('cancel')} className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-md text-xs font-medium hover:bg-red-200 transition-colors">
                <X className="w-3 h-3" /> Cancelar
              </button>
              <button onClick={() => setSelectedIds([])} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Skeleton Loading Override */}
      {isLoading ? (
        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden min-h-[400px]">
          <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400">
             <div className="w-8 h-8 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin mb-4" />
             <p className="text-sm">Cargando reservas...</p>
          </div>
        </div>
      ) : (
      <>
      {/* ── CALENDAR VIEW ── */}
      <AnimatePresence mode="wait">
        {view === 'calendar' && (
          <motion.div key="calendar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <CalendarView
              reservas={reservations}
              year={calYear} month={calMonth}
              onPrev={calPrev} onNext={calNext}
              onDayClick={d => setCalDay(prev => prev === d ? null : d)}
              selectedDay={calDay}
            />
          </motion.div>
        )}

        {/* ── LIST VIEW ── */}
        {view === 'list' && (
          <motion.div key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {sortedReservations.length === 0 ? (
              /* Empty state */
              <div className="bg-white rounded-xl shadow-md border border-slate-200 py-20 flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <CalendarDays className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-slate-700 font-semibold mb-1">No hay reservas</h3>
                <p className="text-slate-400 text-sm mb-6">
                  {hasFilters ? 'Prueba con otros filtros' : 'Crea la primera reserva para empezar'}
                </p>
                {hasFilters ? (
                  <button onClick={() => { setFilters({ search: '', fecha: '', status: '' as any, party_size: '' }); setPage(1); }} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">
                    Limpiar filtros
                  </button>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowCreate(true)}
                    className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-shadow flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Nueva Reserva
                  </motion.button>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        {/* Checkbox */}
                        <th className="py-3 px-4 w-10">
                          <input
                            type="checkbox"
                            checked={selectedIds.length === paginated.length && paginated.length > 0}
                            onChange={toggleSelectAll}
                            className="rounded accent-orange-500"
                          />
                        </th>
                        {([
                          { key: 'customer_name',  label: 'Cliente' },
                          { key: 'reservation_date',    label: 'Fecha' },
                          { key: 'reservation_date',     label: 'Hora' },
                          { key: 'party_size', label: 'Personas' },
                          { key: 'table_name',     label: 'Mesa' },
                          { key: 'status',   label: 'Estado' },
                        ] as { key: keyof Reservation | 'customer_name'; label: string }[]).map((col, idx) => (
                          <th
                            key={`${col.key}-${idx}`}
                            className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-700 transition-colors select-none"
                            onClick={() => toggleSort(col.key)}
                          >
                            <div className="flex items-center gap-1">
                              {col.label}
                              <SortIcon col={col.key} />
                            </div>
                          </th>
                        ))}
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Notas</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginated.map((r, idx) => (
                        <motion.tr
                          key={r.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.03 }}
                          className={`hover:bg-slate-50 transition-colors group ${selectedIds.includes(r.id) ? 'bg-orange-50/50' : ''}`}
                        >
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(r.id)}
                              onChange={() => toggleSelect(r.id)}
                              className="rounded accent-orange-500"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 bg-gradient-to-br from-orange-100 to-red-100 rounded-full flex items-center justify-center shrink-0">
                                <span className="text-xs font-semibold text-orange-600">{r.customer_name ? r.customer_name.charAt(0) : '?'}</span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-900 whitespace-nowrap">{r.customer_name}</p>
                                <p className="text-xs text-slate-400">{r.customer_phone}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">{formatFecha(r.reservation_date)}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 text-sm text-slate-600">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {extractTime(r.reservation_date)}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 text-sm text-slate-600">
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              {r.party_size}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 text-sm text-slate-600">
                              <Utensils className="w-3.5 h-3.5 text-slate-400" />
                              {r.table_name || 'Sin Mesa'}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <EstadoBadge estado={r.status as ReservationStatus} />
                          </td>
                          <td className="py-3 px-4 max-w-[140px]">
                            {r.notes
                              ? <span className="text-xs text-slate-500 truncate block" title={r.notes}>{r.notes}</span>
                              : <span className="text-xs text-slate-300">—</span>
                            }
                          </td>
                          {/* Actions */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {/* Ver */}
                              <motion.button
                                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                onClick={() => setDetailRes(r)}
                                className="p-1.5 rounded-lg hover:bg-blue-100 text-slate-400 hover:text-blue-600 transition-colors" title="Ver detalle"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </motion.button>
                              {/* Editar */}
                              <motion.button
                                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                onClick={() => { setEditingRes(r); setShowCreate(true); }}
                                className="p-1.5 rounded-lg hover:bg-orange-100 text-slate-400 hover:text-orange-600 transition-colors" title="Editar"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </motion.button>
                              {/* Confirmar */}
                              {r.status === 'pendiente' && (
                                <motion.button
                                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                  onClick={() => handleChangeEstado(r.id, 'confirmada')}
                                  className="p-1.5 rounded-lg hover:bg-green-100 text-slate-400 hover:text-green-600 transition-colors" title="Confirmar"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </motion.button>
                              )}
                              {/* Marcar completada */}
                              {r.status === 'confirmada' && (
                                <motion.button
                                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                  onClick={() => handleChangeEstado(r.id, 'completada')}
                                  className="p-1.5 rounded-lg hover:bg-blue-100 text-slate-400 hover:text-blue-600 transition-colors" title="Marcar como atendida"
                                >
                                  <CalendarCheck className="w-3.5 h-3.5" />
                                </motion.button>
                              )}
                              {/* Cancelar */}
                              {r.status !== 'cancelada' && r.status !== 'completada' && (
                                <motion.button
                                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                  onClick={() => setCancelId(r.id)}
                                  className="p-1.5 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors" title="Cancelar reserva"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </motion.button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                    <p className="text-sm text-slate-500">
                      Mostrando {((page - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(page * ITEMS_PER_PAGE, sortedReservations.length)} de {sortedReservations.length} reservas
                    </p>
                    <div className="flex items-center gap-1">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-2 rounded-lg hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4 text-slate-600" />
                      </motion.button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                        <motion.button
                          key={p}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setPage(p)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                            page === p
                              ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-sm'
                              : 'text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {p}
                        </motion.button>
                      ))}
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="p-2 rounded-lg hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                      </motion.button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      </>
      )}

      {/* ── Modals ── */}
      <AnimatePresence>
        {(showCreate || editingRes) && (
          <CreateModal
            key="create"
            editing={editingRes}
            availableTables={mesas}
            onClose={() => { setShowCreate(false); setEditingRes(null); }}
            onSave={handleSave}
          />
        )}
        {detailRes && (
          <DetailModal
            key="detail"
            reserva={detailRes}
            onClose={() => setDetailRes(null)}
            onEdit={() => { setEditingRes(detailRes); setDetailRes(null); setShowCreate(true); }}
          />
        )}
        {cancelId !== null && (
          <ConfirmCancelModal
            key="cancel"
            nombre={reservations.find(r => r.id === cancelId)?.customer_name || ''}
            onConfirm={handleCancelConfirm}
            onClose={() => setCancelId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
