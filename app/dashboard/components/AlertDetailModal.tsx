'use client';

import * as React from 'react';
import {
  Dialog, DialogPanel, DialogTitle,
  Transition, TransitionChild,
} from '@headlessui/react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useApi } from '@/utils/api';

// Logos used in LoginForm to keep visual consistency
import verificarImg from '@/images/logo_new.png';
import myb4yImg from '@/images/logo_transparent.png';

type Severity = 'info' | 'warning' | 'critical';

export type AlertItem = {
  id: string | number;
  title: string;
  body?: string;
  createdAt: string;
  severity: Severity;
  read?: boolean;
  readAt?: string | null;
  archived?: boolean;
  archivedAt?: string | null;
  expiresAt?: string | null;
  severityId?: number;
  severityName?: string;
  severityRank?: number;
  colorHex?: string | null;
  source?: string | null;
  sourceRef?: string | null;
};

type BackendDetail = {
  alertId: number;
  title: string;
  body?: string | null;
  source?: string | null;
  sourceRef?: string | null;
  createdAt: string;
  readAt?: string | null;
  archivedAt?: string | null;
  expiresAt?: string | null;
  isRead: boolean;
  severityCode: string;
  severityName: string;
  severityRank: number;
  colorHex?: string | null;
};

interface Props {
  isOpen: boolean;
  alert: AlertItem | null;
  onClose: () => void;
  onMarkedRead?: (id: string | number) => void;
  onMarkedUnread?: (id: string | number) => void;
}

