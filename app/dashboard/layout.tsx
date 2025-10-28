// app/dashboard/layout.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/authContext';
import DashboardHeader from './components/DashboardHeader';
import SlidingMenu from './components/SlidingMenu';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { loading, loaded, user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  // Auth guard (server-safe via middleware; client fallback here)
  useEffect(() => {
    if (!loading && loaded && !user) {
      toast.error(t('dummy.authRequired'));
      router.replace('/');
    }
  }, [loading, loaded, user, router, t]);

  if (loading || !loaded || !user) return null;

  return (
    <div className="min-h-screen bg-[var(--color-background_light)]">
      <DashboardHeader
        avatarSrc={user.image || '/favicon.ico'}
        onMenuClick={() => setMenuOpen(true)}
      />
      <SlidingMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="p-4 md:p-6 lg:p-8">{children}</main>
    </div>
  );
}
