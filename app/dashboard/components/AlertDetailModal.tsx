// app/dashboard/components/AlertDetailModal.tsx
'use client';

import * as React from 'react';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import Image from 'next/image';
import { Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';

import { useApi } from '@/utils/api';
import { useAuth } from '@/context/authContext';
import verificarImg from '@/images/logo_new.png';

type Severity = 'info' | 'warning' | 'critical';

type AlertDetail = {
  id: number | string;
  title: string;
  createdAt: string; // ISO
  severity: Severity;
  isRead: boolean;
  content?: string | null;
};

export interface AlertDetailModalProps {
  open: boolean;
  alertId: number | string | null;
  onOpenChange: (open: boolean) => void;
  onMarkedRead?: (id: number | string) => void;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function AlertDetailModal({
  open,
  alertId,
  onOpenChange,
  onMarkedRead,
}: AlertDetailModalProps) {
  const { t } = useTranslation('common');
  const api = useApi();
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<AlertDetail | null>(null);
  const [marking, setMarking] = useState(false);

  const canLoad = useMemo(
    () => open && alertId != null && !!user?.userId,
    [open, alertId, user?.userId]
  );

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const fetchDetail = useCallback(async () => {
    if (!canLoad) return;
    try {
      setLoading(true);
      // GET /api/alerts/{id}
      const res = await api.get(`/alerts/${alertId}`);
      const r = res.data;

      const normalized: AlertDetail = {
        id: r?.id,
        title: r?.title ?? '',
        createdAt: r?.createdAt ?? '',
        severity: (r?.severity ?? 'info') as Severity,
        isRead: !!r?.isRead,
        content: r?.content ?? null,
      };

      setDetail(normalized);
    } catch {
      setDetail(null);
      toast.error(t('alertsPage.toast.detailError'));
    } finally {
      setLoading(false);
    }
  }, [api, alertId, canLoad, t]);

  useEffect(() => {
    if (canLoad) fetchDetail();
  }, [canLoad, fetchDetail]);

  const onCheckboxChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!detail) return;
    if (detail.isRead || !e.target.checked) return;

    try {
      setMarking(true);
      await api.post('/alerts/mark-read', { ids: [detail.id] });
      setDetail({ ...detail, isRead: true });
      onMarkedRead?.(detail.id);
      toast.success(t('alertsPage.toast.markedRead'));
    } catch {
      toast.error(t('alertsPage.toast.markReadError'));
      // Revert checkbox if failed
      e.target.checked = false;
    } finally {
      setMarking(false);
    }
  };

  const goToAllAlerts = () => {
    close();
    router.push('/dashboard/alerts');
  };

  // Optional subtle severity tone on the body
  const bodyTone =
    detail?.severity === 'critical'
      ? 'ring-1 ring-red-100'
      : detail?.severity === 'warning'
      ? 'ring-1 ring-amber-100'
      : 'ring-1 ring-blue-100';

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={close}>
        {/* Overlay */}
        <Transition.Child
          as={Fragment}
          enter="transition-opacity ease-out duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" />
        </Transition.Child>

        {/* Panel */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-end sm:items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="transition-all ease-out duration-200"
              enterFrom="opacity-0 translate-y-2 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="transition-all ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-2 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl">
                {/* Header — match LoginForm look (logo + centered title + right action) */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <Image
                      src={verificarImg}
                      alt="Logo"
                      width={36}
                      height={36}
                      className="rounded-full shadow"
                    />
                  </div>
                  <div className="flex-1 text-center">
                    <Dialog.Title className="text-2xl font-semibold text-[var(--color-text_dark)]">
                      {t('alertModal.title')}
                    </Dialog.Title>
                    <Dialog.Description className="mt-1 text-xs text-gray-500">
                      {detail?.createdAt ? formatDate(detail.createdAt) : ''}
                    </Dialog.Description>
                  </div>
                  <button
                    type="button"
                    onClick={close}
                    className="p-1.5 rounded hover:bg-gray-100 transition"
                    aria-label={t('alertModal.close')}
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Body — soft ring by severity to tie into app style */}
                <div className={`px-8 py-6 ${detail ? bodyTone : ''}`}>
                  {loading ? (
                    <div className="flex items-center gap-2 py-10 text-gray-600 justify-center">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('alerts.loading')}</span>
                    </div>
                  ) : !detail ? (
                    <div className="py-6 text-sm text-gray-500">
                      {t('alertsPage.detail.noData')}
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div>
                        <div className="text-[15px] font-semibold text-gray-900">
                          {detail.title}
                        </div>
                        <div className="mt-3 whitespace-pre-wrap text-sm text-gray-800">
                          {detail.content ?? t('alertsPage.detail.noContent')}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <input
                          id="markRead"
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-[var(--color-flag_green)] focus:ring-2 focus:ring-[var(--color-flag_green)] disabled:opacity-60"
                          checked={!!detail.isRead}
                          disabled={detail.isRead || marking}
                          onChange={onCheckboxChange}
                        />
                        <label
                          htmlFor="markRead"
                          className={`text-sm ${
                            detail.isRead ? 'text-gray-500' : 'text-gray-800'
                          }`}
                        >
                          {t('alertModal.markRead')}
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer — match LoginForm’s dark footer bar */}
                <div className="px-8 py-4 bg-[var(--color-text_dark)] flex items-center justify-between">
                  <div className="text-[var(--color-flag_white)] text-sm">
                    {/* keep minimal to match app’s footer tone */}
                    {t('footer.developedWithLove')}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={close}
                      className="inline-flex items-center rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-[var(--color-flag_white)] hover:bg-white/20 transition"
                    >
                      {t('alertModal.close')}
                    </button>
                    <button
                      type="button"
                      onClick={goToAllAlerts}
                      className="inline-flex items-center rounded-lg bg-[var(--color-flag_green)] px-3 py-1.5 text-sm font-medium text-[var(--color-flag_white)] hover:brightness-90 transition"
                    >
                      {t('alertModal.openInAlerts')}
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
