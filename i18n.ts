// i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from './public/locales/en/common.json';
import ptCommon from './public/locales/pt/common.json';
import frCommon from './public/locales/fr/common.json';
import esCommon from './public/locales/es/common.json';
import zhCommon from './public/locales/zh/common.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon },
      pt: { common: ptCommon },
      fr: { common: frCommon },
      es: { common: esCommon },
      zh: { common: zhCommon },
    },
    lng: 'en',           // initial default
    fallbackLng: 'en',
    debug: true,
    ns: ['common'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
  });

// **On the client**, immediately switch to whatever’s in sessionStorage**
if (typeof window !== 'undefined') {
  const stored = sessionStorage.getItem('userLang');
  if (stored && stored !== i18n.language) {
    i18n.changeLanguage(stored);
  }
}

export default i18n;
