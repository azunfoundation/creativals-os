'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading, loadUser } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      
      if (token) {
        if (!user) {
          await loadUser();
        }
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) {
          router.replace('/login');
          return;
        }
      } else {
        router.replace('/login');
        return;
      }
      setIsInitialized(true);
    };

    initAuth();
  }, [user, loadUser, router]);

  if (isLoading || (!isInitialized && !user)) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--background)',
        color: 'var(--text-secondary)',
        flexDirection: 'column', gap: 16,
      }}>
        <div style={{
          width: 40, height: 40, border: '3px solid var(--border)',
          borderTopColor: 'var(--accent)', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ fontSize: 14 }}>Loading...</span>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
