'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/context/authContext';
import SlidingMenu from './components/SlidingMenu';
import DashboardHeader from './components/DashboardHeader';
import noavatarImg from '@/images/noavatar.png';

/* ───────────────────────────────────────────────────────────── */

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { loading, loaded, user, refreshAccessToken, logout } = useAuth();

  const [menuOpen,  setMenuOpen ] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState<string>(noavatarImg.src);

  /* guard: kick back to / when user not logged */
  useEffect(() => {
    if (!loading && loaded && user === null) {
      toast.error(t('auth.requiredToast'));
      router.push('/');
    }
  }, [loading, loaded, user, router, t]);

  /* derive avatar */
  useEffect(() => {
    if (user?.image?.trim()) setAvatarSrc(user.image);
  }, [user]);

  if (loading || !loaded || user === null) return null;

  return (
    <div className="relative flex min-h-screen overflow-hidden">
      {/* sliding nav */}
      <SlidingMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* main column */}
      <div className="flex-1 flex flex-col bg-[var(--color-background_light)]">
        {/* header */}
        <DashboardHeader
          avatarSrc={avatarSrc}
          onMenuClick={() => setMenuOpen(true)}
        />

        {/* routed page */}
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>

        {/* global footer actions if you want them everywhere */}
        {/* <div className="p-4 flex gap-3">
            <button onClick={refreshAccessToken} className="px-3 py-1 bg-green-300 rounded">
              {t('dashboard.refresh')}
            </button>
            <button onClick={logout} className="px-3 py-1 bg-red-300 rounded">
              {t('dashboard.logout')}
            </button>
        </div> */}
      </div>
    </div>
  );
}
