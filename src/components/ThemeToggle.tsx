'use client';

import { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { cn } from '@/lib/utils';

// Hydration-safe "is this running on the client yet?" flag. Returns false during
// SSR and the first client render (so they match), then true after hydration —
// without a setState-in-effect. See https://react.dev/reference/react/useSyncExternalStore
const emptySubscribe = () => () => {};
function useIsHydrated(): boolean {
    return useSyncExternalStore(
        emptySubscribe,
        () => true,
        () => false,
    );
}

function Switch({ on }: Readonly<{ on: boolean }>) {
    return (
        <span
            className={cn(
                'relative ml-auto inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
                on ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600',
            )}>
            <span
                className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform',
                    on ? 'translate-x-4' : 'translate-x-0.5',
                )}
            />
        </span>
    );
}

export function ThemeToggle({ compact }: Readonly<{ compact?: boolean }>) {
    const { resolvedTheme, setTheme } = useTheme();
    const { locale } = useLocale();
    const t = getDictionary(locale);
    const isHydrated = useIsHydrated();

    // Render nothing until hydrated so the server and the first client render
    // agree (next-themes only resolves the theme on the client). Without this,
    // the server renders null while the client renders the toggle, shifting
    // sibling elements and triggering a hydration mismatch.
    if (!isHydrated || !resolvedTheme) return null;

    const isDark = resolvedTheme === 'dark';
    const toggle = () => setTheme(isDark ? 'light' : 'dark');

    if (compact) {
        return (
            <button
                onClick={toggle}
                className='flex items-center gap-2 px-2 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
                aria-label={t.nav.toggleTheme}>
                {isDark ? (
                    <Sun className='w-4 h-4 shrink-0' />
                ) : (
                    <Moon className='w-4 h-4 shrink-0' />
                )}
            </button>
        );
    }

    return (
        <button
            onClick={toggle}
            role='switch'
            aria-checked={isDark}
            aria-label={t.nav.toggleTheme}
            className='flex items-center gap-2 px-2 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors w-full'>
            {isDark ? (
                <Moon className='w-4 h-4 shrink-0' />
            ) : (
                <Sun className='w-4 h-4 shrink-0' />
            )}
            <span>{t.nav.darkMode}</span>
            <Switch on={isDark} />
        </button>
    );
}
