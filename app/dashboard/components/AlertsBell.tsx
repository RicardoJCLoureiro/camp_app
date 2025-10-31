'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useApi } from '@/utils/api';

type Severity = 'info' | 'warning' | 'critical';

type AlertItem = {
  id: string | number;
  title: string;
  createdAt: string; // ISO
  severity: Severity;
  read?: boolean;
};

type BackendAlertItem = {
  id: string | number;
  title: string;
  createdAtUtc?: string;
  createdAt?: string;
  severityCode?: string;
  isRead?: boolean;
  read?: boolean;
};

type BackendSummary = {
  unreadCount?: number;
  UnreadCount?: number;
  items?: BackendAlertItem[];
  Items?: BackendAlertItem[];
};

type AlertsSummary = { unreadCount: number; items: AlertItem[] };

interface Props {
  /** Polling interval (ms). Default: 30s */
  refreshMs?: number;
}

function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - d);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  return `${day}d`;
}

function toNumberId(id: string | number) {
  const n = Number(id);
  return Number.isFinite(n) ? n : 0;
}

function isSameSummary(a: AlertsSummary, b: AlertsSummary) {
  if (a.unreadCount !== b.unreadCount) return false;
  if (a.items.length !== b.items.length) return false;
  for (let i = 0; i < a.items.length; i++) {
    if (a.items[i].id !== b.items[i].id) return false;
  }
  return true;
}

