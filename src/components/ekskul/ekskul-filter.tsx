'use client';

import { useRouter, usePathname } from 'next/navigation';

/**
 * A category dropdown that navigates with `?ekskulId=`. Used on lists where
 * ekskul is the only query filter.
 */
export function EkskulFilter({
    ekskuls,
    selected,
    allLabel,
}: Readonly<{
    ekskuls: { id: string; name: string }[];
    selected?: string;
    allLabel: string;
}>) {
    const router = useRouter();
    const pathname = usePathname();

    function onChange(value: string) {
        router.push(value ? `${pathname}?ekskulId=${value}` : pathname);
    }

    return (
        <select
            value={selected ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className='border rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-900'>
            <option value=''>{allLabel}</option>
            {ekskuls.map((e) => (
                <option key={e.id} value={e.id}>
                    {e.name}
                </option>
            ))}
        </select>
    );
}
