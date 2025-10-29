'use client';

import * as React from 'react';
import { Fragment, useCallback, useMemo, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import Image from 'next/image';
import { Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { useApi } from '@/utils/api';
import verificarImg from '@/images/logo_new.png';

type Severity = 'info' | 'warning' | 'critical';

type AlertItem = {
  id: number | string;
  title: string;
  createdAt: string;
  severity: Severity;
  read?: boolean;
  body?: string | null;
};

export interface AlertDetailModalProps {
  open: boolean;
  alert: AlertItem | null;
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
  alert,
  onOpenChange,
  onMarkedRead,
}: AlertDetailModalProps) {
  const { t } = useTranslation('common');
  const api = useApi();

  const [marking, setMarking] = useState(false);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const bodyTone =
    alert?.severity === 'critical' ? 'ring-1 ring-red-100'
      : alert?.severity === 'warning' ? 'ring-1 ring-amber-100'
      : 'ring-1 ring-blue-100';

  const onCheckboxChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!alert) return;
    if (alert.read || !e.target.checked) return;

    try {
      setMarking(true);
      await api.post(`/alerts/${alert.id}/read`);
      onMarkedRead?.(alert.id);
      toast.success(t('alertsPage.toast.markedRead'));
    } catch {
      toast.error(t('alertsPage.toast.markReadError'));
      e.target.checked = false;
    } finally {
      setMarking(false);
    }
  };

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={close}>
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
              <Dialog.Panel className="w-full max-w-2xl sm:max-w-3xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl">
                <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <Image src={verificarImg} alt="Logo" width={36} height={36} className="rounded-full shadow" />
                  </div>
                  <div className="flex-1 text-center">
                    <Dialog.Title className="text-2xl font-semibold text-[var(--color-text_dark)]">
                      {t('alertModal.title')}
                    </Dialog.Title>
                    <Dialog.Description className="mt-1 text-xs text-gray-500">
                      {alert?.createdAt ? formatDate(alert.createdAt) : ''}
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

                <div className={`px-8 py-6 ${alert ? bodyTone : ''}`}>
                  {!alert ? (
                    <div className="py-6 text-sm text-gray-500">
                      {t('alertsPage.detail.noData')}
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div>
                        <div className="text-[15px] font-semibold text-gray-900">
                          {alert.title}
                        </div>
                        <div className="mt-3 whitespace-pre-wrap text-sm text-gray-800">
                          {alert.body ?? t('alertsPage.detail.noContent')}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <input
                          id="markRead"
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-[var(--color-flag_green)] focus:ring-2 focus:ring-[var(--color-flag_green)] disabled:opacity-60"
                          checked={!!alert.read}
                          disabled={alert.read || marking}
                          onChange={onCheckboxChange}
                        />
                        <label
                          htmlFor="markRead"
                          className={`text-sm ${alert.read ? 'text-gray-500' : 'text-gray-800'}`}
                        >
                          {t('alertModal.markRead')}
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-8 py-4 bg-[var(--color-text_dark)] flex items-center justify-between">
                  <div className="text-[var(--color-flag_white)] text-sm">
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
