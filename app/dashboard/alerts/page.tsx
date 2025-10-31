'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApi } from '@/utils/api';
import AlertDetailModal from '../components/AlertDetailModal';

type Severity = 'info' | 'warning' | 'critical';

export type AlertItem = {
  id: number;                       // normalized to number
  title: string;
  body?: string;

  createdAt: string;
  readAt?: string | null;
  archivedAt?: string | null;
  expiresAt?: string | null;

  read?: boolean;
  archived?: boolean;

  severity: Severity;
  severityId?: number;
  severityName?: string;
  severityRank?: number;
  colorHex?: string | null;

  source?: string | null;
  sourceRef?: string | null;
};

type AlertsQuery = {
  page: number;
  pageSize: number;
  status?: 'active' | 'archived' | 'all';
  onlyUnread?: boolean;
  onlyRead?: boolean;
  severity?: Severity;
  search?: string;
};

type BackendItem = {
  id: string | number;
  title: string;
  body?: string | null;

  createdAtUtc?: string | null;
  createdAt?: string | null;
  isRead?: boolean | number | string;
  readAt?: string | null;
  archivedAt?: string | null;
  expiresAt?: string | null;

  severityId?: number;
  severityCode?: string | null;
  severityName?: string | null;
  severityRank?: number | null;
  colorHex?: string | null;

  source?: string | null;
  sourceRef?: string | null;
};

type BackendResponse = {
  items: BackendItem[];
  page: number;
  pageSize: number;
  totalCount: number;
};

type AlertsState = {
  items: AlertItem[];
  page: number;
  pageSize: number;
  total: number;
};

const DEFAULT_PAGE_SIZE = 10;

function normalizeFromBackend(res: BackendResponse, page: number, pageSize: number): AlertsState {
  const toSeverity = (raw?: string | null): Severity => {
    const v = (raw ?? '').trim().toLowerCase();
    return (v === 'info' || v === 'warning' || v === 'critical') ? (v as Severity) : 'info';
  };

  const items: AlertItem[] = (res?.items ?? []).map((a) => {
    const idNum = typeof a.id === 'number' ? a.id : Number(a.id);
    const createdIso = a.createdAtUtc ?? a.createdAt ?? new Date().toISOString();

    const isRead =
      a.isRead === true ||
      a.isRead === 1 ||
      a.isRead === '1' ||
      !!a.readAt;

    const rawSeverity = a.severityCode ?? (a as any).severity;

    return {
      id: Number.isFinite(idNum) ? idNum : Math.random(),
      title: a.title,
      body: a.body ?? undefined,

      createdAt: createdIso,
      readAt: a.readAt ?? null,
      archivedAt: a.archivedAt ?? null,
      expiresAt: a.expiresAt ?? null,

      read: !!isRead,
      archived: !!a.archivedAt,

      severity: toSeverity(rawSeverity),
      severityId: a.severityId,
      severityName: a.severityName ?? undefined,
      severityRank: a.severityRank ?? undefined,
      colorHex: a.colorHex ?? null,

      source: a.source ?? undefined,
      sourceRef: a.sourceRef ?? undefined,
    };
  });

  return { items, page, pageSize, total: res?.totalCount ?? items.length };
}

