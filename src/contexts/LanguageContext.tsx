import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

type Language = 'en' | 'ar';
type TranslationData = Record<string, any>;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string>) => string;
  dir: 'ltr' | 'rtl';
  isRTL: boolean;
}

const translations: Record<Language, TranslationData> = { en, ar };

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getNestedValue(obj: TranslationData, path: string): string | undefined {
  const keys = path.split('.');
  let current: any = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[key];
  }
  return typeof current === 'string' ? current : undefined;
}

function detectInitialLanguage(): Language {
  const stored = localStorage.getItem('qanuni_language');
  if (stored === 'en' || stored === 'ar') return stored;
  const browserLang = navigator.language?.substring(0, 2);
  if (browserLang === 'ar') return 'ar';
  return 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(detectInitialLanguage);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('qanuni_language', lang);
  }, []);

  const t = useCallback((key: string, params?: Record<string, string>): string => {
    let value = getNestedValue(translations[language], key);
    if (value === undefined) {
      console.warn(`Missing translation key: "${key}" for language "${language}"`);
      return key;
    }
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        value = value!.replace(`{{${k}}}`, v);
      });
    }
    return value;
  }, [language]);

  const dir = language === 'ar' ? 'rtl' : 'ltr';
  const isRTL = language === 'ar';

  useEffect(() => {
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', language);
    document.documentElement.style.fontFamily = language === 'ar'
      ? "var(--font-ar)"
      : "var(--font-en)";
  }, [language, dir]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
}
