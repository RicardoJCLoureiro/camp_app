'use client';

import * as React from 'react';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogDescription,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useApi } from '@/utils/api';
import type { AlertItem } from '../alerts/page';

interface Props {
  isOpen: boolean;
  alert: AlertItem | null;
  onClose: () => void;
  onMarkedRead?: (id: string | number) => void;
}

export default function AlertDetailModal({
  isOpen,
  alert,
  onClose,
  onMarkedRead,
}: Props) {
  const { t } = useTranslation('common');
  const api = useApi();
  const [marking, setMarking] = React.useState(false);

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

  const severityPill =
    alert?.severity === 'critical'
      ? 'inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800'
      : alert?.severity === 'warning'
      ? 'inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800'
      : 'inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800';

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
          <div className="fixed inset-0 bg-black/20" />
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
              <DialogPanel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-xl transition-all">
                <DialogTitle className="text-lg font-semibold">
                  {alert?.title ?? t('alertModal.title', 'Alert')}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  {alert?.createdAt ?? ''}
                </DialogDescription>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={severityPill}>{alert?.severity}</span>
                    {alert?.createdAt && (
                      <time
                        className="text-gray-500"
                        dateTime={alert?.createdAt}
                        title={new Date(alert.createdAt).toLocaleString()}
                      >
                        {new Date(alert.createdAt).toLocaleString()}
                      </time>
                    )}
                  </div>

                  {alert?.body && (
                    <p className="whitespace-pre-wrap text-gray-800">{alert.body}</p>
                  )}

                  <label className="inline-flex items-center gap-2 select-none">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      defaultChecked={!!alert?.read}
                      onChange={onCheckboxChange}
                      disabled={marking || !!alert?.read}
                    />
                    <span>
                      {t('alertModal.markRead', 'Mark as read')}
                    </span>
                  </label>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
                  >
                    {t('common.close', 'Close')}
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
