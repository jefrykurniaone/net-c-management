/**
 * The board's own skeleton. It has to be ruled: the shared skeleton in
 * `src/components/skeletons` is pre-lattice — floating rounded cards — and
 * flashing a pile of cards before the board resolves shows the arrangement this
 * world exists to refuse, half a second before refusing it.
 *
 * One column of ruled day rows and the same measure as the board, so nothing
 * shifts when the real cells arrive.
 */

import { COLUMN_MEASURE } from '@/components/layout/measure';

const DAYS_IN_WEEK = 7;
const DAYS = Array.from({ length: DAYS_IN_WEEK }, (_, index) => index);

const BAR = 'animate-pulse rounded-sm bg-board';

/** One day: its band, then a row shaped like the real one — time, Session, mark. */
function DayPlaceholder() {
    return (
        <>
            <div className='bg-board px-cell py-hair'>
                <span className={`${BAR} h-2 w-28`} />
            </div>
            <div className='grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-baseline gap-x-cell gap-y-hair bg-tile p-cell'>
                <span className={`${BAR} h-4 w-12`} />
                <span className={`${BAR} h-4 w-2/3`} />
                <span className={`${BAR} h-4 w-20 justify-self-end`} />
                <span className='col-start-2 col-end-4'>
                    <span className={`${BAR} block h-3 w-1/2`} />
                </span>
            </div>
        </>
    );
}

export default function Loading() {
    return (
        <div className={`${COLUMN_MEASURE} flex flex-col gap-bay`}>
            <span className={`${BAR} h-8 w-40`} />
            <span className={`${BAR} h-11 w-56`} />
            <div className='grid grid-cols-1 gap-px rounded-sm border border-rule bg-rule'>
                {DAYS.map((day) => (
                    <DayPlaceholder key={day} />
                ))}
            </div>
        </div>
    );
}
