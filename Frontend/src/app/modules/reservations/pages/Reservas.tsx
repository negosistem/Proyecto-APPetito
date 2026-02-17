import React from 'react';
import { motion } from 'motion/react';
import { Calendar as CalendarIcon, Clock, Users, Phone, Plus } from 'lucide-react';

const reservas = [
  { id: 1, cliente: 'Juan Pérez', fecha: '24 Ene 2026', hora: '19:00', personas: 4, telefono: '+34 600 123 456', estado: 'confirmada' },
  { id: 2, cliente: 'María García', fecha: '24 Ene 2026', hora: '20:30', personas: 2, telefono: '+34 610 234 567', estado: 'pendiente' },
  { id: 3, cliente: 'Carlos López', fecha: '25 Ene 2026', hora: '13:00', personas: 6, telefono: '+34 620 345 678', estado: 'confirmada' },
  { id: 4, cliente: 'Ana Martínez', fecha: '25 Ene 2026', hora: '21:00', personas: 3, telefono: '+34 630 456 789', estado: 'confirmada' },
  { id: 5, cliente: 'Pedro Ruiz', fecha: '26 Ene 2026', hora: '19:30', personas: 8, telefono: '+34 640 567 890', estado: 'pendiente' },
];

export default function Reservas() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Reservas</h1>
          <p className="text-slate-600">Gestión de reservas del restaurante</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-shadow flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nueva Reserva
        </motion.button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-md border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Reservas Hoy</p>
              <p className="text-2xl font-bold text-slate-900">12</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-md border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Confirmadas</p>
              <p className="text-2xl font-bold text-slate-900">8</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-md border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Pendientes</p>
              <p className="text-2xl font-bold text-slate-900">4</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Reservas List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Cliente</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Fecha</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Hora</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Personas</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Teléfono</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Estado</th>
              </tr>
            </thead>
            <tbody>
              {reservas.map((reserva, index) => (
                <motion.tr
                  key={reserva.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="py-3 px-4 text-sm font-medium text-slate-900">{reserva.cliente}</td>
                  <td className="py-3 px-4 text-sm text-slate-700">{reserva.fecha}</td>
                  <td className="py-3 px-4 text-sm text-slate-700">{reserva.hora}</td>
                  <td className="py-3 px-4 text-sm text-slate-700">{reserva.personas} personas</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{reserva.telefono}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      reserva.estado === 'confirmada' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {reserva.estado === 'confirmada' ? 'Confirmada' : 'Pendiente'}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
