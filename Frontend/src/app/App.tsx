import { RouterProvider } from 'react-router';
import { router } from '@/app/routes';
import { AuthProvider } from '@/app/modules/auth/context/AuthContext';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}
