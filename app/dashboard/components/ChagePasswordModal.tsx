// app/dashboard/components/ChangePasswordModal.tsx
'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Image from 'next/image';
import { useApi } from '@/utils/api';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import LanguagePicker from '@/components/LanguagePicker';
import CryptoJS from 'crypto-js';
import { AnimatePresence, motion } from 'framer-motion';
import verificarImg from '@/images/logo_new.png';
import myb4yImg from '@/images/logo_transparent.png';

// simple 0..10 strength score (same as before)
function passwordScore(pwd: string): number {
  if (!pwd) return 0;
  let score = 0;
  const length = pwd.length;
  if (length >= 8)  score += Math.min(4, Math.floor((length - 8) / 2) + 2);
  else              score += Math.max(0, length - 4);
  const lowers = /[a-z]/.test(pwd);
  const uppers = /[A-Z]/.test(pwd);
  const digits = /\d/.test(pwd);
  const symbols= /[^A-Za-z0-9]/.test(pwd);
  score += [lowers, uppers, digits, symbols].filter(Boolean).length; // +0..4
  if (/(.)\1{2,}/.test(pwd)) score -= 1;
  if (/1234|abcd|qwer|password|letmein|admin/i.test(pwd)) score -= 1;
  return Math.max(0, Math.min(10, score));
}

export default function ChangePasswordModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation('common');
  const api = useApi();

  const [current, setCurrent] = useState('');
  const [nw, setNew] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const score = useMemo(() => passwordScore(nw), [nw]);
  const strongEnough = score >= 7;

  // Close on Esc
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Reset fields whenever the modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrent('');
      setNew('');
      setConfirm('');
      setSaving(false);
    }
  }, [isOpen]);

  const onSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (nw !== confirm) {
      toast.error(t('users.password.mismatch'));
      return;
    }
    if (!strongEnough) {
      toast.error(t('users.password.tooWeak'));
      return;
    }
    setSaving(true);
    try {
      const currentHash = CryptoJS.SHA256(current).toString();
      const newHash = CryptoJS.SHA256(nw).toString();
      await api.post('/users/me/change-password', {
        currentPasswordHash: currentHash,
        newPasswordHash: newHash,
      });
      toast.success(t('users.password.changed'));
      onClose(); // close after success
    } catch (err: any) {
      const msg = err?.response?.data?.error === 'invalidCurrentPassword'
        ? t('users.password.invalidCurrent')
        : t('users.password.error');
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }, [api, current, nw, confirm, strongEnough, t, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — click to close (consistent with allowing dismiss) */}
          <motion.div
            key="pwd-backdrop"
            className="fixed inset-0 z-[999] bg-black/40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal shell — matches LoginForm card styling */}
          <motion.div
            key="pwd-modal"
            className="fixed inset-0 z-[1000] grid place-items-center p-4"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <div className="w-full max-w-md bg-white bg-opacity-90 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden">
              {/* Header (exact same layout as LoginForm) */}
              <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200">
                <Image src={verificarImg} alt="Logo" width={40} height={40} className="rounded-full shadow" />
                <h2 className="flex-grow text-center text-2xl font-semibold text-[var(--color-text_dark)]">
                  {t('users.password.title')}
                </h2>
                <LanguagePicker />
              </div>

              {/* Body */}
              <div className="px-8 py-6">
                <form onSubmit={onSubmit} className="space-y-5">
                  <div className="text-sm text-gray-600">
                    {t('users.password.instructions')}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text_dark)]">
                      {t('users.password.current')}
                    </label>
                    <input
                      type="password"
                      autoComplete="current-password"
                      className="mt-2 w-full rounded-lg border border-gray-300 bg-[var(--color-background_light)] p-3 focus:border-[var(--color-flag_green)] focus:ring-[var(--color-flag_green)] transition"
                      value={current}
                      onChange={(e) => setCurrent(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text_dark)]">
                      {t('users.password.new')}
                    </label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      className="mt-2 w-full rounded-lg border border-gray-300 bg-[var(--color-background_light)] p-3 focus:border-[var(--color-flag_green)] focus:ring-[var(--color-flag_green)] transition"
                      value={nw}
                      onChange={(e) => setNew(e.target.value)}
                    />
                    {/* strength bar */}
                    <div className="mt-2 h-2 w-full rounded bg-gray-200">
                      <div
                        className={`h-2 rounded ${strongEnough ? 'bg-green-500' : 'bg-rose-500'}`}
                        style={{ width: `${(score / 10) * 100}%` }}
                      />
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {t('users.password.strength', { score })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text_dark)]">
                      {t('users.password.confirm')}
                    </label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      className="mt-2 w-full rounded-lg border border-gray-300 bg-[var(--color-background_light)] p-3 focus:border-[var(--color-flag_green)] focus:ring-[var(--color-flag_green)] transition"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                    />
                  </div>

                  {/* Primary button full-width, like Login */}
                  <Button type="submit" disabled={saving} className="w-full">
                    {saving ? t('common.saving') : t('users.password.submit')}
                  </Button>
                </form>
              </div>

              {/* Footer (exactly like LoginForm) */}
              <div className="px-8 py-4 bg-[var(--color-text_dark)] text-center text-[var(--color-flag_white)]">
                {t('footer.developedWithLove')}
                <div className="mt-2 flex justify-center">
                  <a href="https://app.myb4y.com" target="_blank" rel="noopener noreferrer">
                    <Image src={myb4yImg} alt="MYB4Y" width={30} height={30} />
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
