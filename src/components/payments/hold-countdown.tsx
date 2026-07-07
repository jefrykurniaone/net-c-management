'use client';

import { useEffect, useState } from 'react';

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

/** "1:05:09" past an hour, "05:09" under it — always minutes:seconds. */
function formatRemaining(ms: number): string {
    const totalSeconds = Math.max(0, Math.floor(ms / MS_PER_SECOND));
    const hours = Math.floor(
        totalSeconds / (SECONDS_PER_MINUTE * MINUTES_PER_HOUR),
    );
    const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE) % MINUTES_PER_HOUR;
    const seconds = totalSeconds % SECONDS_PER_MINUTE;
    const minSec = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    return hours > 0 ? `${hours}:${minSec}` : minSec;
}

/**
 * Live countdown to a reservation-hold expiry, ticking every second on the
 * client. Server render and first client render disagree by the request
 * latency, hence suppressHydrationWarning (same reasoning as the old
 * server-zone bug this file's predecessor fixed). Once the hold lapses the
 * label flips to `expiredLabel` — the sweep deletes the row on the next
 * server read, so this is only ever shown briefly.
 */
export function HoldCountdown({
    iso,
    template,
    expiredLabel,
}: Readonly<{ iso: string; template: string; expiredLabel: string }>) {
    const [remainingMs, setRemainingMs] = useState(
        () => new Date(iso).getTime() - Date.now(),
    );

    useEffect(() => {
        const tick = () =>
            setRemainingMs(new Date(iso).getTime() - Date.now());
        tick();
        const timer = setInterval(tick, MS_PER_SECOND);
        return () => clearInterval(timer);
    }, [iso]);

    if (remainingMs <= 0) {
        return <span suppressHydrationWarning>{expiredLabel}</span>;
    }
    return (
        <span suppressHydrationWarning className='tabular-nums'>
            {template.replace('{time}', formatRemaining(remainingMs))}
        </span>
    );
}
