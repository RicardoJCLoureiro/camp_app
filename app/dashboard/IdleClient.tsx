'use client';

import * as React from 'react';
import { useAuth } from '@/context/authContext';
import SessionExpiryModal from '@/components/SessionExpiryModal';

const IDLE_TIMEOUT_MS = 15 * 60_000; // 15 minutes total inactivity window
const WARN_BEFORE_MS  =  2 * 60_000; // show modal during the last 2 minutes
const TICK_MS         = 250;

export default function IdleClient() {
  const { user, refreshAccessToken, logout } = useAuth();

  const [show, setShow] = React.useState(false);
  const [deadline, setDeadline] = React.useState<number>(Date.now() + IDLE_TIMEOUT_MS);
  const [remaining, setRemaining] = React.useState<number>(IDLE_TIMEOUT_MS);

  const didLogoutRef = React.useRef(false);

  const resetDeadline = React.useCallback(() => {
    const next = Date.now() + IDLE_TIMEOUT_MS;
    setDeadline(next);
    setRemaining(next - Date.now());
  }, []);

  // Activity listeners (don’t reset while modal is open)
  React.useEffect(() => {
    const mark = () => {
      if (!show && !didLogoutRef.current) {
        resetDeadline();
        try { localStorage.setItem('myb4y:activity', String(Date.now())); } catch {}
      }
    };
    const events: Array<keyof WindowEventMap> = [
      'mousemove','mousedown','keydown','scroll','touchstart','click'
    ];
    events.forEach(e => window.addEventListener(e, mark, { passive: true }));
    return () => { events.forEach(e => window.removeEventListener(e, mark)); };
  }, [show, resetDeadline]);

  // Recompute immediately on visibility change (covers sleep/background)
  React.useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && !didLogoutRef.current) {
        const r = Math.max(0, deadline - Date.now());
        setRemaining(r);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [deadline]);

  // Main tick loop
  React.useEffect(() => {
    let intervalId: number | undefined;

    const tick = () => {
      if (didLogoutRef.current) return;
      const r = Math.max(0, deadline - Date.now());
      setRemaining(r);

      if (r === 0) {
        didLogoutRef.current = true;
        setShow(false);
        try { localStorage.setItem('myb4y:logout', String(Date.now())); } catch {}
        logout(); // do not await
        return;
      }
      if (r <= WARN_BEFORE_MS && !show) setShow(true);
    };

    tick();
    intervalId = window.setInterval(tick, TICK_MS);

    return () => {
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, [deadline, show, logout]);

  // Cross-tab sync (logout & keepalive)
  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'myb4y:logout') {
        didLogoutRef.current = true;
        setShow(false);
        window.location.href = '/';
      }
      if (e.key === 'myb4y:activity' && !show && !didLogoutRef.current) {
        resetDeadline();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [show, resetDeadline]);

  if (!user) return null;

  return (
    <SessionExpiryModal
      isOpen={show}
      timeRemaining={remaining}
      totalMs={WARN_BEFORE_MS}  // for progress ring math
      onStay={async () => {
        if (didLogoutRef.current) return;
        await refreshAccessToken(); // slide server session
        resetDeadline();            // reset client idle window
        setShow(false);
      }}
      onLogout={() => {
        if (didLogoutRef.current) return;
        didLogoutRef.current = true;
        setShow(false);
        try { localStorage.setItem('myb4y:logout', String(Date.now())); } catch {}
        logout();
      }}
    />
  );
}