// dynamic color helpers
function hexToRgba10(hex?: string | null): string | undefined {
  if (!hex || !/^#([0-9A-Fa-f]{6})$/.test(hex)) return undefined;
  return `${hex}1A`;
}
const basePill = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border';
function fallbackPill(sev: Severity) {
  return sev === 'critical'
    ? 'inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800'
    : sev === 'warning'
    ? 'inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800'
    : 'inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800';
}

export default function AlertsPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const api = useApi();

  // keep rows visible while reloading (no blink)
  const [loading, setLoading] = React.useState<boolean>(false);
  const [initialized, setInitialized] = React.useState<boolean>(false);
  const loadingRef = React.useRef(false);

  type ViewFilter = 'all' | 'unread' | 'read' | 'archived';
  const [view, setView] = React.useState<ViewFilter>('all');

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

  const fetchIdRef = React.useRef(0);

  const fetchAlerts = React.useCallback(async () => {
    // prevent overlapping fetches
    if (loadingRef.current) return;
    loadingRef.current = true;

    const thisFetchId = ++fetchIdRef.current;
    // subtle loading state — we won’t switch table to “Loading…”
    setLoading(true);

    try {
      const params: AlertsQuery = { page, pageSize };

      if (view === 'archived') {
        params.status = 'archived';
      } else {
        params.status = 'all';
        if (view === 'unread') params.onlyUnread = true;
        if (view === 'read') params.onlyRead = true;
      }

      if (severity !== 'all') params.severity = (String(severity).toLowerCase() as Severity);

      const res = await api.get<BackendResponse>('/alerts', { params });
      if (thisFetchId !== fetchIdRef.current) return;

      const next = normalizeFromBackend(res.data, page, pageSize);
      setData(prev => {
        // Avoid re-render churn if data is effectively the same length & ids (optional micro-opt)
        if (prev.total === next.total && prev.items.length === next.items.length) return next;
        return next;
      });
      setInitialized(true);
    } catch (err: any) {
      if (thisFetchId !== fetchIdRef.current) return;
      // Don’t clear table on error — no blink; only toast
      if (err?.response?.status === 401) router.replace('/');
      else toast.error(t('alertsPage.toast.fetchError'));
    } finally {
      if (thisFetchId === fetchIdRef.current) setLoading(false);
      loadingRef.current = false;
    }
  }, [api, page, pageSize, severity, view, t, router]);

  // initial + filter changes
  React.useEffect(() => { fetchAlerts(); }, [fetchAlerts]);
  React.useEffect(() => { setPage(1); }, [view, severity]);

  // deep-link open by ?id=
  React.useEffect(() => {
    const idParam = searchParams.get('id');
    if (!idParam || data.items.length === 0) return;

    const idNum = Number(idParam);
    const found = data.items.find((it) => it.id === (Number.isFinite(idNum) ? idNum : (it.id as any)));
    if (found) { setSelected(found); setDetailOpen(true); }
  }, [searchParams, data.items]);

  // listen for global refresh events fired by the modal/actions
  React.useEffect(() => {
    const handler = () => fetchAlerts();
    window.addEventListener('alerts-updated', handler);
    return () => window.removeEventListener('alerts-updated', handler);
  }, [fetchAlerts]);

  const openDetail = (alert: AlertItem) => { setSelected(alert); setDetailOpen(true); };

  const removeIfNoLongerMatches = (updated: AlertItem): boolean => {
    if (view === 'unread' && updated.read) return true;
    if (view === 'read' && !updated.read) return true;
    if (view === 'archived' && !updated.archived) return true;
    return false;
  };

  const onMarkedRead = (id: string | number) => {
    setData((prev) => {
      const items = prev.items
        .map((it) => (it.id == id ? { ...it, read: true, readAt: new Date().toISOString() } : it))
        .filter((it) => !removeIfNoLongerMatches(it));
      return { ...prev, items, total: prev.total - (items.length < prev.items.length ? 1 : 0) };
    });
  };

  const onMarkedUnread = (id: string | number) => {
    setData((prev) => {
      const items = prev.items
        .map((it) => (it.id == id ? { ...it, read: false, readAt: null } : it))
        .filter((it) => !removeIfNoLongerMatches(it));
      return { ...prev, items, total: prev.total - (items.length < prev.items.length ? 1 : 0) };
    });
  };

  const markAllRead = async () => {
    try {
      await api.post('/alerts/mark-all-read', {});
      setData((prev) => {
        if (view === 'unread') return { ...prev, items: [], total: prev.total - prev.items.length };
        return { ...prev, items: prev.items.map((it) => ({ ...it, read: true, readAt: new Date().toISOString() })) };
      });
      try { window.dispatchEvent(new Event('alerts-updated')); } catch {}
      toast.success(t('alertsPage.toast.markedAllRead'));
    } catch {
      toast.error(t('alertsPage.toast.markAllReadError'));
    }
  };

  const archiveAll = async () => {
    try {
      await api.post('/alerts/archive-all', {});
      toast.success(t('alertsPage.toast.archivedAll'));
      try { window.dispatchEvent(new Event('alerts-updated')); } catch {}
      fetchAlerts();
    } catch {
      toast.error(t('alertsPage.toast.archiveAllError'));
    }
  };

  const showInitialLoading = !initialized && loading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t('alertsPage.title')}</h1>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={markAllRead}
            className="px-3 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            {t('alertsPage.actions.markAllRead')}
          </button>
          <button
            type="button"
            onClick={archiveAll}
            className="px-3 py-2 rounded-md text-sm font-medium border hover:bg-gray-50 transition"
          >
            {t('alertsPage.actions.archiveAll')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* View */}
        <div className="flex items-center gap-2">
          <label className="text-sm">{t('alertsPage.filters.view')}:</label>
          <select
            className="rounded-md border px-2 py-1 text-sm"
            value={view}
            onChange={(e) => setView(e.target.value as any)}
          >
            <option value="all">{t('alertsPage.filters.all')}</option>
            <option value="unread">{t('alertsPage.filters.unread')}</option>
            <option value="read">{t('alertsPage.filters.read')}</option>
            <option value="archived">{t('alertsPage.filters.archived')}</option>
          </select>
        </div>

        {/* Severity */}
        <div className="flex items-center gap-2">
          <label className="text-sm">{t('alertsPage.filters.severity')}:</label>
          <select
            className="rounded-md border px-2 py-1 text-sm"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as 'all' | Severity)}
          >
            <option value="all">{t('alertsPage.filters.all')}</option>
            <option value="info">{t('severity.info')}</option>
            <option value="warning">{t('severity.warning')}</option>
            <option value="critical">{t('severity.critical')}</option>
          </select>
        </div>

        {/* Page size */}
        <div className="flex items-center gap-2">
          <label className="text-sm">{t('alertsPage.filters.pageSize')}:</label>
          <select
            className="rounded-md border px-2 py-1 text-sm"
            value={pageSize}
            onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
          >
            {[10, 20, 50].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table (keeps previous rows during reload) */}
      <div className="relative overflow-hidden rounded-md border">
        {/* Optional top-right spinner while loading after init */}
        {initialized && loading && (
          <div className="pointer-events-none absolute right-3 top-3 text-xs text-gray-500 flex items-center gap-2">
            <span className="inline-block h-2 w-2 animate-ping rounded-full bg-blue-400" />
            {t('alertsPage.loading')}
          </div>
        )}

        <table className="min-w-full divide-y">
          <thead className="bg-gray-50">
            <tr className="text-left text-sm font-medium text-gray-700">
              <th className="px-4 py-3 w-[26%]">{t('alertsPage.table.title')}</th>
              <th className="px-4 py-3 w-[34%]">{t('alertsPage.table.body')}</th>
              <th className="px-4 py-3 w-[14%]">{t('alertsPage.table.severity')}</th>
              <th className="px-4 py-3 w-[18%]">{t('alertsPage.table.created')}</th>
              <th className="px-4 py-3 w-[8%]">{t('alertsPage.table.status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {showInitialLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm">
                  {t('alertsPage.loading')}
                </td>
              </tr>
            ) : data.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm">
                  {t('alertsPage.empty')}
                </td>
              </tr>
            ) : (
              data.items.map((a) => (
                <tr
                  key={a.id}
                  className="text-sm hover:bg-gray-50 cursor-pointer"
                  onClick={() => { setSelected(a); setDetailOpen(true); }}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(a); setDetailOpen(true); }
                  }}
                  aria-label={t('alertsPage.actions.viewAlert')}
                >
                  {/* Title */}
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center gap-2 min-w-0">
                      {!a.read && <span className="inline-block h-2 w-2 rounded-full bg-blue-600" />}
                      <span className="truncate font-medium" title={a.title}>{a.title}</span>
                    </div>
                    {a.source && (
                      <div className="mt-0.5 text-xs text-gray-500 truncate" title={a.sourceRef || ''}>
                        {a.source}{a.sourceRef ? ` · ${a.sourceRef}` : ''}
                      </div>
                    )}
                  </td>

                  {/* Body */}
                  <td className="px-4 py-3 align-middle">
                    <div className="min-w-0 truncate text-gray-700" title={a.body || ''}>
                      {a.body || '—'}
                    </div>
                    {a.expiresAt && (
                      <div className="mt-0.5 text-xs text-gray-500">
                        {t('alertsPage.row.expires')}:&nbsp;
                        <time dateTime={a.expiresAt}>{new Date(a.expiresAt).toLocaleString()}</time>
                      </div>
                    )}
                  </td>

                  {/* Severity */}
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center gap-2">
                      {a.colorHex ? (
                        <span
                          className={basePill}
                          style={{
                            color: a.colorHex || undefined,
                            borderColor: a.colorHex || undefined,
                            backgroundColor: hexToRgba10(a.colorHex),
                          }}
                        >
                          {a.severityName ?? t(`severity.${a.severity}`, a.severity)}
                        </span>
                      ) : (
                        <span className={fallbackPill(a.severity)}>
                          {a.severityName ?? t(`severity.${a.severity}`, a.severity)}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Created */}
                  <td className="px-4 py-3 align-middle text-gray-600">
                    <div>
                      <time dateTime={a.createdAt} title={new Date(a.createdAt).toLocaleString()}>
                        {new Date(a.createdAt).toLocaleString()}
                      </time>
                    </div>
                    {(a.readAt || a.archivedAt) && (
                      <div className="mt-1 space-y-1">
                        {a.readAt && (
                          <div className="text-xs text-gray-500">
                            {t('alertsPage.row.readAt')}:&nbsp;
                            <time dateTime={a.readAt!}>{new Date(a.readAt!).toLocaleString()}</time>
                          </div>
                        )}
                        {a.archivedAt && (
                          <div className="text-xs text-gray-500">
                            {t('alertsPage.row.archivedAt')}:&nbsp;
                            <time dateTime={a.archivedAt!}>{new Date(a.archivedAt!).toLocaleString()}</time>
                          </div>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 align-middle">
                    {a.archived
                      ? t('alertsPage.row.archived')
                      : a.read
                      ? t('alertsPage.row.read')
                      : t('alertsPage.row.unread')}
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
            {t('alertsPage.pager.prev')}
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
            {t('alertsPage.pager.next')}
          </button>
        </div>
      </div>

      {/* Detail modal */}
      <AlertDetailModal
        isOpen={detailOpen}
        alert={selected}
        onClose={() => setDetailOpen(false)}
        onMarkedRead={onMarkedRead}
        onMarkedUnread={onMarkedUnread}
      />
    </div>
  );
}
