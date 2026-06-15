import AppShell from '@/components/layout/AppShell';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { ToastProvider } from '@/components/ui/Toast';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard>
      <ToastProvider>
        <AppShell>{children}</AppShell>
      </ToastProvider>
    </RouteGuard>
  );
}
