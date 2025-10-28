// components/IpInfoLoader.tsx
'use client';

import { useEffect } from 'react';
import i18n from '@/i18n';

const countryToLanguageMap: Record<string, string> = {
  US: 'en',
  GB: 'en',
  AU: 'en',
  CA: 'en',
  FR: 'fr',
  ES: 'es',
  PT: 'pt',
  BR: 'pt',
  CN: 'zh',
};

const IpInfoLoader: React.FC = () => {
  useEffect(() => {
    (async () => {
      const apiKey = process.env.NEXT_PUBLIC_IPINFO_API_KEY;
      if (!apiKey) {
        console.warn('Missing NEXT_PUBLIC_IPINFO_API_KEY');
        return;
      }

      try {
        const resp = await fetch(`https://ipinfo.io/json?token=${apiKey}`);
        if (!resp.ok) throw new Error(`Status ${resp.status}`);
        const data = await resp.json();

        // Store each top‑level string field in sessionStorage
        Object.entries(data).forEach(([key, value]) => {
          if (typeof value === 'string') {
            sessionStorage.setItem(key, value);
          }
        });

        // Derive and store userLang, then update i18n
        const lang = countryToLanguageMap[data.country as string] || 'en';
        sessionStorage.setItem('userLang', lang);
        i18n.changeLanguage(lang);
      } catch (err) {
        console.error('IpInfo fetch error:', err);
      }
    })();
  }, []);

  return null;
};

export default IpInfoLoader;
