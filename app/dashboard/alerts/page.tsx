'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApi } from '@/utils/api';
import AlertDetailModal from '../components/AlertDetailModal';

type Severity = 'info' | 'warning' | 'critical';

export type AlertItem = {
  id: string | number;
  title: string;
  body?: string;
  createdAt: string; // ISO
  severity: Severity;
  read?: boolean;
  archived?: boolean;
};

type AlertsQuery = {
  page: number;
  pageSize: number;
  onlyUnread?: boolean;
  includeArchived?: boolean;
  severity?: Severity;
};

type AlertsResponse = {
  items: Array<{
    id: string | number;
    title: string;
    message?: string;
    createdAt: string;
    severity: Severity;
    read?: boolean;
    archived?: boolean;
  }>;
  total: number;
};

type AlertsState = {
  items: AlertItem[];
  page: number;
  pageSize: number;
  total: number;
};

const DEFAULT_PAGE_SIZE = 10;

function normalizeFromBackend(
  res: AlertsResponse,
  page: number,
  pageSize: number
): AlertsState {
  const items: AlertItem[] = (res?.items ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    body: a.message ?? '',
    createdAt: a.createdAt,
    severity: a.severity,
    read: !!a.read,
    archived: !!a.archived,
  }));
  return {
    items,
    page,
    pageSize,
    total: res?.total ?? items.length,
  };
}

