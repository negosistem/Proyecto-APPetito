import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Users, Clock, CheckCircle, Plus, AlertCircle, Armchair, Ban, Pencil, ShoppingBag, RefreshCw } from 'lucide-react';
import { tableService, Table, TableStats, TableCreate, TableUpdate } from '../services/tableService';
import { useAuth } from '@/app/modules/auth/context/AuthContext';
import TableModal from '../components/TableModal';
import ActiveOrderModal from '../components/ActiveOrderModal';

export default function Mesas() {
  const { user } = useAuth();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'gerente';

  const [tables, setTables] = useState<Table[]>([]);
  const [stats, setStats] = useState<TableStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);

  // Active Order Modal State
  const [activeOrderModalOpen, setActiveOrderModalOpen] = useState(false);
  const [selectedTableForOrder, setSelectedTableForOrder] = useState<Table | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [tablesData, statsData] = await Promise.all([
        tableService.getTables(),
        tableService.getStats()
      ]);
      setTables(tablesData);
      setStats(statsData);
    } catch (err: any) {
      console.error('Error loading tables:', err);
      setError('Error al cargar la información de las mesas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = () => {
    setEditingTable(null);
    setIsModalOpen(true);
  };

  const handleEdit = (table: Table, e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent opening order modal
    if (!isAdminOrManager) return;
    setEditingTable(table);
    setIsModalOpen(true);
  };

  const handleTableClick = (table: Table) => {
    setSelectedTableForOrder(table);
    setActiveOrderModalOpen(true);
  };

  const handleSave = async (data: TableCreate | TableUpdate) => {
    try {
      if (editingTable) {
        await tableService.updateTable(editingTable.id, data);
      } else {
        await tableService.createTable(data as TableCreate);
      }
      await loadData();
    } catch (err) {
      throw err;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'libre': return 'bg-green-500';
      case 'ocupada': return 'bg-red-500';
      case 'reservada': return 'bg-yellow-500';
      case 'fuera_de_servicio': return 'bg-slate-500';
      default: return 'bg-slate-300';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'libre': return 'bg-green-50 border-green-200 hover:bg-green-100 hover:shadow-md';
      case 'ocupada': return 'bg-red-50 border-red-200 hover:bg-red-100 hover:shadow-md';
      case 'reservada': return 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100 hover:shadow-md';
      case 'fuera_de_servicio': return 'bg-slate-100 border-slate-200 hover:bg-slate-200';
      default: return 'bg-white border-slate-200';
    }
  };

  if (loading && !tables.length) {
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
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Mesas</h1>
            <p className="text-slate-600">Gestión de mesas y ocupación</p>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all text-slate-500 hover:text-orange-600 group"
            title="Refrescar mesas"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-orange-500' : ''}`} />
          </button>
        </div>

        {isAdminOrManager && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleCreate}
            className="p-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all flex items-center justify-center"
            title="Nueva Mesa"
          >
            <Plus className="w-6 h-6" />
          </motion.button>
        )}
      </div>

      {/* Error Message */}
      {
        error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )
      }

      {/* Stats */}
      {
        stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white/50 border-l-4 border-slate-300 rounded-r-xl p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total</p>
                  <p className="text-xl font-black text-slate-900">{stats.total}</p>
                </div>
                <Armchair size={20} className="text-slate-300" />
              </div>
            </div>
            <div className="bg-white/50 border-l-4 border-green-500 rounded-r-xl p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-green-600/50 uppercase tracking-widest mb-0.5">Libres</p>
                  <p className="text-xl font-black text-green-900">{stats.libres}</p>
                </div>
                <CheckCircle size={20} className="text-green-500/30" />
              </div>
            </div>
            <div className="bg-white/50 border-l-4 border-red-500 rounded-r-xl p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-red-600/50 uppercase tracking-widest mb-0.5">Ocupadas</p>
                  <p className="text-xl font-black text-red-900">{stats.ocupadas}</p>
                </div>
                <Users size={20} className="text-red-500/30" />
              </div>
            </div>
            <div className="bg-white/50 border-l-4 border-yellow-500 rounded-r-xl p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-yellow-600/50 uppercase tracking-widest mb-0.5">Reservas</p>
                  <p className="text-xl font-black text-yellow-900">{stats.reservadas}</p>
                </div>
                <Clock size={20} className="text-yellow-500/30" />
              </div>
            </div>
          </div>
        )
      }

      {/* Mesas Grid — Ordered and synchronized by table ID */}
      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
        {Array.from({ length: Math.max(30, tables.length ? Math.max(...tables.map(t => t.id)) : 0) }, (_, i) => i + 1).map((num) => {
          const mesa = tables.find(t => t.id === num);

          // Empty slot — table not registered yet
          if (!mesa) {
            return (
              <div
                key={`slot-${num}`}
                className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center opacity-40"
              >
                <span className="text-slate-300 text-sm font-bold">{num}</span>
              </div>
            );
          }

          return (
            <motion.div
              key={mesa.id}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleTableClick(mesa)}
              className={`relative aspect-square rounded-xl border-2 cursor-pointer transition-all group flex flex-col items-center justify-center text-center p-2
                ${mesa.status === 'libre' ? 'bg-green-50 border-green-300 hover:bg-green-100 hover:shadow-md' :
                  mesa.status === 'ocupada' ? 'bg-red-50 border-red-400 hover:bg-red-100 hover:shadow-md' :
                    mesa.status === 'reservada' ? 'bg-yellow-50 border-yellow-300 hover:bg-yellow-100 hover:shadow-md' :
                      'bg-slate-100 border-slate-300 opacity-60 grayscale'}
              `}
            >
              {/* Edit button */}
              {isAdminOrManager && (
                <button
                  onClick={(e) => handleEdit(mesa, e)}
                  className="absolute top-1 left-1 p-1 bg-white/80 hover:bg-white rounded-full text-slate-400 hover:text-orange-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-20"
                  title="Editar Mesa"
                >
                  <Pencil className="w-2.5 h-2.5" />
                </button>
              )}

              {/* Status dot */}
              <div className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${getStatusColor(mesa.status)} ring-1 ring-white shadow-sm`} />

              {/* Disabled overlay */}
              {!mesa.is_active && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px] rounded-xl z-10">
                  <Ban className="w-4 h-4 text-slate-400" />
                </div>
              )}

              {/* Table number — big and centered */}
              <span className="text-2xl font-black text-slate-800 leading-none">{mesa.number}</span>

              {/* Capacity */}
              <div className="flex items-center gap-0.5 text-slate-400 mt-1">
                <Users className="w-3 h-3" />
                <span className="text-[10px] font-medium">{mesa.capacity}</span>
              </div>

              {/* Status label */}
              <span className={`text-[9px] font-bold uppercase tracking-wide mt-0.5
                ${mesa.status === 'libre' ? 'text-green-600' :
                  mesa.status === 'ocupada' ? 'text-red-600' :
                    mesa.status === 'reservada' ? 'text-yellow-600' : 'text-slate-400'}
              `}>
                {mesa.status === 'libre' ? 'Libre' :
                  mesa.status === 'ocupada' ? 'Ocupada' :
                    mesa.status === 'reservada' ? 'Reservada' : 'N/A'}
              </span>
            </motion.div>
          );
        })}
      </div>


      {/* Admin Table Modal */}
      <TableModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        editingTable={editingTable}
      />

      {/* Active Order Modal */}
      <ActiveOrderModal
        isOpen={activeOrderModalOpen}
        onClose={() => setActiveOrderModalOpen(false)}
        table={selectedTableForOrder}
        onOrderUpdate={loadData}
      />
    </div >
  );
}
