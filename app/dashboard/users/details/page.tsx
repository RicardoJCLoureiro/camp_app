'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useApi } from '@/utils/api';
import { useAuth } from '@/context/authContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

/** ─────────────────────────────────────────────────────────────────────────────
 *  Options & helpers
 *  ────────────────────────────────────────────────────────────────────────────*/
const LANG_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'pt', label: 'Português' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
];

const GENDER_OPTIONS = [
  { value: '', label: '-' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

/** Generic validators (kept simple and permissive) */
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const isValidPhone = (v: string) =>
  v.trim() === '' || /^[+()\-.\s0-9]{7,20}$/.test(v.trim()); // allow blank; format-ish & length
const isValidPostal = (v: string) =>
  v.trim() === '' || /^[A-Za-z0-9\-.\s]{3,12}$/.test(v.trim()); // allow blank; simple

/** Date helpers for <input type="date"> */
function toDateInputValue(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
function toIsoFromDateInput(v: string): string | null {
  if (!v) return null;
  const [y, m, d] = v.split('-').map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  return dt.toISOString();
}

/** ──────────────────────────────────────────────────────────────────────────── */

type UserDetails = {
  userId: number;
  name: string;
  surname: string;
  email: string;
  languagePreference?: string;
  profilePictureUrl?: string | null;
  isActive: boolean;
  isMfaEnabled: boolean;
  birthDate?: string | null;
  gender?: string | null;
  identityNumber?: string | null;
  bloodType?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  postalCode?: string | null;
  country?: string | null;
  phoneNumber?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelationship?: string | null;
  allergies?: string | null;
  medicalConditions?: string | null;
};

export default function UserDetailsPage() {
  const { t, i18n } = useTranslation('common');
  const api = useApi();
  const router = useRouter();
  const { user, loaded, loading } = useAuth();

  const [original, setOriginal] = useState<UserDetails | null>(null);
  const [form, setForm] = useState<UserDetails | null>(null);
  const [saving, setSaving] = useState(false);

  // avatar upload state
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  // validation errors
  const [errors, setErrors] = useState<Partial<Record<keyof UserDetails, string>>>({});

  useEffect(() => {
    if (!loading && loaded && !user) router.replace('/');
  }, [loading, loaded, user, router]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<UserDetails>('/users/me/details');
        setOriginal(res.data);
        setForm(res.data);
        setPreview(res.data.profilePictureUrl || null);
      } catch {
        toast.error(t('users.details.loadError'));
      }
    })();
  }, [api, t]);

  const onChange = (k: keyof UserDetails, v: any) => {
    setForm(prev => (prev ? { ...prev, [k]: v } : prev));
    setErrors(prev => ({ ...prev, [k]: '' }));
  };

  const validate = (): boolean => {
    if (!form) return false;
    const e: Partial<Record<keyof UserDetails, string>> = {};

    if (!isValidEmail(form.email)) {
      e.email = t('users.validation.emailInvalid');
    }
    if (!isValidPhone(form.phoneNumber || '')) {
      e.phoneNumber = t('users.validation.phoneInvalid');
    }
    if (!isValidPhone(form.emergencyContactPhone || '')) {
      e.emergencyContactPhone = t('users.validation.emergencyPhoneInvalid');
    }
    if (!isValidPostal(form.postalCode || '')) {
      e.postalCode = t('users.validation.postalInvalid');
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Changed fields for PATCH
  const changedPayload = useMemo(() => {
    if (!original || !form) return {};
    const out: any = {};
    (Object.keys(form) as (keyof UserDetails)[]).forEach(k => {
      if (k === 'userId' || k === 'isActive' || k === 'isMfaEnabled' || k === 'email') return;
      const before = (original as any)[k];
      const after = (form as any)[k];
      if (JSON.stringify(before) !== JSON.stringify(after)) out[k] = after;
    });
    return out;
  }, [original, form]);

  // Avatar file selection + local preview
  const onFile = (f: File | null) => {
    setFile(f);
    if (!f) { setPreview(form?.profilePictureUrl || null); return; }
    const url = URL.createObjectURL(f);
    setPreview(url);
  };

  // Upload to Cloudinary using your signed route
  const uploadAvatar = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const sign = await fetch('/api/cloudinary-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name })
      }).then(r => r.json());

      if (sign.error) throw new Error(sign.error);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', sign.apiKey);
      formData.append('timestamp', String(sign.timestamp));
      formData.append('signature', sign.signature);
      formData.append('folder', sign.folder);
      formData.append('public_id', sign.public_id);

      const uploadUrl = `https://api.cloudinary.com/v1_1/${sign.cloudName}/auto/upload`;
      const cloudinaryRes = await fetch(uploadUrl, { method: 'POST', body: formData }).then(r => r.json());

      if (!cloudinaryRes.secure_url) throw new Error('Upload failed');

      setForm(prev => prev ? { ...prev, profilePictureUrl: cloudinaryRes.secure_url } : prev);
      setPreview(cloudinaryRes.secure_url);
      setFile(null);
      toast.success(t('users.details.avatarUploaded'));
    } catch (e) {
      toast.error(t('users.details.avatarUploadError'));
    } finally {
      setUploading(false);
    }
  };

  const onSave = async () => {
    if (!form) return;
    if (!validate()) return;

    const payload = changedPayload;
    if (Object.keys(payload).length === 0) {
      toast.info(t('users.details.noChanges'));
      return;
    }

    setSaving(true);
    try {
      const langBefore = original?.languagePreference || '';
      await api.patch('/users/me/details', payload);
      toast.success(t('users.details.saved'));
      setOriginal(form);

      const langAfter = form.languagePreference || '';
      if (langBefore !== langAfter && langAfter) {
        sessionStorage.setItem('userLang', langAfter);
        const yes = confirm(t('users.details.reloadForLanguage'));
        if (yes) {
          await i18n.changeLanguage(langAfter);
          location.reload();
        }
      }
    } catch {
      toast.error(t('users.details.saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (!form) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{t('users.details.title')}</h1>

      {/* Avatar + uploader */}
      <div className="rounded-2xl bg-white p-4 shadow ring-1 ring-black/5 flex items-center gap-4">
        <div className="w-24 h-24 rounded-full overflow-hidden ring-1 ring-black/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview || '/avatar-placeholder.png'} alt="avatar" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1">
          <input
            type="file"
            accept="image/*"
            onChange={e => onFile(e.target.files?.[0] || null)}
            className="block"
          />
          <div className="mt-2 flex gap-2">
            <Button type="button" onClick={uploadAvatar} disabled={!file || uploading}>
              {uploading ? t('users.details.uploading') : t('users.details.uploadAvatar')}
            </Button>
            {form.profilePictureUrl && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => { onChange('profilePictureUrl', null); setPreview(null); setFile(null); }}
              >
                {t('users.details.removeAvatar')}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Basic */}
        <div className="rounded-2xl bg-white p-4 shadow ring-1 ring-black/5 space-y-3">
          <div>
            <label className="text-sm text-gray-600">{t('users.fields.name')}</label>
            <input
              className="mt-1 w-full border rounded p-2"
              value={form.name}
              onChange={e => onChange('name', e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">{t('users.fields.surname')}</label>
            <input
              className="mt-1 w-full border rounded p-2"
              value={form.surname}
              onChange={e => onChange('surname', e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">{t('users.fields.email')}</label>
            <input
              type="email"
              className={`mt-1 w-full border rounded p-2 ${errors.email ? 'border-red-500' : ''}`}
              value={form.email}
              onChange={e => onChange('email', e.target.value)}
              disabled
              title={t('users.details.emailLocked')}
            />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="text-sm text-gray-600">{t('users.fields.languagePreference')}</label>
            <select
              className="mt-1 w-full border rounded p-2"
              value={form.languagePreference || ''}
              onChange={e => onChange('languagePreference', e.target.value)}
            >
              {LANG_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">{t('users.details.languageHint')}</p>
          </div>

          <div>
            <label className="text-sm text-gray-600">{t('users.fields.gender')}</label>
            <select
              className="mt-1 w-full border rounded p-2"
              value={form.gender || ''}
              onChange={e => onChange('gender', e.target.value)}
            >
              {GENDER_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-600">{t('users.fields.birthDate')}</label>
            <input
              type="date"
              className="mt-1 w-full border rounded p-2"
              value={toDateInputValue(form.birthDate)}
              max={toDateInputValue(new Date().toISOString())}
              onChange={e => onChange('birthDate', toIsoFromDateInput(e.target.value))}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">{t('users.fields.profilePictureUrl')}</label>
            <input
              className="mt-1 w-full border rounded p-2"
              value={form.profilePictureUrl || ''}
              onChange={e => onChange('profilePictureUrl', e.target.value)}
              placeholder="https://res.cloudinary.com/.../image.jpg"
            />
          </div>
        </div>

        {/* Contact */}
        <div className="rounded-2xl bg-white p-4 shadow ring-1 ring-black/5 space-y-3">
          <div>
            <label className="text-sm text-gray-600">{t('users.fields.phoneNumber')}</label>
            <input
              className={`mt-1 w-full border rounded p-2 ${errors.phoneNumber ? 'border-red-500' : ''}`}
              value={form.phoneNumber || ''}
              onChange={e => onChange('phoneNumber', e.target.value)}
              placeholder="+351 912 345 678"
            />
            {errors.phoneNumber && <p className="text-xs text-red-600 mt-1">{errors.phoneNumber}</p>}
          </div>

          <div>
            <label className="text-sm text-gray-600">{t('users.fields.addressLine1')}</label>
            <input
              className="mt-1 w-full border rounded p-2"
              value={form.addressLine1 || ''}
              onChange={e => onChange('addressLine1', e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">{t('users.fields.addressLine2')}</label>
            <input
              className="mt-1 w-full border rounded p-2"
              value={form.addressLine2 || ''}
              onChange={e => onChange('addressLine2', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-sm text-gray-600">{t('users.fields.city')}</label>
              <input
                className="mt-1 w-full border rounded p-2"
                value={form.city || ''}
                onChange={e => onChange('city', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">{t('users.fields.stateProvince')}</label>
              <input
                className="mt-1 w-full border rounded p-2"
                value={form.stateProvince || ''}
                onChange={e => onChange('stateProvince', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">{t('users.fields.postalCode')}</label>
              <input
                className={`mt-1 w-full border rounded p-2 ${errors.postalCode ? 'border-red-500' : ''}`}
                value={form.postalCode || ''}
                onChange={e => onChange('postalCode', e.target.value)}
              />
              {errors.postalCode && <p className="text-xs text-red-600 mt-1">{errors.postalCode}</p>}
            </div>
          </div>

          {/* Country is now a free text field */}
          <div>
            <label className="text-sm text-gray-600">{t('users.fields.country')}</label>
            <input
              className="mt-1 w-full border rounded p-2"
              value={form.country || ''}
              onChange={e => onChange('country', e.target.value)}
              placeholder={t('users.details.countryPlaceholder', 'Portugal')}
            />
          </div>
        </div>

        {/* Emergency / Medical */}
        <div className="md:col-span-2 w-full rounded-2xl bg-white p-4 shadow ring-1 ring-black/5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-sm text-gray-600">{t('users.fields.emergencyContactName')}</label>
              <input
                className="mt-1 w-full border rounded p-2"
                value={form.emergencyContactName || ''}
                onChange={e => onChange('emergencyContactName', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">{t('users.fields.emergencyContactPhone')}</label>
              <input
                className={`mt-1 w-full border rounded p-2 ${errors.emergencyContactPhone ? 'border-red-500' : ''}`}
                value={form.emergencyContactPhone || ''}
                onChange={e => onChange('emergencyContactPhone', e.target.value)}
                placeholder="+351 912 345 678"
              />
              {errors.emergencyContactPhone && (
                <p className="text-xs text-red-600 mt-1">{errors.emergencyContactPhone}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-600">{t('users.fields.emergencyContactRelationship')}</label>
              <input
                className="mt-1 w-full border rounded p-2"
                value={form.emergencyContactRelationship || ''}
                onChange={e => onChange('emergencyContactRelationship', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-600">{t('users.fields.allergies')}</label>
            <textarea
              className="mt-1 w-full border rounded p-2"
              value={form.allergies || ''}
              onChange={e => onChange('allergies', e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">{t('users.fields.medicalConditions')}</label>
            <textarea
              className="mt-1 w-full border rounded p-2"
              value={form.medicalConditions || ''}
              onChange={e => onChange('medicalConditions', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={onSave} disabled={saving}>
          {saving ? t('common.saving') : t('common.save')}
        </Button>
        <Button variant="secondary" onClick={() => setForm(original!)}>
          {t('common.reset')}
        </Button>
      </div>
    </div>
  );
}
