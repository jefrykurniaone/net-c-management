'use client';

import { useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { ChevronRight } from 'lucide-react';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary, type Locale } from '@/lib/i18n/dictionaries';

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

function Row({
    label,
    value,
    onClick,
}: Readonly<{ label: string; value: string; onClick: () => void }>) {
    return (
        <button
            type='button'
            onClick={onClick}
            className='flex min-h-14 w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'>
            <span className='flex-1 text-sm font-medium text-foreground'>
                {label}
            </span>
            <span className='max-w-[45%] truncate text-right text-sm text-muted-foreground'>
                {value}
            </span>
            <ChevronRight className='size-4 shrink-0 text-subtle-foreground' />
        </button>
    );
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

    async function toggleLocale() {
        const next: Locale = locale === 'en' ? 'id' : 'en';
        await fetch('/api/locale', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ locale: next }),
        });
        setLocale(next);
        router.refresh();
    }

    const isDark = resolvedTheme === 'dark';

    return (
        <section className='space-y-2'>
            <p className='px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground'>
                {t.profile.accountLabel}
            </p>
            <div className='divide-y divide-border overflow-hidden rounded-xl border border-border bg-card'>
                <Row
                    label={t.profile.phoneRow}
                    value={phone || t.profile.phoneNotSet}
                    onClick={onEditPhone}
                />
                <Row
                    label={t.profile.language}
                    value={locale === 'en' ? 'English' : 'Bahasa Indonesia'}
                    onClick={toggleLocale}
                />
                <Row
                    label={t.profile.theme}
                    value={
                        !hydrated
                            ? ''
                            : isDark
                              ? t.profile.themeDark
                              : t.profile.themeLight
                    }
                    onClick={() => setTheme(isDark ? 'light' : 'dark')}
                />
            </div>
        </section>
    );
}
