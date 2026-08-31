/**
 * The week strip's own skeleton. It has to be a strip: flashing a single ruled
 * column, or one wide card, shows an arrangement the surface does not have, and
 * then replaces it half a second later. Seven columns on the same measure and
 * the same grid as the real strip, so nothing shifts when the cards arrive.
 */

import { STRIP_MEASURE } from '@/components/layout/measure';

const DAYS_IN_WEEK = 7;
const DAYS = Array.from({ length: DAYS_IN_WEEK }, (_, index) => index);

const BAR = 'animate-pulse rounded-sm bg-muted motion-reduce:animate-none';

/** One day: its heading, then a card-shaped placeholder under it. */
function DayPlaceholder() {
    return (
        <div className='flex flex-col gap-cell'>
            <span className='flex items-baseline gap-cell'>
                <span className={`${BAR} h-3 w-16`} />
                <span className={`${BAR} h-5 w-6`} />
            </span>
            <div className='flex flex-col rounded-xl bg-card shadow-lift'>
                <div className='flex flex-col gap-cell p-cell'>
                    <span className={`${BAR} h-4 w-24`} />
                    <span className={`${BAR} h-5 w-full`} />
                    <span className={`${BAR} h-3 w-2/3`} />
                </div>
                <div className='flex items-center rounded-b-xl border-t border-border bg-muted/50 p-cell'>
                    <span className={`${BAR} h-5 w-20`} />
                </div>
            </div>
        </div>
    );
}

export default function Loading() {
    return (
        <div className={`${STRIP_MEASURE} flex flex-col gap-bay`}>
            <span className={`${BAR} h-8 w-40`} />
            <span className={`${BAR} h-11 w-56`} />
            <div className='grid grid-cols-1 items-start gap-bay lg:grid-cols-7 lg:gap-cell'>
                {DAYS.map((day) => (
                    <DayPlaceholder key={day} />
                ))}
            </div>
        </div>
    );
}
