'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from '@/components/providers/locale-provider';
import type { Locale } from '@/lib/i18n/dictionaries';

export function LanguageSwitcher({ compact }: Readonly<{ compact?: boolean }>) {
  const { locale, setLocale } = useLocale();
  const router = useRouter();

  async function switchLocale() {
    const next: Locale = locale === 'en' ? 'id' : 'en';
    await fetch('/api/locale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: next }),
    });
    setLocale(next);
    router.refresh();
  }

  return (
    <button
      onClick={switchLocale}
      className={`flex items-center gap-2 px-2 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer${compact ? '' : ' w-full'}`}
      aria-label='Switch language'
    >
      <span className='text-xs font-bold tracking-wide'>
        {locale === 'en' ? 'EN' : 'ID'}
      </span>
      <span>{locale === 'en' ? 'English' : 'Bahasa Indonesia'}</span>
    </button>
  );
}
