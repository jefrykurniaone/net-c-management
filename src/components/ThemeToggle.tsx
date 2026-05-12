'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary } from '@/lib/i18n/dictionaries';

export function ThemeToggle() {
    const { resolvedTheme, setTheme } = useTheme();
    const { locale } = useLocale();
    const t = getDictionary(locale);

    if (!resolvedTheme) return null;

    const isDark = resolvedTheme === 'dark';

    function toggle() {
        setTheme(isDark ? 'light' : 'dark');
    }

    return (
        <button
            onClick={toggle}
            className='flex items-center gap-2 px-2 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors w-full'
            aria-label={t.nav.toggleTheme}
        >
            {isDark ? (
                <Sun className='w-4 h-4 shrink-0' />
            ) : (
                <Moon className='w-4 h-4 shrink-0' />
            )}
            {isDark ? t.nav.lightMode : t.nav.darkMode}
        </button>
    );
}
