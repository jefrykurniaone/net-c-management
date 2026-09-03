import { format } from 'date-fns';
import type { Locale as DateFnsLocale } from 'date-fns';
import type { Dictionary } from '@/lib/i18n/dictionaries';

/** Today, spelled out in the reader's own locale above the greeting. */
const GREETING_DATE_FORMAT = 'EEEE, d MMMM yyyy';

/**
 * The dashboard's own heading: today's date, then the member greeted by first
 * name. A member with no stored name is greeted without one rather than with
 * a placeholder.
 */
export function GreetingHeader({
    now,
    dateLocale,
    memberName,
    t,
}: Readonly<{
    now: Date;
    dateLocale: DateFnsLocale;
    memberName: string | null | undefined;
    t: Dictionary;
}>) {
    return (
        <div className='space-y-0.5'>
            <p className='text-xs font-medium text-muted-foreground uppercase tracking-[0.08em]'>
                {format(now, GREETING_DATE_FORMAT, { locale: dateLocale })}
            </p>
            <h1 className='text-2xl font-bold text-foreground'>
                {t.dashboard.welcomeGreeting}{' '}
                {memberName?.split(' ')[0]}
            </h1>
        </div>
    );
}
