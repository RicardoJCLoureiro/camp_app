'use client';

import React, { Fragment, useEffect, useMemo, useRef } from 'react';
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
import myb4yImg from '@/images/logo_transparent.png';

interface SessionExpiryModalProps {
  isOpen: boolean;
  timeRemaining: number;   // ms
  onStay: () => void;
  onLogout: () => void;
  /**
   * Optional total countdown window (ms). If omitted,
   * we infer it as the largest timeRemaining when the modal opens.
   */
  totalMs?: number;
}

const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));

const SessionExpiryModal: React.FC<SessionExpiryModalProps> = ({
  isOpen,
  timeRemaining,
  onStay,
  onLogout,
  totalMs,
}) => {
  const { t } = useTranslation('common');

  // Infer total if not provided
  const inferredTotalRef = useRef<number>(totalMs ?? timeRemaining);
  useEffect(() => {
    if (isOpen) {
      const candidate = totalMs ?? timeRemaining;
      // keep the max seen while modal is open
      inferredTotalRef.current = Math.max(inferredTotalRef.current || 0, candidate || 0);
      if (!inferredTotalRef.current) inferredTotalRef.current = 1; // avoid 0
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, timeRemaining, totalMs]);

  const baseTotal = useMemo(
    () => (typeof totalMs === 'number' && totalMs > 0 ? totalMs : inferredTotalRef.current || 1),
    [totalMs]
  );

  const safeRemaining = Math.max(0, timeRemaining || 0);
  const minutes = Math.floor(safeRemaining / 60000);
  const seconds = Math.floor((safeRemaining % 60000) / 1000);

  // Circular progress
  const radius = 36;
  const stroke = 6;
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const fraction = Math.max(0, Math.min(1, safeRemaining / baseTotal));
  const dashOffset = circumference * (1 - fraction);

  // Fallback colors if CSS vars are missing
  const colorTextDark = 'var(--color-text_dark, #0f172a)';
  const colorTextLight = 'var(--color-text_light, #cbd5e1)';
  const colorPrimary   = 'var(--color-button_primary_bg, #2563eb)';
  const colorWhite     = 'var(--color-flag_white, #ffffff)';

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
                style={{ backgroundColor: colorWhite }}
              >
                {/* Header */}
                <div
                  className="flex items-center justify-between border-b pb-4"
                  style={{ borderColor: colorTextLight }}
                >
                  <Image src={verificarImg} alt="Logo" width={40} height={40} />
                  <DialogTitle
                    as="h3"
                    className="text-xl font-medium"
                    style={{ color: colorTextDark }}
                  >
                    {t('sessionWarningModal.header')}
                  </DialogTitle>
                  <div className="w-10" />
                </div>

                {/* Body */}
                <div className="mt-4 space-y-4">
                  <p style={{ color: colorTextDark }}>
                    {t('sessionWarningModal.body')}
                  </p>

                  {/* Countdown */}
                  <div className="flex items-center justify-center gap-4">
                    {/* Ring */}
                    <div className="relative h-24 w-24">
                      <svg
                        height="100%"
                        width="100%"
                        viewBox={`0 0 ${radius * 2} ${radius * 2}`}
                        className="block"
                      >
                        {/* Track */}
                        <circle
                          cx={radius}
                          cy={radius}
                          r={normalizedRadius}
                          stroke={colorTextLight}
                          strokeWidth={stroke}
                          fill="transparent"
                          opacity={0.35}
                        />
                        {/* Progress */}
                        <circle
                          cx={radius}
                          cy={radius}
                          r={normalizedRadius}
                          stroke={colorPrimary}
                          strokeWidth={stroke}
                          fill="transparent"
                          strokeDasharray={`${circumference} ${circumference}`}
                          strokeDashoffset={dashOffset}
                          strokeLinecap="round"
                          style={{
                            transition: 'stroke-dashoffset 250ms linear',
                            transform: 'rotate(-90deg)',
                            transformOrigin: '50% 50%',
                          }}
                        />
                      </svg>

                      {/* Digital time */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div
                          className="font-semibold tabular-nums"
                          style={{ color: colorTextDark }}
                          aria-live="polite"
                          aria-atomic="true"
                        >
                          {pad2(minutes)}:{pad2(seconds)}
                        </div>
                      </div>
                    </div>

                    {/* Textual note */}
                    <div className="text-sm" style={{ color: colorTextDark }}>
                      <div className="font-medium">
                        {t('sessionWarningModal.timeRemaining')}
                      </div>
                      <div className="opacity-80">
                        {minutes}m {seconds}s
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex justify-center space-x-4">
                  <button
                    type="button"
                    onClick={onStay}
                    className="px-4 py-2 rounded-lg text-lg"
                    style={{
                      backgroundColor: 'var(--color-button_primary_bg, #2563eb)',
                      color:           'var(--color-button_primary_text, #ffffff)',
                    }}
                  >
                    {t('sessionWarningModal.extendSession')}
                  </button>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="px-4 py-2 rounded-lg text-lg"
                    style={{
                      backgroundColor: 'var(--color-button_secondary_bg, #0f172a)',
                      color:           'var(--color-button_secondary_text, #ffffff)',
                    }}
                  >
                    {t('sessionWarningModal.logout')}
                  </button>
                </div>

                {/* Footer */}
                <div className="px-8 py-4 bg-[var(--color-text_dark,#0f172a)] text-center text-[var(--color-flag_white,#ffffff)] mt-6">
                  {t('footer.developedWithLove')}
                  <div className="mt-2 flex justify-center">
                    <a
                      href="https://app.myb4y.com"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
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
};

export default SessionExpiryModal;