export default function AlertsBell({ refreshMs = 30_000 }: Props) {
  const { t } = useTranslation('common');
  const api = useApi();
  const router = useRouter();

  // popover (kept, but bell navigates directly)
  const [open, setOpen] = React.useState(false);
  const btnRef = React.useRef<HTMLButtonElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);

  // summary state + refs to avoid mid-fetch clears (no blink)
  const [summary, setSummary] = React.useState<AlertsSummary>({
    unreadCount: 0,
    items: [],
  });
  const summaryRef = React.useRef(summary);
  const loadingRef = React.useRef(false);

  const didFirstLoadRef = React.useRef(false);
  const lastUnreadRef = React.useRef(0);
  const lastMaxIdRef = React.useRef(0);

  const fetchAlerts = React.useCallback(async () => {
    // prevent overlapping fetches (another cause of flicker)
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      const res = await api.get<BackendSummary>('/alerts/summary', { params: { max: 12 } });
      const backend = res.data ?? {};

      const unreadRaw = (backend.unreadCount ?? backend.UnreadCount ?? 0);
      const rawItems = (backend.items ?? backend.Items ?? []) as BackendAlertItem[];

      const items = rawItems.map<AlertItem>((r) => ({
        id: r.id,
        title: r.title,
        createdAt: r.createdAtUtc ?? r.createdAt ?? new Date().toISOString(),
        severity:
          (r.severityCode as Severity) && ['info', 'warning', 'critical'].includes(r.severityCode!)
            ? (r.severityCode as Severity)
            : 'info',
        read: r.isRead ?? r.read ?? false,
      }));

      const next: AlertsSummary = { unreadCount: unreadRaw, items };

      // Only commit if actually changed — avoids render "blink"
      if (!isSameSummary(summaryRef.current, next)) {
        summaryRef.current = next;
        setSummary(next);
      }

      // Detect "new alert" (toast) after first load only
      const maxId = Math.max(0, ...items.map((it) => toNumberId(it.id)));
      if (didFirstLoadRef.current) {
        const unreadIncreased = next.unreadCount > lastUnreadRef.current;
        const newIdAppeared = maxId > lastMaxIdRef.current;

        if (!document.hidden && (unreadIncreased || newIdAppeared)) {
          toast.info(t('alertsBell.newAlert'));
        }
      } else {
        didFirstLoadRef.current = true;
      }

      lastUnreadRef.current = next.unreadCount;
      lastMaxIdRef.current = maxId;
    } catch {
      // silent — keep prior summary (no clearing = no blink)
    } finally {
      loadingRef.current = false;
    }
  }, [api, t]);

  // Polling + visibility-aware restart
  React.useEffect(() => {
    let timer: number | null = null;
    let stopped = false;

    const start = async () => {
      await fetchAlerts();
      if (stopped) return;
      timer = window.setInterval(fetchAlerts, refreshMs);
    };

    const stop = () => {
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        stop();
        fetchAlerts().finally(() => {
          if (!stopped) timer = window.setInterval(fetchAlerts, refreshMs);
        });
      }
    };

    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stopped = true;
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchAlerts, refreshMs]);

  // Close popover by outside click
  React.useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const tNode = e.target as Node;
      if (panelRef.current && !panelRef.current.contains(tNode) &&
          btnRef.current && !btnRef.current.contains(tNode)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  // ESC to close
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Refresh on inline actions
  React.useEffect(() => {
    const onUpdated = () => fetchAlerts();
    window.addEventListener('alerts-updated', onUpdated);
    return () => window.removeEventListener('alerts-updated', onUpdated);
  }, [fetchAlerts]);

  const goToAlertsPage = React.useCallback(
    (id?: string | number) => {
      setOpen(false);
      const url = id != null ? `/dashboard/alerts?id=${encodeURIComponent(String(id))}` : '/dashboard/alerts';
      router.push(url);
    },
    [router]
  );

  const bellHasUnread = summary.unreadCount > 0;

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        id="alerts-bell"
        ref={btnRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={false}
        aria-controls="alerts-popover"
        onClick={() => goToAlertsPage()}
        className={[
          'relative inline-flex h-10 w-10 items-center justify-center rounded-full',
          'bg-gradient-to-b from-white to-gray-100 dark:from-zinc-800 dark:to-zinc-900',
          'shadow-sm ring-1 ring-black/5 dark:ring-white/10',
          'transition-transform hover:scale-[1.03] active:scale-95',
        ].join(' ')}
        title={t('alertsBell.title')}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-gray-800 dark:text-zinc-200" aria-hidden="true">
          <path d="M12 2a6 6 0 00-6 6v2.586c0 .265-.105.52-.293.707L4.293 13A1 1 0 005 14.707h14A1 1 0 0020 13l-1.414-1.414A1 1 0 0118 10.586V8a6 6 0 00-6-6z" fill="currentColor" />
          <path d="M8 18a4 4 0 008 0H8z" fill="currentColor" />
        </svg>

        {bellHasUnread && (
          <>
            <span
              className={[
                'absolute -top-0.5 -right-0.5 inline-flex min-w-[1.25rem] h-5 items-center justify-center',
                'rounded-full bg-red-600 px-1 text-xs font-semibold text-white',
                'shadow-[0_0_0_2px] shadow-white dark:shadow-zinc-900',
              ].join(' ')}
            >
              {summary.unreadCount > 99 ? '99+' : summary.unreadCount}
            </span>
            <span
              className="absolute -top-0.5 -right-0.5 block h-5 w-5 animate-ping rounded-full bg-red-500/50"
              aria-hidden="true"
            />
          </>
        )}
      </button>

      {/* Optional popover (kept) */}
      {open && (
        <div
          id="alerts-popover"
          ref={panelRef}
          role="menu"
          aria-labelledby="alerts-bell"
          className={[
            'absolute right-0 mt-3 w-96 origin-top-right overflow-hidden rounded-2xl',
            'border border-black/5 bg-white/80 backdrop-blur-xl dark:bg-zinc-900/70 dark:border-white/10',
            'shadow-xl ring-1 ring-black/5 dark:ring-white/10',
          ].join(' ')}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <div className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
              {t('alertsBell.header')}
            </div>
            <button
              type="button"
              onClick={() => goToAlertsPage()}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-sky-400 dark:hover:text-sky-300"
            >
              {t('alertsBell.viewAll')}
            </button>
          </div>

          <div className="max-h-96 overflow-auto">
            {summary.items.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-gray-600 dark:text-zinc-400">
                {t('alertsBell.empty')}
              </div>
            ) : (
              <ul className="divide-y divide-black/5 dark:divide-white/10">
                {summary.items.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => goToAlertsPage(a.id)}
                      className={[
                        'group flex w-full items-start gap-3 px-4 py-3 text-left',
                        'transition-all hover:bg-gradient-to-r hover:from-blue-50 hover:to-transparent dark:hover:from-white/5',
                      ].join(' ')}
                    >
                      <div className="mt-1">
                        {!a.read ? (
                          <span className="relative block h-2.5 w-2.5 rounded-full bg-blue-600">
                            <span className="absolute inset-0 animate-ping rounded-full bg-blue-500/50" />
                          </span>
                        ) : (
                          <span className="block h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-zinc-700" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate text-sm font-medium text-gray-900 dark:text-zinc-100">
                            {a.title}
                          </span>
                          <span
                            className={[
                              'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                              a.severity === 'critical'
                                ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white'
                                : a.severity === 'warning'
                                ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white'
                                : 'bg-gradient-to-r from-sky-400 to-blue-500 text-white',
                              'shadow-sm',
                            ].join(' ')}
                          >
                            {t(`severity.${a.severity}`, a.severity)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
                          <time dateTime={a.createdAt} title={new Date(a.createdAt).toLocaleString()}>
                            {timeAgo(a.createdAt)} {t('alertsBell.ago')}
                          </time>
                          <span className="opacity-40">•</span>
                          <span className="opacity-70 group-hover:opacity-100 transition-opacity">
                            {t('alertsBell.open')}
                          </span>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs text-gray-600 dark:text-zinc-400">
              {t('alertsBell.footer')}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-gray-700 hover:text-gray-900 dark:text-zinc-300 dark:hover:text-zinc-100"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
