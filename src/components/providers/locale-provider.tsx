'use client';

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/dictionaries';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
});

export function LocaleProvider({
  children,
  initialLocale,
}: Readonly<{ children: ReactNode; initialLocale: Locale }>) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const value = useMemo(() => ({ locale, setLocale }), [locale]);

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
