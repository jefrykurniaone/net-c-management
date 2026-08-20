'use client';

import { useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { ChevronRight } from 'lucide-react';
import { useLocale } from '@/components/providers/locale-provider';
import {
    getDictionary,
    type Dictionary,
    type Locale,
} from '@/lib/i18n/dictionaries';
import { Lattice, SectionHead } from './BoardCells';

// Hydration-safe flag: false during SSR and the first client render, true
// after — so a client-only value (resolved theme) never triggers a mismatch.
const emptySubscribe = () => () => {};
function useIsHydrated(): boolean {
    return useSyncExternalStore(
        emptySubscribe,
        () => true,
        () => false,
    );
}

/** One ruled cell you can press: what the setting is, what it is set to, and a way in. */
function Row({
    label,
    value,
    onClick,
}: Readonly<{ label: string; value: string; onClick: () => void }>) {
    return (
        <button
            type='button'
            onClick={onClick}
            className='flex min-h-14 w-full items-center gap-cell p-block text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'>
            <span className='type-body flex-1 text-card-foreground'>
                {label}
            </span>
            <span className='type-body max-w-[45%] truncate text-right text-secondary-foreground'>
                {value}
            </span>
            <ChevronRight className='size-4 shrink-0 text-subtle-foreground' />
        </button>
    );
}

/**
 * The resolved theme is client-only, so it reads empty until hydration rather
 * than guessing and flipping. Split out of the row so the value is one decision
 * per line instead of a nested conditional.
 */
function themeValue(hydrated: boolean, isDark: boolean, t: Dictionary): string {
    if (!hydrated) return '';
    return isDark ? t.profile.themeDark : t.profile.themeLight;
}

/**
 * Flip the locale: persist it in the cookie the server reads, mirror it in the
 * provider so client copy follows immediately, then re-render the Server
 * Component so its own strings — the Billing Period sentences included — come
 * back in the new language.
 */
async function switchLocale(
    locale: Locale,
    setLocale: (next: Locale) => void,
    refresh: () => void,
): Promise<void> {
    const next: Locale = locale === 'en' ? 'id' : 'en';
    await fetch('/api/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: next }),
    });
    setLocale(next);
    refresh();
}

export function AccountSettings({
    phone,
    onEditPhone,
}: Readonly<{ phone: string | null; onEditPhone: () => void }>) {
    const { locale, setLocale } = useLocale();
    const t = getDictionary(locale);
    const router = useRouter();
    const { resolvedTheme, setTheme } = useTheme();
    const hydrated = useIsHydrated();
    const isDark = resolvedTheme === 'dark';

    return (
        <section className='flex flex-col gap-block'>
            <SectionHead label={t.profile.accountLabel} />
            <Lattice>
                <Row
                    label={t.profile.phoneRow}
                    value={phone || t.profile.phoneNotSet}
                    onClick={onEditPhone}
                />
                <Row
                    label={t.profile.language}
                    value={locale === 'en' ? 'English' : 'Bahasa Indonesia'}
                    onClick={() =>
                        switchLocale(locale, setLocale, () => router.refresh())
                    }
                />
                <Row
                    label={t.profile.theme}
                    value={themeValue(hydrated, isDark, t)}
                    onClick={() => setTheme(isDark ? 'light' : 'dark')}
                />
            </Lattice>
        </section>
    );
}
