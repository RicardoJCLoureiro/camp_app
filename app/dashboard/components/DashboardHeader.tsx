// app/dashboard/components/DashboardHeader.tsx
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react';
import { ChevronDown, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

import LanguagePicker from '@/components/LanguagePicker';
import { useAuth } from '@/context/authContext';
import { useApi } from '@/utils/api';
import AlertsBell from './AlertsBell'; // ← use the shared SignalR version

interface DashboardHeaderProps {
  avatarSrc: string;
  onMenuClick: () => void;
}

export default function DashboardHeader({
  avatarSrc,
  onMenuClick,
}: DashboardHeaderProps) {
  const { t } = useTranslation('common');
  const { logout } = useAuth();
  const api = useApi();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      // Expire HttpOnly cookie on backend (ignore 4xx here)
      await api.post('/auth/logout', {}, { validateStatus: s => s < 500 }).catch(() => {});

      // Clear client storage
      try { sessionStorage.clear(); } catch {}
      try {
        localStorage.removeItem('userLang');
        localStorage.removeItem('myb4y_auth');
        localStorage.removeItem('sparc_auth');
        localStorage.removeItem('persist:root');
      } catch {}

      // Reset auth context
      try { await logout(); } catch {}

      toast.success(t('auth.loggedOutToast'));
      router.replace('/');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="flex items-center justify-between p-4 bg-gradient-to-br from-red-700/60 via-black/70 to-green-700/60 text-[var(--color-flag_white)]">
      {/* Left: hamburger + title */}
      <div className="flex items-center">
        <button
          onClick={onMenuClick}
          className="mr-4 p-2 rounded hover:bg-white/10 transition"
          aria-label={t('dashboard.openMenu')}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-xl font-semibold">{t('dashboard.title')}</h1>
      </div>

      {/* Right: alerts + language + profile */}
      <div className="flex items-center gap-3">
        {/* Bell with real-time updates via SignalR (no polling prop) */}
        <AlertsBell />

        <LanguagePicker />

        <Menu as="div" className="relative">
          <MenuButton className="flex items-center gap-2 focus:outline-none">
            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white">
              <Image
                src={avatarSrc}
                alt={t('dashboard.avatarAlt')}
                width={32}
                height={32}
                className="object-cover"
              />
            </div>
            <ChevronDown className="w-4 h-4 text-[var(--color-flag_white)]" />
          </MenuButton>

          <MenuItems className="absolute right-0 mt-2 w-44 bg-white rounded-md shadow-lg overflow-hidden z-50">
            <MenuItem>
              {({ active }) => (
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className={[
                    'flex w-full items-center px-4 py-2 text-sm',
                    active ? 'bg-gray-100' : '',
                    'text-[var(--color-text_dark)]',
                    loggingOut ? 'opacity-60 cursor-not-allowed' : ''
                  ].join(' ')}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('dashboard.logout')}
                </button>
              )}
            </MenuItem>
          </MenuItems>
        </Menu>
      </div>
    </header>
  );
}
