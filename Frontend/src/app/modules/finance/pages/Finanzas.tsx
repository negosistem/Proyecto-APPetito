import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, TrendingUp, TrendingDown, Receipt, Calendar, RefreshCw, BarChart3 } from 'lucide-react';
import MetricsOverview from '../components/MetricsOverview';
import FinancialBalance from '../components/FinancialBalance';
import PerformanceCharts from '../components/PerformanceCharts';
import VentasTab from '../components/VentasTab';
import ExpenseManagement from '../components/ExpenseManagement';
import ReportsTab from '../components/ReportsTab';

type TabType = 'overview' | 'sales' | 'expenses' | 'reports';

export default function Finanzas() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
    end: new Date().toISOString(),
    label: 'Hoy'
  });

  // Custom range inputs (controlled independently)
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const handleRefresh = () => setRefreshTrigger(prev => prev + 1);

  const tabs = [
    { id: 'overview', label: 'Resumen', icon: BarChart3 },
    { id: 'sales', label: 'Ventas', icon: TrendingUp },
    { id: 'expenses', label: 'Gastos', icon: TrendingDown },
    { id: 'reports', label: 'Reportes', icon: Receipt },
  ];

  const setRange = (type: 'today' | 'week' | 'month' | 'custom') => {
    if (type === 'custom') {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
    const today = new Date();
    const end = new Date().toISOString();
    let start = new Date();
    let label = 'Hoy';

    if (type === 'today') {
      start.setHours(0, 0, 0, 0);
      label = 'Hoy';
    } else if (type === 'week') {
      start.setDate(today.getDate() - 7);
      label = 'Esta Semana';
    } else if (type === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      label = 'Este Mes';
    }

    setDateRange({ start: start.toISOString(), end, label });
  };

  const applyCustomRange = () => {
    if (!customStart || !customEnd) return;
    setDateRange({
      start: new Date(customStart).toISOString(),
      end: new Date(customEnd + 'T23:59:59').toISOString(),
      label: `${customStart} → ${customEnd}`
    });
  };

  const activePreset = !showCustom
    ? (['today', 'week', 'month'] as const).find(t => {
      if (t === 'today') return dateRange.label === 'Hoy';
      if (t === 'week') return dateRange.label === 'Esta Semana';
      if (t === 'month') return dateRange.label === 'Este Mes';
      return false;
    })
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Finanzas</h1>
          <p className="text-slate-600">Control de ingresos, gastos y rentabilidad</p>
        </div>

        <div className="flex flex-wrap items-start gap-3">
          {/* Quick range buttons */}
          <div className="bg-white border border-slate-200 p-1 rounded-xl shadow-sm flex gap-1">
            {(['today', 'week', 'month'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setRange(range)}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${activePreset === range
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                  : 'text-slate-600 hover:bg-slate-50'
                  }`}
              >
                {range === 'today' ? 'Hoy' : range === 'week' ? 'Semana' : 'Mes'}
              </button>
            ))}
            {/* Custom button */}
            <button
              onClick={() => setRange('custom')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all flex items-center gap-1 ${showCustom
                ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                : 'text-slate-600 hover:bg-slate-50'
                }`}
            >
              <Calendar size={14} />
              Custom
            </button>
          </div>

          <button
            onClick={handleRefresh}
            className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all text-slate-500 hover:text-orange-600 group"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-5 h-5 ${refreshTrigger > 0 ? 'group-active:animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Custom date range picker */}
      <AnimatePresence>
        {showCustom && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white border border-orange-200 rounded-xl px-4 py-3 flex flex-wrap items-end gap-4 shadow-sm">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Desde</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Hasta</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <button
                onClick={applyCustomRange}
                disabled={!customStart || !customEnd}
                className="px-5 py-2 bg-orange-500 text-white rounded-lg font-semibold text-sm hover:bg-orange-600 disabled:opacity-40 transition-all"
              >
                Aplicar
              </button>
              <span className="text-xs text-slate-400 italic self-center">
                Período actual: <strong>{dateRange.label}</strong>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto pb-2 gap-2 no-scrollbar">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as TabType)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap border ${activeTab === id
              ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
              : 'bg-white border-slate-200 text-slate-500 hover:border-orange-200 hover:text-orange-600'
              }`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="min-h-[600px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <MetricsOverview dateRange={dateRange} refreshTrigger={refreshTrigger} />
                <FinancialBalance dateRange={dateRange} refreshTrigger={refreshTrigger} />
                <PerformanceCharts dateRange={dateRange} refreshTrigger={refreshTrigger} />
              </div>
            )}

            {activeTab === 'sales' && (
              <VentasTab dateRange={dateRange} refreshTrigger={refreshTrigger} />
            )}

            {activeTab === 'expenses' && (
              <ExpenseManagement dateRange={dateRange} refreshTrigger={refreshTrigger} />
            )}

            {activeTab === 'reports' && (
              <ReportsTab dateRange={dateRange} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

