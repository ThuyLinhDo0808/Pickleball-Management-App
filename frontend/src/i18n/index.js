import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DICTS, LANGS, DEFAULT_LANG, getLanguage, setLanguageInMemory, subscribe, t } from './core.js';

export { t, getLanguage, LANGS };

const STORAGE_KEY = 'app.language';
const I18nContext = createContext(null);

// Wrap the app once. Every component that calls useI18n() re-renders when the
// language changes; the choice is remembered between launches.
export function I18nProvider({ children }) {
  const [lang, setLang] = useState(getLanguage());
  const [ready, setReady] = useState(false);

  useEffect(() => subscribe(setLang), []);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => { if (saved && DICTS[saved]) setLanguageInMemory(saved); })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const setLanguage = useCallback((code) => {
    setLanguageInMemory(code);
    AsyncStorage.setItem(STORAGE_KEY, code).catch(() => {});
  }, []);

  const value = useMemo(() => ({ lang, t, setLanguage, ready }), [lang, setLanguage, ready]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}

export { DEFAULT_LANG };
