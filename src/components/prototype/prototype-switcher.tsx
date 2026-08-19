'use client';

/**
 * PROTOTYPE — throwaway. Belongs to wayfinder ticket 11
 * (`.scratch/community-landing/issues/11-the-applicant-waiting-room-and-the-admin-queue.md`).
 * Delete with the variants once the ticket's answer is folded into real code.
 *
 * Floating variant bar: cycles `?variant=`, and (where the host page passes
 * them) flips `?state=` and `?lang=` so the declined state and the longer
 * Indonesian strings are one click away.
 */

import { useCallback, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export type VariantSpec = Readonly<{ key: string; name: string }>;

type Toggle = Readonly<{ param: string; values: readonly string[]; label: string }>;

const EDITABLE = ['INPUT', 'TEXTAREA', 'SELECT'];

function isTyping(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    return EDITABLE.includes(target.tagName) || target.isContentEditable;
}

export function PrototypeSwitcher({
    variants,
    current,
    toggles = [],
}: Readonly<{
    variants: readonly VariantSpec[];
    current: string;
    toggles?: readonly Toggle[];
}>) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const setParam = useCallback(
        (param: string, value: string) => {
            const next = new URLSearchParams(searchParams.toString());
            next.set(param, value);
            router.replace(`${pathname}?${next.toString()}`, { scroll: false });
        },
        [pathname, router, searchParams],
    );

    const index = Math.max(
        0,
        variants.findIndex((v) => v.key === current),
    );

    const cycle = useCallback(
        (step: number) => {
            const next = (index + step + variants.length) % variants.length;
            setParam('variant', variants[next].key);
        },
        [index, setParam, variants],
    );

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (isTyping(e.target)) return;
            if (e.key === 'ArrowLeft') cycle(-1);
            if (e.key === 'ArrowRight') cycle(1);
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [cycle]);

    if (process.env.NODE_ENV === 'production') return null;

    const active = variants[index];

    return (
        <div className='fixed bottom-4 left-1/2 z-50 -translate-x-1/2'>
            <div className='flex flex-wrap items-center justify-center gap-2 rounded-full bg-fuchsia-700 px-3 py-2 text-white shadow-lg'>
                <button
                    type='button'
                    aria-label='Previous variant'
                    onClick={() => cycle(-1)}
                    className='px-2 text-lg leading-none'>
                    ←
                </button>
                <span className='text-xs font-semibold tabular-nums'>
                    {active.key} — {active.name}
                </span>
                <button
                    type='button'
                    aria-label='Next variant'
                    onClick={() => cycle(1)}
                    className='px-2 text-lg leading-none'>
                    →
                </button>

                {toggles.map((toggle) => {
                    const value = searchParams.get(toggle.param) ?? toggle.values[0];
                    return (
                        <span key={toggle.param} className='flex items-center gap-1 border-l border-white/40 pl-2'>
                            <span className='text-[10px] uppercase tracking-wider opacity-80'>
                                {toggle.label}
                            </span>
                            {toggle.values.map((option) => (
                                <button
                                    key={option}
                                    type='button'
                                    onClick={() => setParam(toggle.param, option)}
                                    className={
                                        option === value
                                            ? 'rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-fuchsia-800'
                                            : 'rounded-full px-2 py-0.5 text-[10px] font-semibold opacity-70'
                                    }>
                                    {option}
                                </button>
                            ))}
                        </span>
                    );
                })}
            </div>
        </div>
    );
}
