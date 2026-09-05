import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, LanguageCode, TranslationKeys, LANGUAGE_META } from '@/i18n/translations';

const STORAGE_KEY = '@artisanlink_language';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
  t: (key: keyof TranslationKeys) => string;
  languageMeta: typeof LANGUAGE_META;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/**
 * Map legacy nativeLabel strings (stored in old onboardingData.language)
 * to their LanguageCode equivalents.
 */
export function mapLegacyLanguage(val: string | undefined | null): LanguageCode {
  if (!val) return 'en';
  const map: Record<string, LanguageCode> = {
    English: 'en',
    'हिन्दी': 'hi',
    'தமிழ்': 'ta',
    'తెలుగు': 'te',
    'বাংলা': 'bn',
    'ਪੰਜਾਬੀ': 'pa',
    'मराठी': 'mr',
    // Code pass-through
    en: 'en', hi: 'hi', ta: 'ta', te: 'te', bn: 'bn', pa: 'pa', mr: 'mr',
  };
  return map[val] ?? 'en';
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>('en');

  // Load persisted language on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored && stored in translations) {
        setLanguageState(stored as LanguageCode);
      }
    }).catch(() => {});
  }, []);

  const setLanguage = useCallback((code: LanguageCode) => {
    setLanguageState(code);
    AsyncStorage.setItem(STORAGE_KEY, code).catch(() => {});
  }, []);

  const t = useCallback(
    (key: keyof TranslationKeys): string => {
      return translations[language]?.[key] ?? translations['en'][key] ?? key;
    },
    [language],
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, languageMeta: LANGUAGE_META }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
};
