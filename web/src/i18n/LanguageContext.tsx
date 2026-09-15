import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { Language, Translations } from './types';
import { zhCN } from './zh-CN';
import { enUS } from './en-US';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: Translations;
  format: (template: string, vars: Record<string, string | number>) => string;
}

const STORAGE_KEY = 'playlistout-language';

const dictionaries: Record<Language, Translations> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

function getInitialLanguage(defaultLanguage?: Language): Language {
  if (typeof window === 'undefined') return defaultLanguage || 'zh-CN';

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'zh-CN' || saved === 'en-US') {
      return saved;
    }
  } catch {
    // Ignore storage errors
  }

  if (defaultLanguage) return defaultLanguage;

  const browserLang = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language.toLowerCase() : '';
  if (browserLang.startsWith('en')) {
    return 'en-US';
  }
  return 'zh-CN';
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode; defaultLanguage?: Language }> = ({
  children,
  defaultLanguage,
}) => {
  const [language, setLanguageState] = useState<Language>(() => getInitialLanguage(defaultLanguage));

  useEffect(() => {
    document.documentElement.lang = language;
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // Ignore storage errors in restricted iframe/browser environments
    }
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => (prev === 'zh-CN' ? 'en-US' : 'zh-CN'));
  }, []);

  const format = useCallback((template: string, vars: Record<string, string | number>): string => {
    return Object.entries(vars).reduce(
      (acc, [key, val]) => acc.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val)),
      template,
    );
  }, []);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      t: dictionaries[language],
      format,
    }),
    [language, setLanguage, toggleLanguage, format],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

const defaultFormat = (template: string, vars: Record<string, string | number>): string => {
  return Object.entries(vars).reduce(
    (acc, [key, val]) => acc.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val)),
    template,
  );
};

const defaultContextValue: LanguageContextValue = {
  language: 'zh-CN',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: zhCN,
  format: defaultFormat,
};

export function useTranslation(): LanguageContextValue {
  const context = useContext(LanguageContext);
  return context || defaultContextValue;
}

export const useLanguage = useTranslation;
