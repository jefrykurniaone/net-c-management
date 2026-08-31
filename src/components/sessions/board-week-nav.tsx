import Link from 'next/link';
import type { Dictionary } from '@/lib/i18n/dictionaries';

/**
 * Which week the strip is showing, and how to reach the ones either side. This
 * is what replaces an Upcoming/Past split and a pager: the surface shows a
 * range, so moving through time is moving the range, and every day in it keeps
 * its column either way. A pager cannot express that — page two of a week is
 * not a thing.
 *
 * The controls are pills at a 44px touch target, and they carry the reader's
 * view and Activity filter with them, so changing week never silently widens
 * what they were looking at.
 */

const NAV_LINK = [
    'inline-flex min-h-11 items-center rounded-full border border-border bg-card',
    'px-block type-label text-secondary-foreground shadow-lift transition-rally',
    'hover:bg-muted hover:text-foreground',
    'focus-visible:outline-2 focus-visible:outline-ring',
    'focus-visible:outline-offset-2',
].join(' ');

export function BoardWeekNav({
    caption,
    prevHref,
    thisHref,
    nextHref,
    t,
}: Readonly<{
    caption: string;
    prevHref: string;
    thisHref: string;
    nextHref: string;
    t: Dictionary;
}>) {
    return (
        <nav
            aria-label={t.sessions.boardWeekNavLabel}
            className='flex flex-wrap items-center justify-between gap-cell'>
            <p className='type-figure text-foreground'>{caption}</p>
            <span className='flex flex-wrap items-center gap-cell'>
                <Link href={prevHref} className={NAV_LINK}>
                    {t.sessions.boardPrevWeek}
                </Link>
                <Link href={thisHref} className={NAV_LINK}>
                    {t.sessions.boardThisWeek}
                </Link>
                <Link href={nextHref} className={NAV_LINK}>
                    {t.sessions.boardNextWeek}
                </Link>
            </span>
        </nav>
    );
}
