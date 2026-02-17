import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, TrendingUp, TrendingDown, Receipt, Calendar, RefreshCw, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
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

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const tabs = [
    { id: 'overview', label: 'Resumen', icon: BarChart3 },
    { id: 'sales', label: 'Ventas', icon: TrendingUp },
    { id: 'expenses', label: 'Gastos', icon: TrendingDown },
    { id: 'reports', label: 'Reportes', icon: Receipt },
  ];

  const setRange = (type: 'today' | 'week' | 'month') => {
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
      start.setMonth(today.getMonth() - 1);
      label = 'Este Mes';
    }

    setDateRange({ start: start.toISOString(), end, label });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Finanzas</h1>
          <p className="text-slate-600">Control de ingresos, gastos y rentabilidad</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white border border-slate-200 p-1 rounded-xl shadow-sm flex gap-1">
            {(['today', 'week', 'month'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setRange(range)}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${(range === 'today' && dateRange.label === 'Hoy') ||
                    (range === 'week' && dateRange.label === 'Esta Semana') ||
                    (range === 'month' && dateRange.label === 'Este Mes')
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                    : 'text-slate-600 hover:bg-slate-50'
                  }`}
              >
                {range === 'today' ? 'Hoy' : range === 'week' ? 'Semana' : 'Mes'}
              </button>
            ))}
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
              <ReportsTab />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
