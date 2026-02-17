import { createBrowserRouter, Navigate } from 'react-router';
import Login from '@/app/modules/auth/pages/Login';
import Register from '@/app/modules/auth/pages/Register';
import { ProtectedRoute } from '@/app/modules/auth/components/ProtectedRoute';
import { RoleProtectedRoute } from '@/app/modules/auth/components/RoleProtectedRoute';
import { SuperAdminRoute } from '@/app/modules/auth/components/SuperAdminRoute';
import DashboardLayout from '@/app/modules/dashboard/layouts/DashboardLayout';
import Dashboard from '@/app/modules/dashboard/pages/Dashboard';
import Cocina from '@/app/modules/kitchen/pages/Cocina';
import Pedidos from '@/app/modules/orders/pages/Pedidos';
import Menu from '@/app/modules/menu/pages/Menu';
import Mesas from '@/app/modules/tables/pages/Mesas';
import Clientes from '@/app/modules/customers/pages/Clientes';
import Staff from '@/app/modules/staff/pages/Staff';
import Finanzas from '@/app/modules/finance/pages/Finanzas';
import Reservas from '@/app/modules/reservations/pages/Reservas';
import ConfiguracionQR from '@/app/modules/settings/pages/ConfiguracionQR';
import Configuracion from '@/app/modules/settings/pages/Configuracion';
// Super Admin
import SuperAdminLayout from '@/app/modules/superadmin/layouts/SuperAdminLayout';
import SuperAdminDashboard from '@/app/modules/superadmin/pages/SuperAdminDashboard';
import CompaniesPage from '@/app/modules/superadmin/pages/CompaniesPage';
import CompanyDetailsPage from '@/app/modules/superadmin/pages/CompanyDetailsPage';
import UsersPage from '@/app/modules/superadmin/pages/UsersPage';
import AuditPage from '@/app/modules/superadmin/pages/AuditPage';
import PlansPage from '@/app/modules/superadmin/pages/PlansPage';
import BillingPage from '@/app/modules/superadmin/pages/BillingPage';
import ReportsPage from '@/app/modules/superadmin/pages/ReportsPage';
import SupportPage from '@/app/modules/superadmin/pages/SupportPage';

import SubscriptionsPage from '@/app/modules/superadmin/pages/SubscriptionsPage';
import SettingsPage from '@/app/modules/superadmin/pages/SettingsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/dashboard',
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'cocina', element: <Cocina /> },
          { path: 'pedidos', element: <Pedidos /> },
          { path: 'menu', element: <Menu /> },
          { path: 'mesas', element: <Mesas /> },
          { path: 'clientes', element: <Clientes /> },
          { path: 'finanzas', element: <Finanzas /> },
          { path: 'reservas', element: <Reservas /> },
          { path: 'qr', element: <ConfiguracionQR /> },
          { path: 'configuracion', element: <Configuracion /> },
          // Staff route protected by admin role
          {
            path: 'staff',
            element: <RoleProtectedRoute allowedRoles={['admin']} />,
            children: [
              { index: true, element: <Staff /> },
            ],
          },
        ],
      },
    ],
  },
  // ==================== SUPER ADMIN ROUTES ====================
  {
    path: '/superadmin',
    element: <SuperAdminRoute />,
    children: [
      {
        element: <SuperAdminLayout />,
        children: [
          { path: 'dashboard', element: <SuperAdminDashboard /> },
          { path: 'companies', element: <CompaniesPage /> },
          { path: 'companies/:id', element: <CompanyDetailsPage /> },
          { path: 'users', element: <UsersPage /> },
          { path: 'subscriptions', element: <SubscriptionsPage /> },
          { path: 'plans', element: <PlansPage /> },
          { path: 'billing', element: <BillingPage /> },
          { path: 'reports', element: <ReportsPage /> },
          { path: 'audit', element: <AuditPage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: 'support', element: <SupportPage /> },
        ],
      },
    ],
  },
]);
