// components/LanguagePicker.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'zh', label: '中文',    flag: '🇨🇳' },
];

export default function LanguagePicker() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => setIsOpen(open => !open);

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    sessionStorage.setItem('userLang', lang);
    setIsOpen(false);
  };

  // close when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={toggleDropdown}
        className="
          flex items-center gap-2
          text-[var(--color-text_dark)]
          px-4 py-2
          border-[var(--color-flag_green)]
          rounded-lg
          shadow-md
          hover:bg-[var(--color-flag_green)]
          hover:text-[var(--color-button_primary_text)]
          transition-colors
        "
      >
        {i18n.language.toUpperCase()}
      </button>

      {isOpen && (
        <div
          className="
            absolute top-full right-0 mt-2
            bg-[var(--color-flag_white)]
            text-[var(--color-text_dark)]        /* <— ensure dark text */
            border-[var(--color-flag_green)]
            rounded-md shadow-lg w-40
          "
        >
          <ul className="m-0 p-2 list-none">
            {languages.map(({ code, label, flag }) => (
              <li key={code}>
                <button
                  onClick={() => handleLanguageChange(code)}
                  className="
                    flex items-center gap-2 w-full text-left
                    px-4 py-2
                    hover:bg-[var(--color-flag_green)]
                    hover:text-[var(--color-button_primary_text)]
                    transition-colors
                  "
                >
                  <span>{flag}</span> {label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
