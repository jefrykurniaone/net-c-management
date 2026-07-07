'use client';

/**
 * Renders a reservation-hold expiry time in the VIEWER's local timezone,
 * matching the session detail CTA. Server-rendering time-of-day with date-fns
 * would use the server's zone (UTC on serverless) and disagree with the session
 * page — the two screens showed different "pay before" times in prod.
 */
export function HoldTime({
    iso,
    template,
}: Readonly<{ iso: string; template: string }>) {
    const time = new Date(iso).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    });
    return <span suppressHydrationWarning>{template.replace('{time}', time)}</span>;
}
