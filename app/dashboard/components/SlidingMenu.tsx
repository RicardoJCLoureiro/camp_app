// app/dashboard/components/SlidingMenu.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { useTranslation } from 'react-i18next';
import { useAuth, UserAccess } from '@/context/authContext';
import verificarImg from '@/images/logo.png';
import myb4yImg from '@/images/logo_transparent.png';
import {
  moduleIcons,
  defaultModuleIcon,
  componentIcons,
  defaultComponentIcon,
} from '@/config/iconMap';

interface SlidingMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SlidingMenu({ isOpen, onClose }: SlidingMenuProps) {
  const { t } = useTranslation('common');
  const { access } = useAuth();

  // Group by moduleID → de-duped components
  const modulesMap = access
    .filter((a) => ['READ', 'LIST'].includes(a.permissionCode))
    .reduce((acc, a) => {
      if (!acc[a.moduleID]) {
        acc[a.moduleID] = {
          moduleName: a.moduleName,
          components: {} as Record<string, { name: string; href: string }>,
        };
      }
      acc[a.moduleID].components[a.componentID] = {
        name: a.componentName,
        href:
          '/dashboard/' +
          a.moduleName.toLowerCase().replace(/\s+/g, '-') +
          '/' +
          a.componentName.toLowerCase().replace(/\s+/g, '-'),
      };
      return acc;
    }, {} as Record<
      number,
      { moduleName: string; components: Record<string, { name: string; href: string }> }
    >);

  const modules = Object.values(modulesMap).map((mod) => ({
    moduleName: mod.moduleName,
    components: Object.values(mod.components),
  }));

  return (
    <>
      {/* backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      <div
        className={`
          fixed inset-y-0 left-0 z-50
          w-[85%] sm:w-80 md:w-96
          bg-gradient-to-br from-red-700/60 via-black/70 to-green-700/60
          transform transition-transform duration-300 ease-in-out
          shadow-lg flex flex-col h-screen
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* close button */}
        <div className="flex justify-end p-4">
          <button onClick={onClose} aria-label={t('dashboard.closeMenu')}>
            <svg
              className="w-6 h-6 text-[var(--color-flag_white)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* logo */}
        <div
          className="flex items-center justify-center px-6 pb-4 border-b"
          style={{ borderColor: 'var(--color-text_light)' }}
        >
          <Image src={verificarImg} alt="Logo" width={32} height={32} />
        </div>

        {/* accordion */}
        <Accordion type="single" collapsible className="px-4 py-6 space-y-4 overflow-y-auto flex-1">
          {modules.map((mod) => (
            <AccordionItem key={mod.moduleName} value={mod.moduleName}>
              <AccordionTrigger className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[var(--color-flag_yellow)]">
                  {moduleIcons[mod.moduleName] ?? defaultModuleIcon}
                  {t(`dashboard.menu.${mod.moduleName.toLowerCase().replace(/\s+/g, '-')}`)}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-8 space-y-2">
                {mod.components.map((comp) => (
                  <Link
                    key={comp.href}
                    href={comp.href}
                    onClick={onClose}
                    className="flex items-center gap-2 text-[var(--color-flag_white)] hover:text-[var(--color-flag_yellow)] transition"
                  >
                    {componentIcons[comp.name] ?? defaultComponentIcon}
                    {t(`dashboard.menu.${comp.name.toLowerCase().replace(/\s+/g, '-')}`)}
                  </Link>
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* footer */}
        <div
          className="px-6 py-4 border-t text-center flex-none bg-black text-[var(--color-flag_white)]"
          style={{ borderColor: 'var(--color-text_light)' }}
        >
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
