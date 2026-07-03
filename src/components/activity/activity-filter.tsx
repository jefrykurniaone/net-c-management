'use client';

import { useRouter, usePathname } from 'next/navigation';

/**
 * A category dropdown that navigates with `?activityId=`. Used on lists where
 * activity is the only query filter.
 */
export function ActivityFilter({
    activities,
    selected,
    allLabel,
}: Readonly<{
    activities: { id: string; name: string }[];
    selected?: string;
    allLabel: string;
}>) {
    const router = useRouter();
    const pathname = usePathname();

    function onChange(value: string) {
        router.push(value ? `${pathname}?activityId=${value}` : pathname);
    }

    return (
        <select
            value={selected ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className='border border-border rounded-lg px-3 py-1.5 text-sm bg-background'>
            <option value=''>{allLabel}</option>
            {activities.map((e) => (
                <option key={e.id} value={e.id}>
                    {e.name}
                </option>
            ))}
        </select>
    );
}
