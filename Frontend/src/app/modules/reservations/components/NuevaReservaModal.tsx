import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, Users, Phone, FileText, User, Coffee } from 'lucide-react';
import { ReservationCreate } from '../types/reservation';
import { reservationsService } from '../services/reservationService';

interface NuevaReservaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ReservationCreate) => Promise<void>;
}

export default function NuevaReservaModal({ isOpen, onClose, onSubmit }: NuevaReservaModalProps) {
  const [loading, setLoading] = useState(false);
  const [tables, setTables] = useState<{id: number; nombre: string; capacity: number; status: string}[]>([]);
  const [formData, setFormData] = useState<any>({
    customer_name: '',
    customer_phone: '',
    reservation_date: new Date().toISOString().split('T')[0],
    time: '19:00', // Added temporary key to join with reservation_date before sending
    party_size: 2,
    id_table: null,
    notes: '',
  });

  React.useEffect(() => {
    if (isOpen) {
      reservationsService.getTables()
        .then(data => setTables(data))
        .catch(err => console.error("Error fetching tables", err));
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: (name === 'party_size' || name === 'id_table') ? (value ? parseInt(value) : null) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Convert date + time into a single valid ISO String datetime representing the moment
    // since the API expects `reservation_date: datetime`
    const dateObj = new Date(`${(formData as any).reservation_date}T${(formData as any).time}:00`);
    
    // Clone and transform before sending
    const submissionData = { ...formData, reservation_date: dateObj.toISOString() };
    delete (submissionData as any).time; // Not needed anymore

    try {
      await onSubmit(submissionData);
      onClose();
    } catch (error) {
      // Error handled by hook
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Nueva Reserva</h2>
              <p className="text-sm text-slate-500">Añade los detalles de la nueva reserva</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto">
            <form id="reservation-form" onSubmit={handleSubmit} className="space-y-5">
              
              {/* Cliente */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Cliente *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    name="customer_name"
                    required
                    value={formData.customer_name}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
              </div>

              {/* Fecha y Hora */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="date"
                      name="reservation_date"
                      required
                      value={(formData as any).reservation_date}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hora *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Clock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="time"
                      name="time"
                      required
                      value={(formData as any).time || ''}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Personas y Teléfono */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Personas *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Users className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="number"
                      name="party_size"
                      required
                      min="1"
                      value={formData.party_size}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="tel"
                      name="customer_phone"
                      required
                      value={formData.customer_phone || ''}
                      onChange={handleChange}
                      placeholder="+34 600..."
                      className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Mesa asignada (Opcional) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mesa a Asignar (Opcional)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Coffee className="h-5 w-5 text-slate-400" />
                  </div>
                  <select
                    name="id_table"
                    value={formData.id_table || ''}
                    onChange={handleChange as any}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors appearance-none bg-white"
                  >
                    <option value="">-- Sin mesa asignada --</option>
                    {tables.map(t => (
                      <option 
                        key={t.id} 
                        value={t.id} 
                        disabled={t.status?.toLowerCase() === 'ocupada'}
                      >
                        Mesa {t.nombre} (Cap: {t.capacity}) {t.status?.toLowerCase() === 'ocupada' ? '- Ocupada' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notas Adicionales</label>
                <div className="relative">
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <FileText className="h-5 w-5 text-slate-400" />
                  </div>
                  <textarea
                    name="notes"
                    value={formData.notes || ''}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Alergias, preferencias, etc."
                    className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors resize-none"
                  />
                </div>
              </div>

            </form>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-100 bg-slate-50/50 shrink-0 flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="reservation-form"
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40 transition-shadow flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                'Crear Reserva'
              )}
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
