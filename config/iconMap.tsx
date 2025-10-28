import { Home, Users, KeyRound, LogOut, Layers, Database, Activity, Settings, ShieldCheck, Box } from 'lucide-react';

export const moduleIcons: Record<string, React.ReactNode> = {
  Administration: <Home size={20} />,
  Users: <Users size={20} />,
  Session: <Settings size={20} />, // for your Session module
};
export const defaultModuleIcon = <Activity size={20} />;

export const componentIcons: Record<string, React.ReactNode> = {
  Entities: <Database size={18} />,
  Users: <Users size={18} />,
  Roles: <ShieldCheck size={18} />,
  'Modules Definition': <Layers size={18} />,
  'Components Definition': <Box size={18} />,
  'User details': <Users size={18} />,
  'Change password': <KeyRound size={18} />,
  'Log Out': <LogOut size={18} />,
};
export const defaultComponentIcon = <Activity size={18} />;
