import {
    CalendarDays,
    Clock,
    CreditCard,
    FileText,
    MapPin,
} from 'lucide-react';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { cn } from '@/lib/utils';

/**
 * What the session detail page can say about a Session that its header cannot.
 *
 * The header is the Slot Cell, so it already carries the start and end times,
 * the venue, the Activity and the standing. This card is deliberately only the
 * remainder: the full date with its month, how long the Session runs, the way to
 * the venue on a map, the Fee, and the Admin's notes. Repeating the header's
 * facts underneath it would read as two Sessions rather than one.
 */

const MINUTES_PER_HOUR = 60;

/** "19:00" + "21:00" → "2 hours" (or "1.5 hours"); empty when unparseable. */
function formatDuration(
    start: string,
    end: string,
    hourLabel: string,
    hoursLabel: string,
): string {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const minutes =
        endH * MINUTES_PER_HOUR + endM - (startH * MINUTES_PER_HOUR + startM);
    if (!Number.isFinite(minutes) || minutes <= 0) return '';
    const hours = minutes / MINUTES_PER_HOUR;
    const value = Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
    return `${value} ${hours === 1 ? hourLabel : hoursLabel}`;
}

function mapsUrl(location: string): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        location,
    )}`;
}

const ROW_CLASS = 'flex items-center gap-3 py-3 first:pt-0 last:pb-0';
const ICON_CLASS = 'w-[18px] h-[18px] shrink-0 text-primary';

export interface SessionFactsData {
    /** The date already written out — "Monday, 18 August" — never a raw Date. */
    readonly dateLabel: string;
    readonly startTime: string;
    readonly endTime: string;
    readonly location: string;
    readonly fee: number;
    readonly notes: string | null;
}

export function SessionFacts({
    session,
    t,
}: Readonly<{ session: SessionFactsData; t: Dictionary }>) {
    const duration = formatDuration(
        session.startTime,
        session.endTime,
        t.sessions.durationHour,
        t.sessions.durationHours,
    );
    return (
        <div className='rounded-sm border border-rule bg-tile p-block text-sm text-secondary-foreground divide-y divide-border'>
            <div className={ROW_CLASS}>
                <CalendarDays className={ICON_CLASS} />
                <span className='text-foreground'>{session.dateLabel}</span>
                {duration && (
                    <span className='ml-auto flex items-center gap-1.5 text-muted-foreground'>
                        <Clock className={ICON_CLASS} aria-hidden='true' />
                        {duration}
                    </span>
                )}
            </div>
            {session.location && (
                <div className={ROW_CLASS}>
                    <MapPin className={ICON_CLASS} />
                    <a
                        href={mapsUrl(session.location)}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='font-medium text-primary hover:underline'>
                        {t.sessions.mapLink}
                    </a>
                </div>
            )}
            {session.fee > 0 && (
                <div className={ROW_CLASS}>
                    <CreditCard className={ICON_CLASS} />
                    <span className='text-foreground'>
                        <span className='tabular-nums'>
                            Rp {session.fee.toLocaleString('id-ID')}
                        </span>
                        <span className='text-muted-foreground'>
                            {t.sessions.perPlayer}
                        </span>
                    </span>
                </div>
            )}
            {session.notes && (
                /* `cn` and not a template string: `items-start` has to beat
                   `items-center` from the shared row class, and two utilities
                   for one property are resolved by order in the stylesheet, not
                   by order in the attribute. */
                <div className={cn(ROW_CLASS, 'items-start')}>
                    <FileText className={cn(ICON_CLASS, 'mt-0.5')} />
                    <span className='whitespace-pre-wrap'>{session.notes}</span>
                </div>
            )}
        </div>
    );
}
