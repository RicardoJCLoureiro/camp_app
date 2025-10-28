// components/LoginForm.tsx
'use client';

import React, { useState, FormEvent } from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import CryptoJS from 'crypto-js';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AnimatePresence, motion } from 'framer-motion';

import { useApi } from '@/utils/api';
import LanguagePicker from '@/components/LanguagePicker';
import { useAuth } from '@/context/authContext';
import verificarImg from '@/images/logo_new.png';
import myb4yImg from '@/images/logo_transparent.png';

interface UserSession {
  userId: number;
  email: string;
  name: string;
  profilePictureUrl?: string | null;
  roles: string[];
}

interface LoginResponse {
  user?: UserSession;
  expires?: string;
  mfaSetupRequired?: boolean;
  mfaRequired?: boolean;
  error?: string;
}

export default function LoginForm() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { onLogin } = useAuth();
  const api = useApi();

  const [isForgot, setIsForgot] = useState(false);
  const [isSetup, setIsSetup] = useState(false);
  const [isMfa, setIsMfa] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [manualKey, setManualKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const lang = sessionStorage.getItem('userLang') || 'en';

  const splitName = (full: string) => {
    const parts = (full || '').trim().split(/\s+/);
    const firstName = parts[0] ?? '';
    const lastName = parts.slice(1).join(' ');
    return { firstName, lastName };
  };

  const completeLogin = (data: LoginResponse) => {
    if (!data.user || !data.expires) {
      const key = data.error || 'failure';
      toast.error(t(`login.${key}`));
      return;
    }

    const { firstName, lastName } = splitName(data.user.name);
    const profile = {
      userId: data.user.userId,
      firstName,
      lastName,
      image: data.user.profilePictureUrl || '',
      email: data.user.email,
    };

    // New API doesn’t return top-entity or per-component access.
    const topEntity = null;
    const roles = Array.isArray(data.user.roles) ? data.user.roles : [];
    const expiresAtMs = new Date(data.expires).getTime();
    const expiresInSec = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));

    // Pass empty access list (backend no longer returns it)
    onLogin(profile, topEntity as any, roles, [], expiresInSec);

    toast.success(t('login.success'));
    router.push('/dashboard');
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setIsMfa(false);
    setIsSetup(false);
    setQrImage(null);
    setManualKey(null);

    try {
      const hash = CryptoJS.SHA256(password).toString();
      const res = await api.post<LoginResponse>(
        '/auth/login',
        { email, password: hash },
        { validateStatus: status => status < 500 }
      );

      if (res.data.mfaSetupRequired) {
        const qrRes = await api.post<{ qrCodeImage: string; manualEntryKey: string }>(
          '/auth/mfa/setup',
          {}
        );
        setQrImage(qrRes.data.qrCodeImage);
        setManualKey(qrRes.data.manualEntryKey);
        setIsSetup(true);
        return;
      }

      if (res.data.mfaRequired) {
        setIsMfa(true);
        return;
      }

      if (res.data.user && res.data.expires) {
        completeLogin(res.data);
        return;
      }

      const key = res.data.error || 'failure';
      toast.error(t(`login.${key}`));
    } catch {
      toast.error(t('login.unexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const hash = CryptoJS.SHA256(password).toString();
      const res = await api.post<LoginResponse>(
        '/auth/mfa/login',
        { email, password: hash, code: mfaCode }
      );
      completeLogin(res.data);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'invalidMfaCode';
      toast.error(t(`login.${msg}`));
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!forgotEmail) {
      toast.error(t('login.missingEmail'));
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ message: string }>(
        '/auth/forgotpassword',
        { email: forgotEmail, language: lang }
      );
      toast.success(t(`forgotPassword.${res.data.message}`));
      setIsForgot(false);
    } catch {
      toast.error(t('forgotPassword.unexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white bg-opacity-90 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden transform hover:scale-[1.02] transition duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200">
        <Image src={verificarImg} alt="Logo" width={40} height={40} className="rounded-full shadow" />
        <h2 className="flex-grow text-center text-2xl font-semibold text-[var(--color-text_dark)]">
          {isForgot
            ? t('forgotPassword.header')
            : isSetup
              ? t('login.scanMfaQr')
              : isMfa
                ? t('login.enterMfaCode')
                : t('login.title')}
        </h2>
        <LanguagePicker />
      </div>

      {/* Forms */}
      <div className="px-8 py-6">
        <AnimatePresence initial={false} mode="wait">
          {/* Forgot Password */}
          {isForgot && (
            <motion.div
              key="forgot"
              initial={{ x: 200, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -200, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              layout
            >
              <form onSubmit={handleForgot} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text_dark)]">
                    {t('forgotPassword.emailLabel')}
                  </label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder={t('forgotPassword.emailPlaceholder')}
                    required
                    className="mt-2 w-full rounded-lg border border-gray-300 bg-[var(--color-background_light)] p-3 focus:border-[var(--color-flag_green)] focus:ring-[var(--color-flag_green)] transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg bg-[var(--color-button_secondary_bg)] text-[var(--color-button_secondary_text)] font-medium hover:bg-[var(--color-flag_blue)] transition"
                >
                  {loading ? t('login.loading') : t('forgotPassword.submit')}
                </button>
                <p className="text-center mt-4">
                  <button
                    type="button"
                    onClick={() => setIsForgot(false)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {t('forgotPassword.backToLogin')}
                  </button>
                </p>
              </form>
            </motion.div>
          )}

          {/* MFA Setup */}
          {isSetup && qrImage && manualKey && (
            <motion.div
              key="setup"
              initial={{ x: -200, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 200, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              layout
              className="space-y-5 text-center"
            >
              <p>{t('login.scanMfaQrInstructions')}</p>
              <img src={qrImage} alt="MFA QR Code" className="mx-auto" />
              <p>
                {t('login.manualEntryKey')}: <code>{manualKey}</code>
              </p>
              <button
                onClick={() => { setIsSetup(false); setIsMfa(true); }}
                className="w-full py-3 rounded-lg bg-[var(--color-button_primary_bg)] text-[var(--color-button_primary_text)] font-medium hover:bg-[var(--color-flag_blue)] transition"
              >
                {t('login.next')}
              </button>
            </motion.div>
          )}

          {/* MFA Verification */}
          {isMfa && !isSetup && (
            <motion.div
              key="mfa"
              initial={{ x: -200, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 200, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              layout
            >
              <form onSubmit={handleMfaSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text_dark)]">
                    {t('login.mfaCodeLabel')}
                  </label>
                  <input
                    type="text"
                    value={mfaCode}
                    onChange={e => setMfaCode(e.target.value)}
                    placeholder={t('login.mfaCodePlaceholder')}
                    required
                    className="mt-2 w-full rounded-lg border border-gray-300 bg-[var(--color-background_light)] p-3 focus:border-[var(--color-flag_green)] focus:ring-[var(--color-flag_green)] transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg bg-[var(--color-button_primary_bg)] text-[var(--color-button_primary_text)] font-medium hover:bg-[var(--color-flag_blue)] transition"
                >
                  {loading ? t('login.loading') : t('login.verifyMfa')}
                </button>
                <p className="text-center mt-4">
                  <button
                    type="button"
                    onClick={() => { setIsMfa(false); setPassword(''); }}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {t('login.backToCredentials')}
                  </button>
                </p>
              </form>
            </motion.div>
          )}

          {/* Standard Login */}
          {!isForgot && !isSetup && !isMfa && (
            <motion.div
              key="login"
              initial={{ x: -200, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 200, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              layout
            >
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text_dark)]">
                    {t('login.usernameLabel')}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={t('login.usernamePlaceholder')}
                    required
                    className="mt-2 w-full rounded-lg border border-gray-300 bg-[var(--color-background_light)] p-3 focus:border-[var(--color-flag_green)] focus:ring-[var(--color-flag_green)] transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text_dark)]">
                    {t('login.passwordLabel')}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={t('login.passwordPlaceholder')}
                    required
                    className="mt-2 w-full rounded-lg border border-gray-300 bg-[var(--color-background_light)] p-3 focus:border-[var(--color-flag_green)] focus:ring-[var(--color-flag_green)] transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg bg-[var(--color-button_primary_bg)] text-[var(--color-button_primary_text)] font-medium hover:bg-[var(--color-flag_blue)] transition"
                >
                  {loading ? t('login.loading') : t('login.submit')}
                </button>
                <p className="text-center mt-4">
                  <button
                    type="button"
                    onClick={() => setIsForgot(true)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {t('login.forgotPassword')}
                  </button>
                </p>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-8 py-4 bg-[var(--color-text_dark)] text-center text-[var(--color-flag_white)]">
        {t('footer.developedWithLove')}
        <div className="mt-2 flex justify-center">
          <a href="https://app.myb4y.com" target="_blank" rel="noopener noreferrer">
            <Image src={myb4yImg} alt="MYB4Y" width={30} height={30} />
          </a>
        </div>
      </div>
    </div>
  );
}
