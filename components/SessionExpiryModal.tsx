'use client';

import React, { Fragment } from 'react';
import {
  Dialog,
  Transition,
  TransitionChild,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import verificarImg from '@/images/logo.png';
import myb4yImg      from '@/images/logo_transparent.png';

interface SessionExpiryModalProps {
  isOpen: boolean;
  timeRemaining: number;
  onStay: () => void;
  onLogout: () => void;
}

const SessionExpiryModal: React.FC<SessionExpiryModalProps> = ({
  isOpen,
  timeRemaining,
  onStay,
  onLogout,
}) => {
  const { t } = useTranslation('common');

  const minutes = Math.floor(timeRemaining / 60000);
  const seconds = Math.floor((timeRemaining % 60000) / 1000);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => {}}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className="fixed inset-0"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}
          />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel
                className="w-full max-w-md transform overflow-hidden rounded-2xl p-6 text-left shadow-xl transition-all"
                style={{ backgroundColor: 'var(--color-flag_white)' }}
              >
                {/* Header */}
                <div
                  className="flex items-center justify-between border-b pb-4"
                  style={{ borderColor: 'var(--color-text_light)' }}
                >
                  <Image
                    src={verificarImg}
                    alt="Logo"
                    width={40}
                    height={40}
                  />
                  <DialogTitle
                    as="h3"
                    className="text-xl font-medium"
                    style={{ color: 'var(--color-text_dark)' }}
                  >
                    {t('sessionWarningModal.header')}
                  </DialogTitle>
                  <div className="w-10" />
                </div>

                {/* Body */}
                <div className="mt-4 space-y-2">
                  <p style={{ color: 'var(--color-text_dark)' }}>
                    {t('sessionWarningModal.body')}
                  </p>
                  <p style={{ color: 'var(--color-text_dark)' }}>
                    {t('sessionWarningModal.timeRemaining')}: {minutes}m{' '}
                    {seconds}s
                  </p>
                </div>

                {/* Actions */}
                <div className="mt-6 flex justify-center space-x-4">
                  <button
                    type="button"
                    onClick={onStay}
                    className="px-4 py-2 rounded-lg text-lg"
                    style={{
                      backgroundColor: 'var(--color-button_primary_bg)',
                      color:           'var(--color-button_primary_text)',
                    }}
                  >
                    {t('sessionWarningModal.extendSession')}
                  </button>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="px-4 py-2 rounded-lg text-lg"
                    style={{
                      backgroundColor: 'var(--color-button_secondary_bg)',
                      color:           'var(--color-button_secondary_text)',
                    }}
                  >
                    {t('sessionWarningModal.logout')}
                  </button>
                </div>

                {/* Footer */}
                <div
                  className="px-8 py-4 bg-[var(--color-text_dark)] text-center text-[var(--color-flag_white)] mt-6"
                >
                  {t('footer.developedWithLove')}
                  <div className="mt-2 flex justify-center">
                    <a
                      href="https://app.myb4y.com"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Image
                        src={myb4yImg}
                        alt="MYB4Y"
                        width={30}
                        height={30}
                      />
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
};

export default SessionExpiryModal;
