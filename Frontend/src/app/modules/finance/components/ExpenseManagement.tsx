import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Tag, Calendar, User, DollarSign, Loader2, Search, Filter } from 'lucide-react';
import { financeService, Expense } from '../services/financeService';
import { toast } from 'sonner';

interface Props {
    dateRange: { start: string; end: string; label: string };
    refreshTrigger: number;
}

const CATEGORIES = [
    { label: 'Proveedores', value: 'Proveedores', color: 'bg-blue-100 text-blue-700' },
    { label: 'Nómina', value: 'Nómina', color: 'bg-purple-100 text-purple-700' },
    { label: 'Servicios', value: 'Servicios', color: 'bg-yellow-100 text-yellow-700' },
    { label: 'Mantenimiento', value: 'Mantenimiento', color: 'bg-orange-100 text-orange-700' },
    { label: 'Renta', value: 'Renta', color: 'bg-indigo-100 text-indigo-700' },
    { label: 'Marketing', value: 'Marketing', color: 'bg-pink-100 text-pink-700' },
    { label: 'Otros', value: 'Otros', color: 'bg-slate-100 text-slate-700' },
];

export default function ExpenseManagement({ dateRange, refreshTrigger }: Props) {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [localRefresh, setLocalRefresh] = useState(0);

    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        category: 'Proveedores',
        expense_date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        const fetchExpenses = async () => {
            setLoading(true);
            try {
                const data = await financeService.getExpenses({
                    start_date: dateRange.start,
                    end_date: dateRange.end
                });
                setExpenses(data);
            } catch (error) {
                console.error('Error fetching expenses:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchExpenses();
    }, [dateRange.start, dateRange.end, refreshTrigger, localRefresh]);

    const handleCreateExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.description || !formData.amount) {
            toast.error('Por favor completa todos los campos obligatorios');
            return;
        }

        setSubmitting(true);
        try {
            await financeService.createExpense({
                ...formData,
                amount: parseFloat(formData.amount)
            });
            toast.success('Gasto registrado correctamente');
            setFormData({
                description: '',
                amount: '',
                category: 'Proveedores',
                expense_date: new Date().toISOString().split('T')[0]
            });
            setLocalRefresh(prev => prev + 1);
        } catch (error) {
            toast.error('Error al registrar el gasto');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteExpense = async (id: number) => {
        if (!confirm('¿Estás seguro de eliminar este gasto?')) return;

        try {
            await financeService.deleteExpense(id);
            toast.success('Gasto eliminado');
            setLocalRefresh(prev => prev + 1);
        } catch (error) {
            toast.error('No se pudo eliminar el gasto');
        }
    };

    const filteredExpenses = expenses.filter(exp =>
        exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalExpenses = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Formulario */}
            <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 sticky top-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Plus className="text-orange-500" size={20} />
                        Registrar Nuevo Gasto
                    </h3>

                    <form onSubmit={handleCreateExpense} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700">Descripción</label>
                            <input
                                type="text"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Ej: Pago de luz, Compra de vegetales..."
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all placeholder:text-slate-400"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700">Monto ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    placeholder="0.00"
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700">Categoría</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                                >
                                    {CATEGORIES.map(cat => (
                                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700">Fecha</label>
                            <input
                                type="date"
                                value={formData.expense_date}
                                onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                            />
                        </div>

                        <button
                            disabled={submitting}
                            className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold shadow-lg shadow-orange-200 hover:bg-orange-600 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {submitting ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                            Registrar Gasto
                        </button>
                    </form>
                </div>
            </div>

            {/* Lista de Gastos */}
            <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h3 className="text-lg font-bold text-slate-900">Gastos Registrados</h3>

                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Buscar gastos..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all w-full md:w-48"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="py-20 flex justify-center">
                                <Loader2 className="animate-spin text-slate-300" size={32} />
                            </div>
                        ) : filteredExpenses.length > 0 ? (
                            filteredExpenses.map((expense) => (
                                <div key={expense.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl ${CATEGORIES.find(c => c.value === expense.category)?.color || 'bg-slate-100'}`}>
                                            <Tag size={20} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-900">{expense.description}</div>
                                            <div className="flex items-center gap-3 mt-1">
                                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                                    <Calendar size={12} />
                                                    {new Date(expense.expense_date).toLocaleDateString()}
                                                </div>
                                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                                    <User size={12} />
                                                    ID: {expense.created_by}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className="text-md font-bold text-red-600">-${expense.amount.toFixed(2)}</div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{expense.category}</div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteExpense(expense.id)}
                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-20 text-center text-slate-400 italic">
                                No se encontraron gastos registrados.
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-600 uppercase tracking-widest">Total Gastos</span>
                        <span className="text-xl font-black text-red-600">-${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
