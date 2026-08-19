'use client';

/**
 * PROTOTYPE — throwaway (wayfinder ticket 11). Admit/Decline are stubs: this
 * prototype answers "what does the Admin see and where does it live", not
 * "does the write work". Clicking records the intent inline so the row's
 * after-state is visible without a migration.
 */

import { useState } from 'react';

type Taken = 'admitted' | 'declined' | null;

export function StubActions({
    name,
    admitLabel,
    declineLabel,
    size = 'row',
}: Readonly<{
    name: string;
    admitLabel: string;
    declineLabel: string;
    size?: 'row' | 'wide';
}>) {
    const [taken, setTaken] = useState<Taken>(null);

    if (taken) {
        return (
            <span className='type-caption text-muted-foreground'>
                {taken === 'admitted' ? admitLabel : declineLabel} · {name} (stub)
            </span>
        );
    }

    const base = 'inline-flex items-center justify-center rounded-[2px] type-label min-h-9 px-3';
    const width = size === 'wide' ? 'flex-1' : '';

    return (
        <span className='flex flex-wrap items-center gap-1.5'>
            <button
                type='button'
                onClick={() => setTaken('admitted')}
                className={`${base} ${width} bg-primary text-primary-foreground`}>
                {admitLabel}
            </button>
            <button
                type='button'
                onClick={() => setTaken('declined')}
                className={`${base} ${width} border border-destructive text-destructive`}>
                {declineLabel}
            </button>
        </span>
    );
}
