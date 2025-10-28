// components/AuthGuard.tsx
'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/authContext';

interface AuthGuardProps {
  moduleName: string;
  componentName: string;
  children: ReactNode;
}

export default function AuthGuard({
  moduleName,
  componentName,
  children,
}: AuthGuardProps) {
  const router = useRouter();
  const { user, access } = useAuth();

  useEffect(() => {
    // 1) Not logged in?
    if (!user) {
      toast.error('Authentication required');
      router.push('/');
      return;
    }

    // 2) Has at least READ or LIST on this component?
    const has = access.some(
      (a) =>
        a.moduleName === moduleName &&
        a.componentName === componentName &&
        ['READ', 'LIST'].includes(a.permissionCode)
    );
    if (!has) {
      toast.error('You do not have permission to view this page');
      router.push('/dashboard');
    }
  }, [user, access, moduleName, componentName, router]);

  return <>{children}</>;
}
