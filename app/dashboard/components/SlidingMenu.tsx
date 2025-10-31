'use client';

import React, { useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from '@/components/ui/accordion';
import { useTranslation } from 'react-i18next';
import { useAuth, UserAccess } from '@/context/authContext';
import { useApi } from '@/utils/api';
import verificarImg from '@/images/logo_new.png';
import myb4yImg from '@/images/logo_transparent.png';
import {
  moduleIcons, defaultModuleIcon, componentIcons, defaultComponentIcon,
} from '@/config/iconMap';

interface SlidingMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

type MenuModule = {
  moduleName: string;
  components: Array<{ name: string; href?: string; openModal?: boolean; onClick?: () => void }>;
};

export default function SlidingMenu({ isOpen, onClose }: SlidingMenuProps) {
  const { t } = useTranslation('common');
  const { access, logout } = useAuth();
  const router = useRouter();
  const api = useApi();

  // open change password via event
  const handleOpenChangePassword = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onClose();
    router.push('/dashboard', { scroll: false });
    window.dispatchEvent(new CustomEvent('open-change-password'));
  }, [onClose, router]);

  // unified logout (same cleanup as header)
  const handleLogout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore network errors on logout
    }
    try {
      document.cookie = 'accessToken=; Max-Age=0; path=/; SameSite=None; Secure';
    } catch {}
    try {
      sessionStorage.clear();
      localStorage.clear();
    } catch {}
    logout();
    onClose();
    router.replace('/');
  }, [api, logout, onClose, router]);

  // Build modules from access
  const accessModules: MenuModule[] = useMemo(() => {
    const byModule = new Map<string, { moduleName: string; components: Map<string, { name: string; href: string }> }>();

    (access || [])
      .filter((a: UserAccess) => a.permissionCode === 'READ' || a.permissionCode === 'LIST')
      .forEach((a: UserAccess) => {
        if (!byModule.has(a.moduleName)) {
          byModule.set(a.moduleName, { moduleName: a.moduleName, components: new Map() });
        }
        const bucket = byModule.get(a.moduleName)!;
        const href =
          '/dashboard/' +
          a.moduleName.toLowerCase().replace(/\s+/g, '-') +
          '/' +
          a.componentName.toLowerCase().replace(/\s+/g, '-');
        bucket.components.set(href, { name: a.componentName, href });
      });

    return Array.from(byModule.values()).map(m => ({
      moduleName: m.moduleName,
      components: Array.from(m.components.values()),
    }));
  }, [access]);

  // Always-visible Users + Session
  const universalUsersSection: MenuModule = useMemo(() => ({
    moduleName: 'Users',
    components: [
      { name: 'Overview', href: '/dashboard' },
      { name: 'User details', href: '/dashboard/users/details' },
      { name: 'Alerts', href: '/dashboard/alerts' },          // 👈 Added Alerts entry
      { name: 'Change password', href: '/dashboard', openModal: true },
    ],
  }), []);

  const sessionSection: MenuModule = useMemo(() => ({
    moduleName: 'Session',
    components: [
      { name: 'Log Out', onClick: handleLogout },
    ],
  }), [handleLogout]);

  const modules = useMemo<MenuModule[]>(() => {
    return [universalUsersSection, ...accessModules, sessionSection];
  }, [universalUsersSection, accessModules, sessionSection]);

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-[85%] sm:w-80 md:w-96
        bg-gradient-to-br from-red-700/60 via-black/70 to-green-700/60
        transform transition-transform duration-300 ease-in-out
        shadow-lg flex flex-col h-screen
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* close */}
        <div className="flex justify-end p-4">
          <button onClick={onClose} aria-label={t('dashboard.closeMenu')}>
            <svg className="w-6 h-6 text-[var(--color-flag_white)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* logo */}
        <div className="flex items-center justify-center px-6 pb-4 border-b" style={{ borderColor: 'var(--color-text_light)' }}>
          <Image src={verificarImg} alt="Logo" width={32} height={32} />
        </div>

        {/* accordion */}
        <Accordion type="single" collapsible className="px-4 py-6 space-y-4 overflow-y-auto flex-1">
          {modules.map((mod) => {
            const modKey = mod.moduleName.toLowerCase().replace(/\s+/g, '-');
            const modLabel = t(`dashboard.menu.${modKey}`, { defaultValue: mod.moduleName });

            return (
              <AccordionItem key={mod.moduleName} value={mod.moduleName}>
                <AccordionTrigger className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[var(--color-flag_yellow)]">
                    {moduleIcons[mod.moduleName] ?? defaultModuleIcon}
                    {modLabel}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pl-8 space-y-2">
                  {mod.components.map((comp) => {
                    const key = (comp.href || comp.name).toLowerCase().replace(/\s+/g, '-');
                    const label = t(`dashboard.menu.${key}`, { defaultValue: comp.name });

                    if (comp.openModal) {
                      return (
                        <a
                          key="open-change-password"
                          href="/dashboard"
                          onClick={handleOpenChangePassword}
                          className="flex items-center gap-2 text-[var(--color-flag_white)] hover:text-[var(--color-flag_yellow)] transition cursor-pointer"
                        >
                          {componentIcons[comp.name] ?? defaultComponentIcon}
                          {label}
                        </a>
                      );
                    }

                    if (comp.onClick) {
                      return (
                        <button
                          key={comp.name}
                          onClick={comp.onClick}
                          className="flex items-center gap-2 text-left w-full text-[var(--color-flag_white)] hover:text-[var(--color-flag_yellow)] transition"
                        >
                          {componentIcons[comp.name] ?? defaultComponentIcon}
                          {label}
                        </button>
                      );
                    }

                    return (
                      <Link
                        key={comp.href}
                        href={comp.href!}
                        onClick={onClose}
                        className="flex items-center gap-2 text-[var(--color-flag_white)] hover:text-[var(--color-flag_yellow)] transition"
                      >
                        {componentIcons[comp.name] ?? defaultComponentIcon}
                        {label}
                      </Link>
                    );
                  })}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {/* footer */}
        <div className="px-6 py-4 border-t text-center flex-none bg-black text-[var(--color-flag_white)]" style={{ borderColor: 'var(--color-text_light)' }}>
          <p className="text-sm">{t('footer.developedWithLove')}</p>
          <div className="mt-2 flex justify-center">
            <a href="https://app.myb4y.com" target="_blank" rel="noopener noreferrer">
              <Image src={myb4yImg} alt="MYB4Y" width={24} height={24} />
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
