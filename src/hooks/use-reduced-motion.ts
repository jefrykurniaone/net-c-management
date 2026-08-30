'use client';

import { useSyncExternalStore } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(callback: () => void): () => void {
    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    mediaQuery.addEventListener('change', callback);
    return () => mediaQuery.removeEventListener('change', callback);
}

function getSnapshot(): boolean {
    return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

// SSR and the first client render agree on "motion is fine" so hydration
// never mismatches; `useSyncExternalStore` re-renders once the real
// preference is known, the same hydration-safe shape `ThemeToggle` uses.
function getServerSnapshot(): boolean {
    return false;
}

/** Whether the visitor asked the OS for reduced motion — Recharts' entry animation honours it. */
export function useReducedMotion(): boolean {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
