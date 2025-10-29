'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BellRing, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/context/authContext';
import { useApi } from '@/utils/api';

type Severity = 'info' | 'warning' | 'critical';
type AlertItem = {
  id: number | string;
  title: string;
  createdAt: string;
  severity: Severity;
  read?: boolean;
};

export interface AlertsBellProps {
  refreshMs?: number;
  maxVisible?: number;
  className?: string;
}

const severityColor = (sev: Severity) => {
  switch (sev) {
    case 'critical': return 'bg-red-600';
    case 'warning':  return 'bg-amber-500';
    default:         return 'bg-blue-500';
  }
};

function timeAgo(iso: string) {
  const then = new Date(iso).getTime();
  const sec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.floor(hr / 24);
  return `${d}d`;
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
  const [summary, setSummary] = useState<{ unreadCount: number; items: AlertItem[] }>({ unreadCount: 0, items: [] });

  const userId = useMemo(() => user?.userId, [user]);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get<{ count: number }>('/alerts/unread-count');
      return res.data?.count ?? 0;
    } catch {
      return 0;
    }
  }, [api]);

  const fetchLatest = useCallback(async () => {
    try {
      const res = await api.get('/alerts', {
        params: { page: 1, pageSize: maxVisible, includeArchived: false },
      });
      const itemsRaw = Array.isArray(res.data?.items) ? res.data.items : [];

      const items: AlertItem[] = itemsRaw.map((r: any) => ({
        id: r?.alertId ?? r?.AlertId ?? r?.id ?? r?.Id,
        title: r?.title ?? r?.Title ?? '',
        createdAt: String(r?.createdAt ?? r?.CreatedAt ?? ''),
        severity: (r?.severityCode ?? r?.SeverityCode ?? 'info') as Severity,
        read: !!(r?.isRead ?? r?.IsRead ?? r?.read),
      }));

      return items;
    } catch {
      return [];
    }
  }, [api, maxVisible]);

  const fetchAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [count, items] = await Promise.all([fetchUnreadCount(), fetchLatest()]);
      setSummary({ unreadCount: count, items });
    } finally {
      setLoading(false);
    }
  }, [fetchLatest, fetchUnreadCount, userId]);

  useEffect(() => {
    if (!userId) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const start = async () => {
      await fetchAll();
      timer = setInterval(fetchAll, refreshMs);
    };

    const onVisibility = () => {
      if (document.hidden) {
        if (timer) clearInterval(timer);
        timer = null;
      } else {
        fetchAll();
        timer = setInterval(fetchAll, refreshMs);
      }
    };

    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchAll, refreshMs, userId]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!open) return;
      const n = e.target as Node;
      if (panelRef.current?.contains(n)) return;
      if (btnRef.current?.contains(n)) return;
      setOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
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
            <button className="text-xs text-blue-600 hover:underline" onClick={fetchAll}>
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
                    className={`mt-1 inline-block w-2.5 h-2.5 rounded-full ${severityColor(item.severity)}`}
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
            <button onClick={goToAlerts} className="text-sm text-blue-600 hover:underline">
              {t('alerts.viewAll')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
