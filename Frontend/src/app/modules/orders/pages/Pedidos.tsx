import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Filter, Eye, Printer, X, Loader2, Minus, Trash, RefreshCw, CreditCard, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { orderService, Order, OrderStatus } from '../services/orderService';
import { tableService, Table } from '../../tables/services/tableService';
import { menuService, Product } from '../../menu/services/menuService';
import { customerService, Customer } from '../../customers/services/customerService';
import { settingsService } from '../../settings/services/settingsService';
import { PaymentModal } from '../components/PaymentModal';
import { Receipt as ReceiptComponent } from '../components/Receipt';
import { Receipt as ReceiptData } from '../../payments/services/paymentService';
import { CustomerCreateModal } from '../components/CustomerCreateModal';
import { OrderDetailModal } from '../components/OrderDetailModal';
import { ProductCustomizationModal, CustomizedProduct } from '../components/ProductCustomizationModal';
import { formatNumber } from '@/lib/formatNumber';

export default function Pedidos() {
  const [pedidos, setPedidos] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const limit = 15;

  // Data for creation modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tables, setTables] = useState<Table[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [taxRate, setTaxRate] = useState(18); // Default 18%

  // Category and product selection
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [categories, setCategories] = useState<string[]>([]);

  // Search within modal
  const [productSearch, setProductSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  // Payment states
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Order Detail States
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderDetailModalOpen, setIsOrderDetailModalOpen] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState<number | null>(null);

  // Customization Modal States
  const [isCustomizationModalOpen, setIsCustomizationModalOpen] = useState(false);
  const [selectedProductForCustomization, setSelectedProductForCustomization] = useState<Product | null>(null);

  // New Order State
  const [newOrder, setNewOrder] = useState({
    customer_name: '',
    customer_id: null as number | null,
    table_id: 'null', // 'null' for Takeaway, number for specific table
    items: [] as any[],
    apply_tip: false,
    aplica_impuesto: true
  });
  const [isParaLlevar, setIsParaLlevar] = useState(false);

  // ── ESC to close modal ──────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  // ── Block body scroll when modal is open ───────────
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isModalOpen]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [ordersResponse, tablesData, productsData, customersData, companySettings] = await Promise.all([
        orderService.getOrders(currentPage, limit),
        tableService.getTables(),
        menuService.getProducts(),
        customerService.getCustomers(),
        settingsService.getCompanySettings()
      ]);

      setPedidos(ordersResponse.items);
      setTotalPages(ordersResponse.pages);
      setTotalOrders(ordersResponse.total);

      setTables(tablesData);
      setProducts(productsData);
      setCustomers(customersData || []);
      setTaxRate(Number(companySettings.tax_rate));

      // Extract unique categories
      const uniqueCategories = Array.from(new Set(productsData.map(p => p.category)));
      setCategories(['Todas', ...uniqueCategories]);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentPage]);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newOrder.items.length === 0) {
      toast.error('Debes agregar al menos un producto');
      return;
    }

    // Validación: Se requiere Cliente o Mesa
    if (!newOrder.customer_name && (!newOrder.table_id || newOrder.table_id === 'null')) {
      toast.error('Debes seleccionar un Cliente o una Mesa para crear el pedido.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customer_name: newOrder.customer_name || null,
        customer_id: newOrder.customer_id,
        table_id: (newOrder.table_id === 'null' || newOrder.table_id === 'para_llevar') ? null : parseInt(newOrder.table_id),
        items: newOrder.items.map((item: any) => ({
          product_id: item.product_id || item.id,
          quantity: item.quantity,
          notes: item.notes || null,
          extras_ids: item.extras_ids || [],
          removed_ingredient_ids: item.removed_ingredient_ids || []
        })),
        apply_tip: newOrder.apply_tip,
        aplica_impuesto: newOrder.aplica_impuesto
      };
      await orderService.createOrder(payload);
      toast.success('✅ Orden creada y enviada a cocina');
      setIsModalOpen(false);
      setNewOrder({ customer_name: '', customer_id: null, table_id: 'null', items: [], apply_tip: false, aplica_impuesto: true });
      setIsParaLlevar(false);
      setSelectedCategory('Todas');
      fetchData();
    } catch (error: any) {
      const detail = error?.response?.data?.detail || error?.message || 'Error al crear el pedido';
      toast.error(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProductClick = (product: Product) => {
    setSelectedProductForCustomization(product);
    setIsCustomizationModalOpen(true);
  };

  const handleAddCustomizedProduct = (customized: CustomizedProduct) => {
    const defaultNotes = customized.notes || undefined;
    
    // Check if identical item already exists to increment quantity
    const existingItemIndex = newOrder.items.findIndex((item: any) => {
       const sameId = (item.product_id || item.id) === customized.product.id;
       const sameNotes = item.notes === defaultNotes;
       const sameExtras = JSON.stringify(item.extras_ids || []) === JSON.stringify(customized.extras_ids || []);
       const sameRemoved = JSON.stringify(item.removed_ingredient_ids || []) === JSON.stringify(customized.removed_ingredient_ids || []);
       return sameId && sameNotes && sameExtras && sameRemoved;
    });

    if (existingItemIndex >= 0) {
      setNewOrder(prev => {
        const items = [...prev.items];
        items[existingItemIndex].quantity += customized.quantity;
        return { ...prev, items };
      });
    } else {
      setNewOrder(prev => ({
        ...prev,
        items: [...prev.items, {
          id: Date.now() + Math.random(), // Temp ID
          product_id: customized.product.id,
          name: customized.product.name,
          quantity: customized.quantity,
          price: customized.final_price,
          notes: defaultNotes,
          extras_ids: customized.extras_ids,
          removed_ingredient_ids: customized.removed_ingredient_ids,
          extras_names: customized.extras_names,
          removed_ingredient_names: customized.removed_ingredient_names
        }]
      }));
    }
  };

  const updateItemQuantity = (id: number, delta: number) => {
    setNewOrder(prev => ({
      ...prev,
      items: prev.items.map((i: any) => {
        if (i.id === id) {
          const newQty = Math.max(1, i.quantity + delta);
          return { ...i, quantity: newQty };
        }
        return i;
      })
    }));
  };

  const removeItemFromOrder = (id: number) => {
    setNewOrder(prev => ({
      ...prev,
      items: prev.items.filter((i: any) => i.id !== id)
    }));
  };

  const handleStatusUpdate = async (id: number, newStatus: OrderStatus) => {
    try {
      await orderService.updateOrder(id, { status: newStatus });
      toast.success(`Estado del pedido #${id} actualizado a ${newStatus}`);
      fetchData();
    } catch (error) {
      toast.error('Error al actualizar estado');
    }
  };

  const handleOpenPayment = (order: Order) => {
    setSelectedOrderForPayment(order);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    setIsPaymentModalOpen(false);
    fetchData(); // Refresh to show 'paid' status
  };

  const handleCustomerCreated = (customer: Customer) => {
    setNewOrder(prev => ({
      ...prev,
      customer_name: customer.name,
      customer_id: customer.id
    }));
    setCustomers(prev => [...prev, customer]);
    setCustomerSearch('');
    setShowCustomerResults(false);
  };

  const handleOrderClick = async (order: Order) => {
    try {
      setIsLoadingDetail(order.id);
      const detail = await orderService.getOrder(order.id);
      setSelectedOrder(detail);
      setIsOrderDetailModalOpen(true);
    } catch (error) {
      toast.error('Error al obtener el detalle del pedido');
    } finally {
      setIsLoadingDetail(null);
    }
  };

  // Local Search (within the current page)
  const filteredPedidos = pedidos.filter(pedido =>
    pedido.id.toString().includes(searchTerm) ||
    (pedido.customer_name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const filteredProducts = products
    .filter(p => selectedCategory === 'Todas' || p.category === selectedCategory)
    .filter(p =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(productSearch.toLowerCase())
    );

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  // Sort tables: available first (ascending), occupied last (ascending within their group)
  const sortedTables = [...tables].sort((a, b) => {
    const aOccupied = a.status === 'ocupada';
    const bOccupied = b.status === 'ocupada';
    if (aOccupied !== bOccupied) return aOccupied ? 1 : -1; // occupied goes to bottom
    return Number(a.number) - Number(b.number);              // ascending within each group
  });

  // Calculate order totals
  const subtotal = newOrder.items.reduce((acc: number, i: any) => acc + (i.price * i.quantity), 0);
  const tax = newOrder.aplica_impuesto ? subtotal * (taxRate / 100) : 0;
  const tip = newOrder.apply_tip ? subtotal * 0.10 : 0;
  const total = subtotal + tax + tip;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Pedidos</h1>
          <p className="text-slate-600">Gestión completa de pedidos</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-shadow flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nuevo Pedido
        </motion.button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar pedido..."
            className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
          />
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={fetchData}
          disabled={isLoading}
          className="px-4 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 group"
        >
          <RefreshCw className={`w-5 h-5 text-slate-500 group-hover:text-orange-500 transition-colors ${isLoading ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium text-slate-700">Refrescar</span>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="px-4 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
        >
          <Filter className="w-5 h-5" />
          Filtros
        </motion.button>
      </div>

      {/* Orders Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Pedido</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Fecha</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Cliente</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Mesa</th>
                  <th className="py-3 px-4 text-sm font-semibold text-slate-700 text-right">Items</th>
                  <th className="py-3 px-4 text-sm font-semibold text-slate-700 text-right">Total</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredPedidos.map((pedido, index) => (
                  <motion.tr
                    key={pedido.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleOrderClick(pedido)}
                    className={`border-b border-slate-100 transition-colors cursor-pointer ${isLoadingDetail === pedido.id ? 'opacity-50 bg-slate-100 pointer-events-none' : 'hover:bg-slate-50'
                      }`}
                  >
                    <td className="py-3 px-4 text-sm font-medium text-slate-900">#{pedido.id.toString().padStart(4, '0')}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{new Date(pedido.created_at).toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-slate-700">{pedido.customer_name || 'Sin nombre'}</td>
                    <td className="py-3 px-4 text-sm text-slate-700">
                      {pedido.table_id ? `Mesa ${tables.find(t => t.id === pedido.table_id)?.number || pedido.table_id}` : 'Para llevar'}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700 text-right">{pedido.items.length} items</td>
                    <td className="py-3 px-4 text-sm font-medium text-slate-900 text-right">{formatNumber(pedido.total)}</td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {pedido.status === 'served' && (
                          <button
                            onClick={() => handleOpenPayment(pedido)}
                            className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors"
                            title="Cobrar Factura"
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>
                        )}
                        {pedido.status === 'paid' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 cursor-default">
                            🔒 Pagado
                          </span>
                        ) : (
                        <select
                          value={pedido.status}
                          onChange={(e) => handleStatusUpdate(pedido.id, e.target.value as OrderStatus)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium outline-none border-none cursor-pointer ${pedido.status === 'new' ? 'bg-teal-100 text-teal-700' :
                            pedido.status === 'pending' ? 'bg-slate-100 text-slate-700' :
                              pedido.status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                                pedido.status === 'preparing' ? 'bg-yellow-100 text-yellow-700' :
                                  pedido.status === 'ready' ? 'bg-orange-100 text-orange-700' :
                                    pedido.status === 'served' ? 'bg-green-100 text-green-700' :
                                      pedido.status === 'paid' ? 'bg-purple-100 text-purple-700' :
                                        'bg-red-100 text-red-700'
                            }`}
                        >
                          {[
                            { value: 'new', label: 'En Cocina' },
                            { value: 'pending', label: 'Pendiente' },
                            { value: 'accepted', label: 'Aceptado' },
                            { value: 'preparing', label: 'Preparando' },
                            { value: 'ready', label: 'Listo' },
                            { value: 'served', label: 'Servido' },
                            { value: 'paid', label: 'Pagado' },
                            { value: 'cancelled', label: 'Cancelado' }
                          ].map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-slate-200">
              <div className="text-sm text-slate-500">
                Mostrando <span className="font-medium">{pedidos.length}</span> de <span className="font-medium">{totalOrders}</span> pedidos
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                <div className="flex items-center gap-1 px-2">
                  <span className="text-sm font-medium text-slate-900">Página {currentPage}</span>
                  <span className="text-sm text-slate-500">de {totalPages}</span>
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Modal de Nuevo Pedido - RE-DISEÑADO CON BARRA SUPERIOR Y TAMAÑO FIJO */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-7xl h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                <h2 className="text-xl font-bold text-slate-900">Crear Nuevo Pedido</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* TOP BAR: Customer & Table Selection */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-6 flex-shrink-0">
                {/* Customer Input */}
                <div className="flex-1 relative min-w-[300px]">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Cliente</label>
                  <div className="relative">
                    <input
                      value={newOrder.customer_name}
                      onChange={(e) => {
                        setNewOrder({ ...newOrder, customer_name: e.target.value, customer_id: null });
                        setCustomerSearch(e.target.value);
                        setShowCustomerResults(true);
                      }}
                      onFocus={() => setShowCustomerResults(true)}
                      className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                      placeholder="Buscar cliente o escribir nombre..."
                    />
                    {newOrder.customer_name && (
                      <button
                        onClick={() => setNewOrder({ ...newOrder, customer_name: '', customer_id: null })}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {/* Customer Results Dropdown */}
                  <AnimatePresence>
                    {showCustomerResults && customerSearch && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-20 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-60 overflow-auto"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomerModalOpen(true);
                            setShowCustomerResults(false);
                          }}
                          className="w-full text-left px-4 py-3 text-sm hover:bg-orange-50 flex items-center gap-2 border-b font-medium text-orange-600"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>✨ Crear nuevo cliente</span>
                        </button>
                        {filteredCustomers.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setNewOrder({ ...newOrder, customer_name: c.name, customer_id: c.id });
                              setShowCustomerResults(false);
                            }}
                            className="w-full text-left px-4 py-3 text-sm hover:bg-orange-50 flex items-center justify-between border-b last:border-0"
                          >
                            <span className="font-medium text-slate-800">{c.name}</span>
                            <span className="text-xs text-slate-400">#{c.id}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Table Selection */}
                <div className="w-64">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Mesa / Entrega</label>
                  <select
                    value={newOrder.table_id}
                    onChange={(e) => setNewOrder({ ...newOrder, table_id: e.target.value })}
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                  >
                    {/* ① Default — no table selected */}
                    <option value="null">— Vacía —</option>

                    {/* ② Para llevar */}
                    <option value="para_llevar">🥡 Para llevar</option>

                    {/* ② Available tables sorted 1→30 */}
                    {sortedTables
                      .filter(t => t.status !== 'ocupada')
                      .map(table => (
                        <option key={table.id} value={table.id}>
                          Mesa {table.number}
                        </option>
                      ))}

                    {/* ③ Occupied tables sorted 1→30 — disabled */}
                    {sortedTables
                      .filter(t => t.status === 'ocupada')
                      .map(table => (
                        <option key={table.id} value={table.id} disabled>
                          Mesa {table.number}  (Ocupada)
                        </option>
                      ))}
                  </select>
                </div>

              </div>

              {/* Main Columns Content */}
              <div className="flex-1 overflow-hidden flex p-6 gap-6">
                {/* LEFT COLUMN: Categories */}
                <div className="w-48 flex-shrink-0 flex flex-col gap-2 overflow-y-auto pr-1">
                  <h3 className="font-bold text-slate-900 mb-1">Categorías</h3>
                  {categories.map(category => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all text-sm ${selectedCategory === category
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>

                {/* CENTER COLUMN: Product Selection */}
                <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                  {/* Search input */}
                  <div className="relative flex-shrink-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar producto..."
                      className="w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                    />
                  </div>
                  {/* Products Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto pr-2 pb-2 content-start">
                    {filteredProducts.map(product => (
                      <button
                        key={product.id}
                        onClick={() => handleProductClick(product)}
                        className="p-3 border border-slate-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all text-left group bg-white shadow-sm flex flex-col h-24 justify-between"
                      >
                        <div className="font-semibold text-slate-900 group-hover:text-orange-600 text-sm line-clamp-2 leading-tight" title={product.name}>{product.name}</div>
                        <div className="flex items-center justify-between mt-1">
                          <div className="text-xs text-slate-400 truncate max-w-[60%]">{product.category}</div>
                          <div className="font-bold text-slate-700 text-sm text-right">{formatNumber(product.price)}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* RIGHT COLUMN: Order Summary */}
                <div className="w-96 bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col shadow-inner flex-shrink-0">
                  <h3 className="font-bold text-slate-900 mb-3 border-b pb-2">Resumen</h3>

                  {/* Selected Items List - EXPANDABLE */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
                    {newOrder.items.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 opacity-60">
                        <div className="bg-slate-100 p-4 rounded-full">
                          <Plus className="w-8 h-8" />
                        </div>
                        <span className="text-sm font-medium">Agrega productos</span>
                      </div>
                    ) : (
                      newOrder.items.map((item: any) => (
                        <div key={item.id} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm flex flex-col gap-2">
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-sm font-medium text-slate-900 line-clamp-2 leading-tight">{item.name || item.product_name}</span>
                            <button onClick={() => removeItemFromOrder(item.id)} className="text-red-400 hover:text-red-600 p-0.5 hover:bg-red-50 rounded">
                              <Trash className="w-4 h-4" />
                            </button>
                          </div>
                          {(item.extras_names?.length > 0 || item.removed_ingredient_names?.length > 0 || item.notes) && (
                            <div className="text-xs text-slate-500 space-y-0.5 mt-0.5 border-l-2 border-orange-200 pl-2">
                              {item.extras_names?.map((n: string, i: number) => <div key={`e-${i}`}>+ {n}</div>)}
                              {item.removed_ingredient_names?.map((n: string, i: number) => <div key={`r-${i}`} className="text-red-400">- Sin {n}</div>)}
                              {item.notes && <div className="text-slate-600 italic mt-0.5">"{item.notes}"</div>}
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-1">
                              <button onClick={() => updateItemQuantity(item.id, -1)} className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm border text-slate-600 hover:text-orange-600 active:scale-95">
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                              <button onClick={() => updateItemQuantity(item.id, 1)} className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm border text-slate-600 hover:text-orange-600 active:scale-95">
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <span className="font-bold text-slate-800 text-sm text-right">{formatNumber(item.price * item.quantity)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer Totals */}
                  <div className="pt-4 space-y-2 mt-2 border-t border-slate-200 bg-slate-50">
                    <div className="flex justify-between items-center text-sm text-slate-600">
                      <span>Subtotal</span>
                      <span className="font-medium text-right">{formatNumber(subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-slate-600">
                      <label className="flex items-center gap-2 cursor-pointer hover:text-slate-800">
                        <input type="checkbox" checked={newOrder.aplica_impuesto} onChange={e => setNewOrder({ ...newOrder, aplica_impuesto: e.target.checked })} className="rounded text-orange-500 focus:ring-orange-500" />
                        <span>Aplicar impuesto ({taxRate}%)</span>
                      </label>
                      <span className="font-medium text-right">{formatNumber(tax)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-slate-600">
                      <label className="flex items-center gap-2 cursor-pointer hover:text-slate-800">
                        <input type="checkbox" checked={newOrder.apply_tip} onChange={e => setNewOrder({ ...newOrder, apply_tip: e.target.checked })} className="rounded text-orange-500 focus:ring-orange-500" />
                        <span>Propina (10%)</span>
                      </label>
                      <span className="font-medium text-right">{formatNumber(tip)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xl font-bold text-slate-900 py-2">
                      <span>Total</span>
                      <span className="text-right">{formatNumber(total)}</span>
                    </div>

                    <button
                      onClick={handleCreateOrder}
                      disabled={isSubmitting || newOrder.items.length === 0 || (!newOrder.customer_name && (!newOrder.table_id || newOrder.table_id === 'null'))}
                      className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar Pedido'}
                    </button>

                  </div>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        order={selectedOrderForPayment}
        tableNumber={selectedOrderForPayment?.table_id}
        onSuccess={handlePaymentSuccess}
      />

      <ReceiptComponent
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        data={receiptData}
      />

      <CustomerCreateModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onCustomerCreated={handleCustomerCreated}
      />

      <OrderDetailModal
        isOpen={isOrderDetailModalOpen}
        order={selectedOrder}
        onClose={() => {
          setIsOrderDetailModalOpen(false);
          setSelectedOrder(null);
        }}
        onOrderReopened={() => {
          fetchData();
        }}
      />

      <ProductCustomizationModal
        isOpen={isCustomizationModalOpen}
        onClose={() => setIsCustomizationModalOpen(false)}
        product={selectedProductForCustomization}
        onConfirm={handleAddCustomizedProduct}
      />
    </div>
  );
}
