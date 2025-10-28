// src/config/menuConfig.ts

import React from 'react';
import { Home, User, Settings, Eye } from 'lucide-react';

export interface MenuItem {
  key: string;
  labelKey: string;        // i18n key under dashboard.menu
  href: string;
  icon: React.ReactNode;
  allowedRoles: string[];  // roles that may see this item
}

export const menuItems: MenuItem[] = [
  {
    key: 'home',
    labelKey: 'dashboard.menu.home',
    href: '/dashboard',
    icon: <Home size={20} />,
    allowedRoles: ['System Administrator', 'club', 'referee', 'league'],
  },
  {
    key: 'profile',
    labelKey: 'dashboard.menu.profile',
    href: '/dashboard/profile',
    icon: <User size={20} />,
    allowedRoles: ['System Administrator', 'club', 'league'],
  },
  {
    key: 'settings',
    labelKey: 'dashboard.menu.settings',
    href: '/dashboard/settings',
    icon: <Settings size={20} />,
    allowedRoles: ['System Administrator', 'league', 'police'],
  },
  {
    key: 'watch',
    labelKey: 'dashboard.menu.watch',
    href: '/dashboard/watch',
    icon: <Eye size={20} />,
    allowedRoles: ['System Administrator', 'watcher'],
  },
];
