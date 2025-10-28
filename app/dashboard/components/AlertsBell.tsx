// components/AlertsBell.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BellRing, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/context/authContext';
import { useApi } from '@/utils/api';

// Set to true only if you want local mock data.
const MOCK = false;

type Severity = 'info' | 'warning' | 'critical';

type AlertItem = {
  id: string | number;
  title: string;
  createdAt: string; // ISO 8601 string
  severity: Severity;
  read?: boolean;
};

type AlertsSummary = {
  unreadCount: number;
  items: AlertItem[];
};

export interface AlertsBellProps {
  refreshMs?: number; // polling interval (default 30s)
  maxVisible?: number; // items to show in dropdown (default 6)
  className?: string;
}

const severityColor = (sev: Severity) => {
  switch (sev) {
    case 'critical':
      return 'bg-red-600';
    case 'warning':
      return 'bg-amber-500';
    default:
      return 'bg-blue-500';
  }
};

function timeAgo(iso: string) {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);

  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.floor(hr / 24);
  return `${d}d`;
}

// Local mock
function mockFetch(): Promise<AlertsSummary> {
  const base: AlertsSummary = {
    unreadCount: Math.random() < 0.4 ? Math.floor(Math.random() * 4) : 2,
    items: [
      {
        id: 1,
        title: 'Policy document awaiting your review',
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        severity: 'info',
      },
      {
        id: 2,
        title: 'Expense report approaching limit',
        createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
        severity: 'warning',
      },
      {
        id: 3,
        title: 'Server quota threshold exceeded',
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        severity: 'critical',
      },
    ],
  };
  return new Promise(res => setTimeout(() => res(base), 400));
}

export default function AlertsBell({
  refreshMs = 30000,
  maxVisible = 6,
  className = '',
}: AlertsBellProps) {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { user } = useAuth();
  const api = useApi();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AlertsSummary>({ unreadCount: 0, items: [] });

  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Track previous items to detect "new" items and toast them
  const prevIdsRef = useRef<Set<string | number>>(new Set());

  const userId = useMemo(() => user?.userId, [user]);

  const notifyNewItems = useCallback(
    (prev: Set<string | number>, curr: AlertItem[]) => {
      const newOnes = curr.filter(it => !prev.has(it.id));
      if (newOnes.length === 0) return;

      // Primary toast for the newest alert
      const first = newOnes[0];
      const key = `alerts.toast.${first.severity}` as const;
      toast.info(t(key, { title: first.title }));

      // “+N more…” toast
      const more = newOnes.length - 1;
      if (more > 0) {
        toast.info(
          t('alerts.toast.more', {
            count: more,
            plural: more > 1 ? 's' : '',
            pluralSuffix: more > 1 ? 's' : '',
          })
        );
      }
    },
    [t]
  );

  const fetchAlerts = useCallback(async () => {
    // Guard: only if authenticated user is present
    if (!userId) return;
    try {
      setLoading(true);

      // Shape returned by backend: { unreadCount, items: [{ id, title, createdAt, severity, isRead }] }
      type RawItem = {
        id: string | number;
        title: string;
        createdAt: string;
        severity: Severity;
        isRead?: boolean;
      };

      const data: { unreadCount: number; items: RawItem[] } = MOCK
        ? await mockFetch()
        : (await api.get('/alerts/summary', { params: { max: maxVisible } })).data;

      // Toast for new items BEFORE we slice/update state
      notifyNewItems(prevIdsRef.current, data.items as AlertItem[]);

      // Normalize: isRead -> read, and clamp to maxVisible
      const normalized = (Array.isArray(data.items) ? data.items : [])
        .slice(0, maxVisible)
        .map(it => ({
          id: it.id,
          title: it.title,
          createdAt: it.createdAt,
          severity: it.severity,
          read: !!it.isRead,
        }));

      setSummary({
        unreadCount: data.unreadCount ?? 0,
        items: normalized,
      });

      // Save current IDs for next comparison
      const nextSet = new Set<string | number>();
      for (const it of normalized) nextSet.add(it.id);
      prevIdsRef.current = nextSet;
    } catch {
      // Silent on poll errors
    } finally {
      setLoading(false);
    }
  }, [api, maxVisible, notifyNewItems, userId]);

  // Initial fetch + polling (pause when tab hidden)
  useEffect(() => {
    if (!userId) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const start = async () => {
      await fetchAlerts();
      timer = setInterval(fetchAlerts, refreshMs);
    };

    const onVisibility = () => {
      if (document.hidden) {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      } else {
        fetchAlerts();
        timer = setInterval(fetchAlerts, refreshMs);
      }
    };

    start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchAlerts, refreshMs, userId]);

  // Click outside to close
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!open) return;
      const tNode = e.target as Node;
      if (panelRef.current?.contains(tNode)) return;
      if (btnRef.current?.contains(tNode)) return;
      setOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [open]);

  const goToAlerts = useCallback(() => {
    setOpen(false);
    router.push('/dashboard/alerts');
  }, [router]);

  return (
    <div className={`relative ${className}`}>
      <button
        ref={btnRef}
        type="button"
        aria-label={t('alerts.title')}
        onClick={() => setOpen(o => !o)}
        className="relative inline-flex items-center justify-center p-2 rounded-full hover:bg-gray-100 transition"
      >
        <BellRing className="w-6 h-6 text-gray-700" />
        {summary.unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[11px] leading-[18px] text-center shadow"
            aria-label={`${summary.unreadCount} ${t('alerts.title')}`}
          >
            {summary.unreadCount > 99 ? '99+' : summary.unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50"
        >
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="font-semibold text-gray-800">{t('alerts.title')}</span>
            <button
              className="text-xs text-blue-600 hover:underline"
              onClick={() => fetchAlerts()}
            >
              {t('alerts.refresh')}
            </button>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 px-4 py-6 text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t('alerts.loading')}</span>
            </div>
          ) : summary.items.length === 0 ? (
            <div className="px-4 py-6 text-gray-500 text-sm">{t('alerts.noAlerts')}</div>
          ) : (
            <ul className="max-h-96 overflow-auto">
              {summary.items.map(item => (
                <li
                  key={item.id}
                  className="px-4 py-3 hover:bg-gray-50 transition flex gap-3 cursor-pointer"
                  onClick={goToAlerts}
                >
                  <span
                    className={`mt-1 inline-block w-2.5 h-2.5 rounded-full ${severityColor(
                      item.severity,
                    )}`}
                    aria-hidden
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-gray-900 truncate">
                      {item.title}
                    </div>
                    <div className="text-[12px] text-gray-500">
                      {timeAgo(item.createdAt)} {t('alerts.ago')}
                    </div>
                  </div>
                  {!item.read && (
                    <span className="self-center text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {t('alerts.new')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="px-4 py-3 border-t border-gray-100 text-right">
            <button
              onClick={goToAlerts}
              className="text-sm text-blue-600 hover:underline"
            >
              {t('alerts.viewAll')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
