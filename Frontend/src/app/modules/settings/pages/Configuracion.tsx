import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Store, Bell, Globe, Shield, CreditCard, Users, Receipt, Loader2 } from 'lucide-react';
import { useAuth } from '@/app/modules/auth/context/AuthContext';
import { settingsService } from '../services/settingsService';
import { toast } from 'sonner';

export default function Configuracion() {
  const { user } = useAuth();
  const [taxRate, setTaxRate] = useState('18.00');
  const [isEditingTax, setIsEditingTax] = useState(false);
  const [isSavingTax, setIsSavingTax] = useState(false);
  const [currency, setCurrency] = useState('DOP');

  useEffect(() => {
    loadCompanySettings();
  }, []);

  const loadCompanySettings = async () => {
    try {
      const settings = await settingsService.getCompanySettings();
      setTaxRate(settings.tax_rate.toString());
      setCurrency(settings.currency);
    } catch (error) {
      console.error('Error loading company settings:', error);
    }
  };

  const handleSaveTaxRate = async () => {
    setIsSavingTax(true);
    try {
      const rate = parseFloat(taxRate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        toast.error('El impuesto debe estar entre 0 y 100');
        return;
      }
      await settingsService.updateCompanySettings({ tax_rate: rate });
      toast.success('Tasa de impuesto actualizada correctamente');
      setIsEditingTax(false);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al actualizar la configuración');
    } finally {
      setIsSavingTax(false);
    }
  };

  // Only show tax config for admin/superadmin
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const sections = [
    {
      title: 'Información del Restaurante',
      icon: Store,
      color: 'bg-blue-500',
      items: [
        { label: 'Nombre', value: 'Restaurante APPetito' },
        { label: 'Dirección', value: 'Calle Principal 123, Madrid' },
        { label: 'Teléfono', value: '+34 911 222 333' },
        { label: 'Email', value: 'info@appetito.com' },
      ]
    },
    {
      title: 'Cuenta y Perfil',
      icon: Users,
      color: 'bg-purple-500',
      items: [
        { label: 'Usuario', value: user?.nombre || 'Usuario' },
        { label: 'Email', value: user?.email || 'email@example.com' },
        { label: 'Rol', value: user?.role || 'admin' },
        { label: 'Último acceso', value: 'Hoy a las 10:30' },
      ]
    },
    {
      title: 'Notificaciones',
      icon: Bell,
      color: 'bg-yellow-500',
      items: [
        { label: 'Nuevos pedidos', value: 'Activado' },
        { label: 'Reservas', value: 'Activado' },
        { label: 'Alertas de stock', value: 'Activado' },
        { label: 'Email diario', value: 'Desactivado' },
      ]
    },
    {
      title: 'Idioma y Región',
      icon: Globe,
      color: 'bg-green-500',
      items: [
        { label: 'Idioma', value: 'Español' },
        { label: 'Zona horaria', value: 'GMT-4 (República Dominicana)' },
        { label: 'Moneda', value: currency },
        { label: 'Formato fecha', value: 'DD/MM/YYYY' },
      ]
    },
    {
      title: 'Seguridad',
      icon: Shield,
      color: 'bg-red-500',
      items: [
        { label: 'Autenticación 2FA', value: 'Desactivado' },
        { label: 'Sesiones activas', value: '1 dispositivo' },
        { label: 'Último cambio contraseña', value: 'Hace 30 días' },
        { label: 'Nivel seguridad', value: 'Alto' },
      ]
    },
    {
      title: 'Pagos y Facturación',
      icon: CreditCard,
      color: 'bg-indigo-500',
      items: [
        { label: 'Método de pago', value: 'Tarjeta **** 1234' },
        { label: 'Plan actual', value: 'Profesional' },
        { label: 'Próxima factura', value: '01/02/2026' },
        { label: 'Estado', value: 'Activo' },
      ]
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Configuración</h1>
        <p className="text-slate-600">Ajustes generales del sistema</p>
      </div>

      {/* Tax Configuration Section - Only for Admin */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 shadow-md border border-slate-200"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-orange-500">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Configuración Fiscal</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-600">Tasa de Impuesto (%)</span>
              {isEditingTax ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="w-24 px-3 py-1 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                  <button
                    onClick={handleSaveTaxRate}
                    disabled={isSavingTax}
                    className="px-3 py-1 text-sm bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-1"
                  >
                    {isSavingTax ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Guardar'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingTax(false);
                      loadCompanySettings();
                    }}
                    className="px-3 py-1 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">{parseFloat(taxRate).toFixed(2)}%</span>
                  <button
                    onClick={() => setIsEditingTax(true)}
                    className="px-3 py-1 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                  >
                    Editar
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Este porcentaje se aplicará automáticamente a todos los pedidos nuevos.
              Ejemplos: 18% (ITBIS - República Dominicana), 16% (IVA - México), 19% (IVA - Colombia)
            </p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sections.map((section, index) => {
          const Icon = section.icon;
          return (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl p-6 shadow-md border border-slate-200"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${section.color}`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{section.title}</h3>
              </div>

              <div className="space-y-3">
                {section.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <span className="text-sm text-slate-600">{item.label}</span>
                    <span className="text-sm font-medium text-slate-900">{item.value}</span>
                  </div>
                ))}
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                className="w-full mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
              >
                Editar
              </motion.button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