function hexToRgba10(hex?: string | null): string | undefined {
  if (!hex || !/^#([0-9A-Fa-f]{6})$/.test(hex)) return undefined;
  return `${hex}1A`;
}
const basePill =
  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border';
function fallbackPill(code?: string) {
  const sev = (code ?? 'info') as Severity;
  return sev === 'critical'
    ? 'inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800'
    : sev === 'warning'
    ? 'inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800'
    : 'inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800';
}

const btnPrimary =
  'rounded-lg bg-[var(--color-button_primary_bg)] text-[var(--color-button_primary_text)] hover:bg-[var(--color-flag_blue)]';
const btnSecondary =
  'rounded-lg bg-[var(--color-button_secondary_bg)] text-[var(--color-button_secondary_text)] hover:bg-[var(--color-flag_blue)]';
const btnGhost =
  'rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50';
const cardSurface =
  'bg-white bg-opacity-90 backdrop-blur-md rounded-2xl shadow-2xl';

export default function AlertDetailModal({
  isOpen,
  alert,
  onClose,
  onMarkedRead,
  onMarkedUnread,
}: Props) {
  const { t } = useTranslation('common');
  const api = useApi();

  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [detail, setDetail] = React.useState<BackendDetail | null>(null);

  const isRead = detail?.isRead ?? !!alert?.read;
  const isArchived = !!(detail?.archivedAt ?? alert?.archivedAt);

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!isOpen || !alert?.id) {
        setDetail(null);
        return;
      }
      setLoading(true);
      try {
        const res = await api.get<BackendDetail>(`/alerts/${alert.id}`);
        if (!cancelled) setDetail(res.data);
      } catch {
        if (!cancelled) toast.error(t('alertModal.fetchError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, alert?.id]);

  const title = detail?.title ?? alert?.title ?? t('alertModal.title');
  const createdAt = detail?.createdAt ?? alert?.createdAt ?? '';
  const body = detail?.body ?? alert?.body ?? '';
  const severityCode = (detail?.severityCode ?? alert?.severity ?? 'info') as string;
  const severityName = detail?.severityName ?? alert?.severityName ?? undefined;
  const colorHex = detail?.colorHex ?? alert?.colorHex ?? null;
  const source = detail?.source ?? alert?.source ?? null;
  const sourceRef = detail?.sourceRef ?? alert?.sourceRef ?? null;
  const readAt = detail?.readAt ?? alert?.readAt ?? null;
  const archivedAt = detail?.archivedAt ?? alert?.archivedAt ?? null;
  const expiresAt = detail?.expiresAt ?? alert?.expiresAt ?? null;

  const afterAction = (cb?: () => void) => {
    try { window.dispatchEvent(new Event('alerts-updated')); } catch {}
    cb?.();
    onClose();
  };

  const doMarkRead = async () => {
    if (!alert?.id || isRead) return;
    setSaving(true);
    try {
      await api.post('/alerts/mark-read', { ids: [alert.id] });
      setDetail((d) => (d ? { ...d, isRead: true, readAt: new Date().toISOString() } : d));
      toast.success(t('alertsPage.toast.markedRead'));
      afterAction(() => onMarkedRead?.(alert.id));
    } catch {
      toast.error(t('alertsPage.toast.markReadError'));
    } finally {
      setSaving(false);
    }
  };

  const doMarkUnread = async () => {
    if (!alert?.id || !isRead) return;
    setSaving(true);
    try {
      await api.post('/alerts/mark-unread', { ids: [alert.id] });
      setDetail((d) => (d ? { ...d, isRead: false, readAt: null } : d));
      toast.success(t('alertModal.markedUnread'));
      afterAction(() => onMarkedUnread?.(alert.id));
    } catch {
      toast.error(t('alertModal.markUnreadError'));
    } finally {
      setSaving(false);
    }
  };

  const doArchive = async () => {
    if (!alert?.id || isArchived) return;
    setSaving(true);
    try {
      await api.post('/alerts/archive', { ids: [alert.id] });
      setDetail((d) => (d ? { ...d, archivedAt: new Date().toISOString() } : d));
      toast.success(t('alertModal.archived'));
      afterAction();
    } catch {
      toast.error(t('alertModal.archiveError'));
    } finally {
      setSaving(false);
    }
  };

  const doUnarchive = async () => {
    if (!alert?.id || !isArchived) return;
    setSaving(true);
    try {
      await api.post('/alerts/unarchive', { ids: [alert.id] });
      setDetail((d) => (d ? { ...d, archivedAt: null } : d));
      toast.success(t('alertModal.unarchived'));
      afterAction();
    } catch {
      toast.error(t('alertModal.unarchiveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Overlay */}
        <TransitionChild
          as={React.Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </TransitionChild>

        {/* Panel */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              as={React.Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <DialogPanel className={`${cardSurface} w-full max-w-2xl overflow-hidden`}>
                {/* Header (consistent with LoginForm) */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200">
                  <Image src={verificarImg} alt="Logo" width={40} height={40} className="rounded-full shadow" />
                  <DialogTitle className="flex-grow text-center text-2xl font-semibold text-[var(--color-text_dark)]">
                    {title}
                  </DialogTitle>
                  <button
                    onClick={onClose}
                    className="w-10 h-10 grid place-items-center rounded-full border hover:bg-gray-50"
                    aria-label={t('common.close')}
                    title={t('common.close')}
                  >
                    ✕
                  </button>
                </div>

                {/* Body */}
                <div className="px-8 py-6">
                  {/* meta row */}
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    {colorHex ? (
                      <span
                        className={basePill}
                        style={{
                          color: colorHex || undefined,
                          borderColor: colorHex || undefined,
                          backgroundColor: hexToRgba10(colorHex),
                        }}
                      >
                        {severityName ?? t(`severity.${severityCode as Severity}`, String(severityCode))}
                      </span>
                    ) : (
                      <span className={fallbackPill(severityCode)}>
                        {severityName ?? t(`severity.${severityCode as Severity}`, String(severityCode))}
                      </span>
                    )}

                    {createdAt && (
                      <>
                        <span className="text-gray-400">•</span>
                        <time
                          className="text-gray-600"
                          dateTime={createdAt}
                          title={new Date(createdAt).toLocaleString()}
                        >
                          {new Date(createdAt).toLocaleString()}
                        </time>
                      </>
                    )}

                    {source && (
                      <>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-600">
                          {source}{sourceRef ? ` · ${sourceRef}` : ''}
                        </span>
                      </>
                    )}
                  </div>

                  {/* animated body/content */}
                  <div className="mt-4">
                    <AnimatePresence initial={false} mode="wait">
                      {loading ? (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="animate-pulse space-y-3"
                        >
                          <div className="h-3 w-3/4 rounded bg-gray-200" />
                          <div className="h-3 w-full rounded bg-gray-200" />
                          <div className="h-3 w-5/6 rounded bg-gray-200" />
                        </motion.div>
                      ) : body ? (
                        <motion.p
                          key="body"
                          initial={{ y: 8, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: -8, opacity: 0 }}
                          className="whitespace-pre-wrap text-sm text-gray-800"
                        >
                          {body}
                        </motion.p>
                      ) : (
                        <motion.p
                          key="empty"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="text-sm text-gray-500"
                        >
                          {t('alertModal.noBody')}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* timestamps */}
                  <div className="mt-5 grid grid-cols-1 gap-2 text-xs text-gray-600 sm:grid-cols-2">
                    {readAt && (
                      <div>
                        {t('alertModal.readAt')}:&nbsp;
                        <time dateTime={readAt}>{new Date(readAt).toLocaleString()}</time>
                      </div>
                    )}
                    {archivedAt && (
                      <div>
                        {t('alertModal.archivedAt')}:&nbsp;
                        <time dateTime={archivedAt}>{new Date(archivedAt).toLocaleString()}</time>
                      </div>
                    )}
                    {expiresAt && (
                      <div className="sm:col-span-2">
                        {t('alertModal.expiresAt')}:&nbsp;
                        <time dateTime={expiresAt}>{new Date(expiresAt).toLocaleString()}</time>
                      </div>
                    )}
                  </div>

                  {/* actions */}
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {!isRead ? (
                        <button
                          type="button"
                          onClick={doMarkRead}
                          disabled={saving || loading}
                          className={`px-3 py-1.5 text-sm font-medium ${btnPrimary} disabled:opacity-60`}
                        >
                          {t('alertModal.markRead')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={doMarkUnread}
                          disabled={saving || loading}
                          className={`px-3 py-1.5 text-sm ${btnGhost} disabled:opacity-60`}
                        >
                          {t('alertModal.markUnread')}
                        </button>
                      )}

                      {!isArchived ? (
                        <button
                          type="button"
                          onClick={doArchive}
                          disabled={saving || loading}
                          className={`px-3 py-1.5 text-sm font-medium ${btnSecondary} disabled:opacity-60`}
                        >
                          {t('alertModal.archive')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={doUnarchive}
                          disabled={saving || loading}
                          className={`px-3 py-1.5 text-sm ${btnGhost} disabled:opacity-60`}
                        >
                          {t('alertModal.unarchive')}
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                    >
                      {t('common.close')}
                    </button>
                  </div>
                </div>

                {/* Brand Footer */}
                <div className="px-8 py-4 bg-[var(--color-text_dark)] text-center text-[var(--color-flag_white)]">
                  {t('footer.developedWithLove')}
                  <div className="mt-2 flex justify-center">
                    <a href="https://app.myb4y.com" target="_blank" rel="noopener noreferrer" aria-label="MYB4Y">
                      <Image src={myb4yImg} alt="MYB4Y" width={30} height={30} />
                    </a>
                  </div>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
