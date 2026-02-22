import AdminLayout from '@/components/AdminLayout';
import { OrderProvider } from '@/context/OrderContext';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OrderProvider>
      <AdminLayout>
        {children}
      </AdminLayout>
    </OrderProvider>
  );
}

