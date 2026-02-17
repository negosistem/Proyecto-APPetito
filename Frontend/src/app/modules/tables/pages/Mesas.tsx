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
          className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nueva Mesa
        </motion.button>
      )}

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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Total Mesas</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                </div>
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Armchair className="w-6 h-6 text-slate-600" />
                </div>
              </div>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 mb-1">Disponibles</p>
                  <p className="text-2xl font-bold text-green-900">{stats.libres}</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-700 mb-1">Ocupadas</p>
                  <p className="text-2xl font-bold text-red-900">{stats.ocupadas}</p>
                </div>
                <div className="p-2 bg-red-100 rounded-lg">
                  <Users className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-700 mb-1">Reservadas</p>
                  <p className="text-2xl font-bold text-yellow-900">{stats.reservadas}</p>
                </div>
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Mesas Grid */}
      {
        tables.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
            {tables.map((mesa, index) => (
              <motion.div
                key={mesa.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.03 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => handleTableClick(mesa)}
                className={`relative rounded-xl p-5 border-2 cursor-pointer transition-all group ${getStatusBg(mesa.status)} ${!mesa.is_active && 'opacity-60 grayscale'}`}
              >
                {/* Edit Button (Admin Only) */}
                {isAdminOrManager && (
                  <button
                    onClick={(e) => handleEdit(mesa, e)}
                    className="absolute top-2 left-2 p-1.5 bg-white/80 hover:bg-white rounded-full text-slate-500 hover:text-orange-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Editar Mesa"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}

                {/* Status Dot */}
                <div className={`absolute top-3 right-3 w-3 h-3 rounded-full ${getStatusColor(mesa.status)} ring-2 ring-white`} />

                <div className="flex flex-col items-center justify-center text-center min-h-[100px]">
                  {!mesa.is_active && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[1px] rounded-xl z-10">
                      <span className="bg-slate-800 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <Ban className="w-3 h-3" /> Deshabilitada
                      </span>
                    </div>
                  )}

                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    {mesa.location}
                  </span>
                  <h3 className="text-3xl font-bold text-slate-800 mb-2">
                    {mesa.number}
                  </h3>

                  <div className="flex items-center gap-4 text-slate-600 text-sm">
                    <div className="flex items-center gap-1" title="Capacidad">
                      <Users className="w-4 h-4" />
                      <span>{mesa.capacity}</span>
                    </div>
                    {mesa.status === 'reservada' && (
                      <div className="flex items-center gap-1 text-yellow-600">
                        <Clock className="w-4 h-4" />
                        <span>Rsrv</span>
                      </div>
                    )}
                    {mesa.status === 'ocupada' && (
                      <div className="flex items-center gap-1 text-red-600 font-medium">
                        <ShoppingBag className="w-4 h-4" />
                        <span>Pedido</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* QR Indicator */}
                {mesa.qr_code && (
                  <div className="mt-3 pt-3 border-t border-slate-200/50 flex justify-center">
                    <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded-full">
                      QR: {mesa.qr_code.slice(0, 8)}...
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          !loading && (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200 border-dashed">
              <Armchair className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-slate-900 mb-2">No hay mesas registradas</h3>
              <p className="text-slate-500 mb-6">Comienza configurando las mesas de tu restaurante.</p>
              {isAdminOrManager && (
                <button
                  onClick={handleCreate}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Crear Primera Mesa
                </button>
              )}
            </div>
          )
        )
      }

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
