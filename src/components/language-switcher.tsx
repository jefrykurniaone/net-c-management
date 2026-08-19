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
      className={`flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer${compact ? '' : ' w-full'}`}
      aria-label='Switch language'
    >
      <span className='text-xs font-bold tracking-wide'>
        {locale === 'en' ? 'EN' : 'ID'}
      </span>
      {/* `compact` is the header-rail variant, and the rail does not wrap: the
          mark group shrinks to fit the controls, so a wide control is paid for
          by the community name. Measured at 390px, 'Bahasa Indonesia' takes
          198px of the rail and forces the wordmark to break mid-word across
          three lines. The code alone identifies the control, `aria-label`
          carries the meaning, and the name returns from `sm:` up. */}
      <span className={compact ? 'hidden sm:inline' : undefined}>
        {locale === 'en' ? 'English' : 'Bahasa Indonesia'}
      </span>
    </button>
  );
}
