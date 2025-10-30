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
import verificarImg from '@/images/logo_new.png';
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

  /** Enable/disable audio alerts (default: true) */
  enableSound?: boolean;
  /** Enable/disable vibration alerts (default: true) */
  enableVibration?: boolean;
}

/* ----------------- helpers ----------------- */
const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const hexToRgb = (hex: string) => {
  const h = hex.replace('#', '');
  const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
};

const rgbToHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

const lerpHex = (hexA: string, hexB: string, t: number) => {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return rgbToHex(lerp(a.r, b.r, t), lerp(a.g, b.g, t), lerp(a.b, b.b, t));
};

/** Map fraction [0..1] → color (green → orange → red) */
const fractionToColor = (f: number) => {
  const green  = '#16a34a'; // tailwind green-600
  const orange = '#f59e0b'; // tailwind amber-500
  const red    = '#ef4444'; // tailwind red-500
  const t = clamp01(f);

  if (t >= 0.5) {
    // 0.5..1 → green → orange
    const tt = (t - 0.5) / 0.5; // 0..1
    return lerpHex(orange, green, tt); // at 1 → green
  } else {
    // 0..0.5 → orange → red
    const tt = t / 0.5; // 0..1
    return lerpHex(red, orange, tt); // at 0.5 → orange, at 0 → red
  }
};

/* ----------- lightweight audio beeps ----------- */
function useBeep(enabled: boolean | undefined) {
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!enabled) return;
    // Pre-create IFF allowed; otherwise we'll try on-demand and ignore failures.
    try {
      if (typeof window !== 'undefined' && 'AudioContext' in window) {
        ctxRef.current = new (window.AudioContext as any)();
      }
    } catch {
      // ignore
    }
    return () => {
      try {
        ctxRef.current?.close();
      } catch {
        /* ignore */
      }
      ctxRef.current = null;
    };
  }, [enabled]);

  const beep = (freq = 880, ms = 120, vol = 0.05) => {
    if (!enabled) return;
    try {
      const ctx = ctxRef.current ?? new (window.AudioContext as any)();
      ctxRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.frequency.value = freq;
      gain.gain.value = 0;

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      // attack/decay envelope
      gain.gain.linearRampToValueAtTime(vol, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + ms / 1000);

      osc.start(now);
      osc.stop(now + ms / 1000 + 0.02);
    } catch {
      // likely autoplay blocked; ignore silently
    }
  };

  return beep;
}

/* -------------- vibration helper -------------- */
function vibrate(enabled: boolean | undefined, pattern: number | number[]) {
  if (!enabled) return;
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      (navigator as any).vibrate(pattern);
    }
  } catch {
    /* ignore */
  }
}

/* ----------------- component ----------------- */
const SessionExpiryModal: React.FC<SessionExpiryModalProps> = ({
  isOpen,
  timeRemaining,
  onStay,
  onLogout,
  totalMs,
  enableSound = true,
  enableVibration = true,
}) => {
  const { t } = useTranslation('common');

  // Infer total if not provided
  const inferredTotalRef = useRef<number>(totalMs ?? timeRemaining);
  useEffect(() => {
    if (isOpen) {
      const candidate = totalMs ?? timeRemaining;
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

  // Circular progress math
  const radius = 36;
  const stroke = 6;
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;

  const fraction = clamp01(safeRemaining / baseTotal);
  const dashOffset = circumference * (1 - fraction);

  // Animated color (green→orange→red)
  const dynamicColor = fractionToColor(fraction);

  // Fallback colors if CSS vars are missing
  const colorTextDark = 'var(--color-text_dark, #0f172a)';
  const colorTextLight = 'var(--color-text_light, #cbd5e1)';
  const colorWhite     = 'var(--color-flag_white, #ffffff)';

  // --- Audio + vibration cues at thresholds ---
  const beep = useBeep(enableSound);
  const prevRef = useRef<number>(safeRemaining);

  useEffect(() => {
    if (!isOpen) return;
    const prev = prevRef.current;
    prevRef.current = safeRemaining;

    // On open (first frame), play a gentle cue once
    if (prev === 0 && safeRemaining > 0) {
      beep(660, 120, 0.04);
      vibrate(enableVibration, 50);
      return;
    }

    // Threshold helpers: fire once when crossing below X sec
    const crossed = (sec: number) =>
      prev > sec * 1000 && safeRemaining <= sec * 1000;

    if (crossed(30)) {
      beep(740, 120, 0.05); // slightly higher pitch
      vibrate(enableVibration, 80);
    } else if (crossed(10)) {
      beep(880, 140, 0.06);
      vibrate(enableVibration, [60, 80, 60]);
    } else if (crossed(5)) {
      // short rapid beeps to draw attention
      beep(980, 100, 0.07);
      setTimeout(() => beep(1100, 100, 0.07), 130);
      setTimeout(() => beep(1240, 120, 0.07), 260);
      vibrate(enableVibration, [80, 60, 80, 60, 80]);
    }
  }, [isOpen, safeRemaining, beep, enableVibration]);

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
                          stroke={dynamicColor}
                          strokeWidth={stroke}
                          fill="transparent"
                          strokeDasharray={`${circumference} ${circumference}`}
                          strokeDashoffset={dashOffset}
                          strokeLinecap="round"
                          style={{
                            transition: 'stroke-dashoffset 250ms linear, stroke 200ms linear',
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
                          {pad2(Math.floor(safeRemaining / 60000))}:
                          {pad2(Math.floor((safeRemaining % 60000) / 1000))}
                        </div>
                      </div>
                    </div>

                    {/* Textual note */}
                    <div className="text-sm" style={{ color: colorTextDark }}>
                      <div className="font-medium">
                        {t('sessionWarningModal.timeRemaining')}
                      </div>
                      <div className="opacity-80">
                        {Math.floor(safeRemaining / 60000)}m{' '}
                        {Math.floor((safeRemaining % 60000) / 1000)}s
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
