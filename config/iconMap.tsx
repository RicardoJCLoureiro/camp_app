// src/config/iconMap.ts
import React from 'react';
import {
  Home,
  Users,
  Layers,
  Database,
  Activity,
  Settings,
  Archive,
  Box,
  ShieldCheck,
} from 'lucide-react';

// Module icons (you already have these)
export const moduleIcons: Record<string, React.ReactNode> = {
  Administration: <Home size={20} />,
  // …other modules
};
export const defaultModuleIcon = <Activity size={20} />;

// Component-level icons
export const componentIcons: Record<string, React.ReactNode> = {
  Entities: <Database size={18} />,
  Users: <Users size={18} />,
  Roles: <ShieldCheck size={18} />,
  'Modules Definition': <Layers size={18} />,
  'Components Definition': <Box size={18} />,
};
export const defaultComponentIcon = <Archive size={18} />;
