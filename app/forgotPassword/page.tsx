// app/forgotPassword/page.tsx
'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import CryptoJS from 'crypto-js';
import Image from 'next/image';
import { ToastContainer, toast } from 'react-toastify';
import { useApi } from '@/utils/api';
import 'react-toastify/dist/ReactToastify.css';
import verificarImg from '@/images/logo.png';

export default function ForgotPasswordPage() {
  const { i18n, t } = useTranslation('common');
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get('token') ?? '';
  const lang = searchParams.get('lang') ?? 'en';

  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mfaCode, setMfaCode]                 = useState('');
  const [complexity, setComplexity]           = useState(0);
  const [loading, setLoading]                 = useState(false);
  const api = useApi(); // ← ensure we call the hook so `api` is defined

  useEffect(() => {
    // Password strength scoring 0–10
    let score = 0;
    if (newPassword.length >= 8)  score += 2;
    if (newPassword.length >= 12) score += 1;
    if (/[a-z]/.test(newPassword)) score += 1;
    if (/[A-Z]/.test(newPassword)) score += 1;
    if (/[0-9]/.test(newPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 2;
    setComplexity(Math.min(score, 10));
  }, [newPassword]);

  useEffect(() => {
    i18n.changeLanguage(lang);
    sessionStorage.setItem('userLang', lang);
  }, [i18n, lang]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;

    // client-side validation
    if (!newPassword || !confirmPassword || !mfaCode) {
      toast.error(t('forgotPasswordReq.missingFields'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('forgotPasswordReq.passwordMismatch'));
      return;
    }
    if (complexity < 7) {
      toast.error(t('forgotPasswordReq.weakPassword'));
      return;
    }
    if (!token) {
      toast.error(t('forgotPasswordReq.invalidOrExpiredToken'));
      return;
    }

    setLoading(true);
    try {
      // hash the new password
      const hash = CryptoJS.SHA256(newPassword).toString();
      // call reset endpoint with token + newPassword + mfa code
      const res = await api.post('/auth/resetpassword', {
        token,
        newPassword: hash,
        code:        mfaCode
      });
      if (res.data.success) {
        toast.success(t('forgotPasswordReq.success'));
        router.push('/');
      } else {
        toast.error(t('forgotPasswordReq.resetFailed'));
      }
    } catch (err: any) {
      const errKey = err.response?.data?.error || 'unexpectedError';
      toast.error(t(`forgotPasswordReq.${errKey}`));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ToastContainer position="top-center" />

      <div
        className="min-h-screen flex items-center justify-center p-4
                   bg-gradient-to-br from-red-700/60 via-black/70 to-green-700/60"
      >
        <div
          className="w-full max-w-md bg-[var(--color-flag_white)] rounded-2xl
                     p-8 shadow-lg"
        >
          {/* Header */}
          <div className="flex items-center justify-center gap-4 px-8 py-6 border-b border-gray-200">
            <Image
              src={verificarImg}
              alt="Logo"
              width={40}
              height={40}
              className="rounded-full shadow"
            />
            <h2 className="text-2xl font-semibold text-[var(--color-text_dark)] whitespace-nowrap">
              {t('forgotPasswordReq.header')}
            </h2>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* New Password */}
            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium"
                style={{ color: 'var(--color-text_dark)' }}
              >
                {t('forgotPasswordReq.newPasswordLabel')}
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder={t('forgotPasswordReq.newPasswordPlaceholder')}
                required
                className="mt-2 w-full rounded-md border p-3"
                style={{
                  borderColor: 'var(--color-text_light)',
                  color:       'var(--color-text_dark)'
                }}
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium"
                style={{ color: 'var(--color-text_dark)' }}
              >
                {t('forgotPasswordReq.confirmPasswordLabel')}
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder={t('forgotPasswordReq.confirmPasswordPlaceholder')}
                required
                className="mt-2 w-full rounded-md border p-3"
                style={{
                  borderColor: 'var(--color-text_light)',
                  color:       'var(--color-text_dark)'
                }}
              />
            </div>

            {/* MFA Code */}
            <div>
              <label
                htmlFor="mfaCode"
                className="block text-sm font-medium"
                style={{ color: 'var(--color-text_dark)' }}
              >
                {t('forgotPasswordReq.mfaCodeLabel')}
              </label>
              <input
                id="mfaCode"
                type="text"
                value={mfaCode}
                onChange={e => setMfaCode(e.target.value)}
                placeholder={t('forgotPasswordReq.mfaCodePlaceholder')}
                required
                className="mt-2 w-full rounded-md border p-3"
                style={{
                  borderColor: 'var(--color-text_light)',
                  color:       'var(--color-text_dark)'
                }}
              />
            </div>

            {/* Strength Meter */}
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--color-text_dark)' }}
              >
                {t('forgotPasswordReq.complexityLabel')} {complexity}/10
              </label>
              <div className="w-full h-2 bg-[var(--color-text_light)] rounded">
                <div
                  className="h-full rounded"
                  style={{
                    width: `${(complexity / 10) * 100}%`,
                    backgroundColor:
                      complexity >= 7
                        ? 'var(--color-flag_green)'
                        : 'var(--color-flag_red)'
                  }}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-lg font-medium transition hover:brightness-90"
              style={{
                background: 'var(--color-flag_green)',
                color:      'var(--color-flag_white)'
              }}
            >
              {loading
                ? t('forgotPasswordReq.loadingButton')
                : t('forgotPasswordReq.resetButton')}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