export default function AlertsPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const api = useApi();

  const [loading, setLoading] = React.useState<boolean>(true);

  const [status, setStatus] = React.useState<'all' | 'unread'>('all');
  const [severity, setSeverity] = React.useState<'all' | Severity>('all');

  const [page, setPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(DEFAULT_PAGE_SIZE);

  const [data, setData] = React.useState<AlertsState>({
    items: [],
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
  });

  const [selected, setSelected] = React.useState<AlertItem | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);

  // Guard against stale requests
  const fetchIdRef = React.useRef(0);

  const fetchAlerts = React.useCallback(async () => {
    const thisFetchId = ++fetchIdRef.current;
    setLoading(true);
    try {
      const params: AlertsQuery = { page, pageSize };
      if (status === 'unread') params.onlyUnread = true;
      if (status === 'all') params.includeArchived = true;
      if (severity !== 'all') params.severity = severity as Severity;

      const res = await api.get<AlertsResponse>('/alerts', { params });
      if (thisFetchId !== fetchIdRef.current) return; // ignore stale

      const normalized = normalizeFromBackend(res.data, page, pageSize);
      setData(normalized);
    } catch (err: any) {
      if (thisFetchId !== fetchIdRef.current) return;
      setData((prev) => ({ ...prev, items: [], total: 0 }));
      if (err?.response?.status === 401) {
        router.replace('/');
      } else {
        toast.error(t('alertsPage.toast.fetchError'));
      }
    } finally {
      if (thisFetchId === fetchIdRef.current) setLoading(false);
    }
  }, [api, page, pageSize, severity, status, t, router]);

  // Initial + whenever filters/paging change
  React.useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // If filters change, reset to page 1
  React.useEffect(() => {
    setPage(1);
  }, [status, severity]);

  // Auto-open if URL has ?id=
  React.useEffect(() => {
    const idParam = searchParams.get('id');
    if (!idParam || data.items.length === 0) return;
    const found = data.items.find((it) => String(it.id) === idParam);
    if (found) {
      setSelected(found);
      setDetailOpen(true);
    }
  }, [searchParams, data.items]);

  const openDetail = (alert: AlertItem) => {
    setSelected(alert);
    setDetailOpen(true);
  };

  const onMarkedRead = (id: string | number) => {
    setData((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === id ? { ...it, read: true } : it)),
    }));
  };

  const markAllRead = async () => {
    try {
      await api.post('/alerts/mark-all-read');
      setData((prev) => ({
        ...prev,
        items: prev.items.map((it) => ({ ...it, read: true })),
      }));
      toast.success(t('alertsPage.toast.markedAllRead'));
    } catch {
      toast.error(t('alertsPage.toast.markAllReadError'));
    }
  };

  const archiveAll = async () => {
    try {
      await api.post('/alerts/archive-all');
      toast.success(t('alertsPage.toast.archivedAll', 'All alerts archived'));
      fetchAlerts();
    } catch {
      toast.error(t('alertsPage.toast.archiveAllError', 'Failed to archive alerts'));
    }
  };

  const pageFrom = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const pageTo = Math.min(data.page * data.pageSize, data.total);

  // Row keyboard handler (Enter/Space to open)
  const onRowKey = (e: React.KeyboardEvent<HTMLTableRowElement>, a: AlertItem) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openDetail(a);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          {t('alertsPage.title', 'Your alerts')}
        </h1>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={markAllRead}
            className="px-3 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            {t('alertsPage.actions.markAllRead', 'Mark all as read')}
          </button>
          <button
            type="button"
            onClick={archiveAll}
            className="px-3 py-2 rounded-md text-sm font-medium border hover:bg-gray-50 transition"
          >
            {t('alertsPage.actions.archiveAll', 'Archive all')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status */}
        <div className="flex items-center gap-2">
          <label className="text-sm">{t('alertsPage.filters.status', 'Status')}:</label>
          <select
            className="rounded-md border px-2 py-1 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'all' | 'unread')}
          >
            <option value="all">{t('alertsPage.filters.all', 'All')}</option>
            <option value="unread">{t('alertsPage.filters.unread', 'Unread')}</option>
          </select>
        </div>

        {/* Severity */}
        <div className="flex items-center gap-2">
          <label className="text-sm">{t('alertsPage.filters.severity', 'Severity')}:</label>
          <select
            className="rounded-md border px-2 py-1 text-sm"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as 'all' | Severity)}
          >
            <option value="all">{t('alertsPage.filters.all', 'All')}</option>
            <option value="info">{t('alertsPage.filters.info', 'Info')}</option>
            <option value="warning">{t('alertsPage.filters.warning', 'Warning')}</option>
            <option value="critical">{t('alertsPage.filters.critical', 'Critical')}</option>
          </select>
        </div>

        {/* Page size */}
        <div className="flex items-center gap-2">
          <label className="text-sm">{t('alertsPage.filters.pageSize', 'Page size')}:</label>
          <select
            className="rounded-md border px-2 py-1 text-sm"
            value={pageSize}
            onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
          >
            {[10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table (real cells per column to preserve alignment) */}
      <div className="overflow-hidden rounded-md border">
        <table className="min-w-full divide-y">
          <thead className="bg-gray-50">
            <tr className="text-left text-sm font-medium text-gray-700">
              <th className="px-4 py-3 w-[28%]">{t('alertsPage.table.title', 'Title')}</th>
              <th className="px-4 py-3 w-[36%]">{t('alertsPage.table.body', 'Body')}</th>
              <th className="px-4 py-3 w-[12%]">{t('alertsPage.table.severity', 'Severity')}</th>
              <th className="px-4 py-3 w-[16%]">{t('alertsPage.table.created', 'Created')}</th>
              <th className="px-4 py-3 w-[8%]">{t('alertsPage.table.status', 'Status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm">
                  {t('alertsPage.loading', 'Loading…')}
                </td>
              </tr>
            ) : data.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm">
                  {t('alertsPage.empty', 'No alerts found')}
                </td>
              </tr>
            ) : (
              data.items.map((a) => (
                <tr
                  key={a.id}
                  className="text-sm hover:bg-gray-50 cursor-pointer"
                  onClick={() => openDetail(a)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => onRowKey(e, a)}
                  aria-label={t('alertsPage.actions.viewAlert', 'View alert')}
                >
                  {/* Title */}
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center gap-2 min-w-0">
                      {!a.read && <span className="inline-block h-2 w-2 rounded-full bg-blue-600" />}
                      <span className="truncate font-medium" title={a.title}>
                        {a.title}
                      </span>
                    </div>
                  </td>

                  {/* Body (visible, truncated to one line; tooltip shows full text) */}
                  <td className="px-4 py-3 align-middle">
                    <div className="min-w-0 truncate text-gray-700" title={a.body || ''}>
                      {a.body || '—'}
                    </div>
                  </td>

                  {/* Severity */}
                  <td className="px-4 py-3 align-middle">
                    <span
                      className={
                        a.severity === 'critical'
                          ? 'inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800'
                          : a.severity === 'warning'
                          ? 'inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800'
                          : 'inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800'
                      }
                    >
                      {a.severity}
                    </span>
                  </td>

                  {/* Created */}
                  <td className="px-4 py-3 align-middle text-gray-600">
                    <time dateTime={a.createdAt} title={new Date(a.createdAt).toLocaleString()}>
                      {new Date(a.createdAt).toLocaleString()}
                    </time>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 align-middle">
                    {a.read
                      ? t('alertsPage.row.read', 'Read')
                      : t('alertsPage.row.unread', 'Unread')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pager */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600" aria-live="polite">
          {t('alertsPage.pager.summary', {
            from: data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1,
            to: Math.min(data.page * data.pageSize, data.total),
            total: data.total,
          })}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
          >
            {t('alertsPage.pager.prev', 'Prev')}
          </button>
          <span className="text-sm">
            {t('alertsPage.pager.pageXofY', {
              x: page,
              y: Math.max(1, Math.ceil(data.total / pageSize)),
            })}
          </span>
          <button
            type="button"
            className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
            onClick={() =>
              setPage((p) =>
                Math.min(Math.ceil(Math.max(1, data.total) / pageSize), p + 1)
              )
            }
            disabled={page >= Math.ceil(Math.max(1, data.total) / pageSize) || loading}
          >
            {t('alertsPage.pager.next', 'Next')}
          </button>
        </div>
      </div>

      {/* Detail modal */}
      <AlertDetailModal
        isOpen={detailOpen}
        alert={selected}
        onClose={() => setDetailOpen(false)}
        onMarkedRead={onMarkedRead}
      />
    </div>
  );
}
