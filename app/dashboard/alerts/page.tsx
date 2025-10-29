'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';

import { useAuth } from '@/context/authContext';
import { useApi } from '@/utils/api';
import AlertDetailModal from '@/app/dashboard/components/AlertDetailModal';

type Status = 'active' | 'unread' | 'all';
type Severity = 'all' | 'info' | 'warning' | 'critical';

type AlertItem = {
  id: number | string;
  title: string;
  createdAt: string;   // ISO
  severity: 'info' | 'warning' | 'critical';
  read?: boolean;
  body?: string | null;
};

type AlertsListResponse = {
  items: AlertItem[];
  page: number;
  pageSize: number;
  total: number;
};

const severityPill = (sev: 'info' | 'warning' | 'critical') => {
  switch (sev) {
    case 'critical': return 'bg-red-100 text-red-800 border-red-200';
    case 'warning':  return 'bg-amber-100 text-amber-800 border-amber-200';
    default:         return 'bg-blue-100 text-blue-800 border-blue-200';
  }
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}
function clip(s: string | null | undefined, n = 160) {
  if (!s) return '';
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

/** Ensure every item has an id; normalize server payload shape */
function normalizeFromBackend(raw: any, fallbackPage: number, fallbackPageSize: number): AlertsListResponse {
  const itemsRaw = Array.isArray(raw?.items) ? raw.items : [];

  const items: AlertItem[] = itemsRaw.map((r: any) => {
    const id =
      r?.alertId ?? r?.AlertId ?? r?.id ?? r?.Id ??
      `${r?.title ?? 'alert'}-${r?.createdAt ?? Math.random()}`;
    return {
      id,
      title: r?.title ?? r?.Title ?? '',
      createdAt: String(r?.createdAt ?? r?.CreatedAt ?? ''),
      severity: (r?.severityCode ?? r?.SeverityCode ?? 'info') as 'info' | 'warning' | 'critical',
      read: !!(r?.isRead ?? r?.IsRead ?? r?.read),
      body: r?.body ?? r?.Body ?? null,
    };
  });

  const page = Number(raw?.page ?? raw?.Page) || fallbackPage;
  const pageSize = Number(raw?.pageSize ?? raw?.PageSize) || fallbackPageSize;
  const total = Number(raw?.totalCount ?? raw?.TotalCount ?? raw?.total ?? raw?.Total ?? items.length) || 0;

  return { items, page, pageSize, total };
}

export default function AlertsPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const api = useApi();
  const { user, loaded } = useAuth();

  const userId = user?.userId || null;
  const [status, setStatus] = useState<Status>('active');
  const [severity, setSeverity] = useState<Severity>('all');
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);

  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<AlertsListResponse>({ items: [], page: 1, pageSize, total: 0 });

  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<AlertItem | null>(null);
  const openDetail = (it: AlertItem) => { setSelected(it); setDetailOpen(true); };
  const handleMarkedRead = (id: number | string) => {
    setData(prev => ({ ...prev, items: prev.items.map(x => (String(x.id) === String(id) ? { ...x, read: true } : x)) }));
  };

  const totalPages = useMemo(
    () => (data.total <= 0 ? 1 : Math.max(1, Math.ceil(data.total / data.pageSize))),
    [data.total, data.pageSize]
  );

  const fetchAlerts = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const params: Record<string, any> = { page, pageSize };

      // Map UI status to API flags
      if (status === 'unread') params.onlyUnread = true;
      if (status === 'all') params.includeArchived = true;
      // active => default (includeArchived=false, onlyUnread=false)

      if (severity !== 'all') params.severity = severity;

      const res = await api.get('/alerts', { params });
      const normalized = normalizeFromBackend(res.data, page, pageSize);
      setData(normalized);
    } catch (err: any) {
      setData(prev => ({ ...prev, items: [], total: 0 }));
      if (err?.response?.status === 401) {
        router.replace('/');
      } else {
        toast.error(t('alertsPage.toast.fetchError'));
      }
    } finally {
      setLoading(false);
    }
  }, [api, page, pageSize, severity, status, t, userId, router]);

  useEffect(() => {
    if (!loaded) return;
    if (!userId) { router.replace('/'); return; }
    fetchAlerts();
  }, [fetchAlerts, loaded, router, userId]);

  useEffect(() => {
    if (!userId || !loaded) return;
    setPage(1);
  }, [status, severity, loaded, userId]);

  useEffect(() => {
    if (!userId || !loaded) return;
    fetchAlerts();
  }, [page, fetchAlerts, loaded, userId]);

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-800">{t('alertsPage.title')}</h1>

        <div className="flex items-center gap-3">
          <label htmlFor="status" className="text-sm text-gray-600">{t('alertsPage.filter.status')}</label>
          <select
            id="status"
            className="border rounded-md p-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
          >
            <option value="active">{t('alertsPage.filter.statusActive')}</option>
            <option value="unread">{t('alertsPage.filter.statusUnread')}</option>
            <option value="all">{t('alertsPage.filter.statusAll')}</option>
          </select>

          <label htmlFor="severity" className="text-sm text-gray-600">{t('alertsPage.filter.label')}</label>
          <select
            id="severity"
            className="border rounded-md p-2 text-sm"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as Severity)}
          >
            <option value="all">{t('alertsPage.filter.all')}</option>
            <option value="info">{t('severity.info')}</option>
            <option value="warning">{t('severity.warning')}</option>
            <option value="critical">{t('severity.critical')}</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-2 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
          <div className="col-span-4">{t('alertsPage.table.title')}</div>
          <div className="col-span-2">{t('alertsPage.table.severity')}</div>
          <div className="col-span-4">{t('alertsPage.table.body')}</div>
          <div className="col-span-1">{t('alertsPage.table.createdAt')}</div>
          <div className="col-span-1 text-center">{t('alertsPage.table.status')}</div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 px-4 py-8 text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{t('alerts.loading')}</span>
          </div>
        ) : data.items.length === 0 ? (
          <div className="px-4 py-8 text-gray-500 text-sm">{t('alerts.noAlerts')}</div>
        ) : (
          <ul className="divide-y">
            {data.items.map((it, idx) => {
              const key = (it.id ?? '') !== '' ? String(it.id) : `row-${idx}-${it.createdAt}`;
              return (
                <li
                  key={key}
                  className="grid grid-cols-12 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => openDetail(it)}
                >
                  <div className="col-span-4 truncate">
                    <div className="text-gray-900 text-[15px] font-medium truncate">{it.title}</div>
                  </div>
                  <div className="col-span-2">
                    <span className={`inline-block px-2 py-0.5 text-xs border rounded ${severityPill(it.severity)}`}>
                      {t(`severity.${it.severity}`)}
                    </span>
                  </div>
                  <div className="col-span-4 text-sm text-gray-700 truncate">{clip(it.body, 160)}</div>
                  <div className="col-span-1 text-sm text-gray-700">{formatDate(it.createdAt)}</div>
                  <div className="col-span-1 text-center">
                    {it.read ? (
                      <span className="text-xs text-gray-500">{t('alertsPage.status.read')}</span>
                    ) : (
                      <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
                        {t('alerts.new')}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
          <div className="text-gray-600">
            {t('alertsPage.pager.summary', {
              from: data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1,
              to: Math.min(data.page * data.pageSize, data.total),
              total: data.total,
            })}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={data.page <= 1 || loading}
            >
              {t('alertsPage.pager.prev')}
            </button>
            <span className="px-2">
              {t('alertsPage.pager.pageOf', { page: data.page, totalPages: Math.max(1, Math.ceil(data.total / data.pageSize)) })}
            </span>
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(Math.max(1, Math.ceil(data.total / data.pageSize)), p + 1))}
              disabled={data.page >= Math.max(1, Math.ceil(data.total / data.pageSize)) || loading}
            >
              {t('alertsPage.pager.next')}
            </button>
          </div>
        </div>
      </div>

      <AlertDetailModal
        open={detailOpen}
        alert={selected}
        onOpenChange={setDetailOpen}
        onMarkedRead={handleMarkedRead}
      />
    </div>
  );
}
