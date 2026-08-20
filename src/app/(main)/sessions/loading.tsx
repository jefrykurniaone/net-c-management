/**
 * The board's own skeleton. It has to be a lattice: the shared skeleton in
 * `src/components/skeletons` is pre-lattice — floating rounded cards — and
 * flashing a pile of cards before the board resolves shows the arrangement this
 * world exists to refuse, half a second before refusing it.
 *
 * Same seven columns and the same column floor as the board, so nothing shifts
 * sideways when the real cells arrive.
 */

const DAYS_IN_WEEK = 7;
const COLUMNS = Array.from({ length: DAYS_IN_WEEK }, (_, index) => index);

const LATTICE_COLUMNS =
    'md:[grid-template-columns:repeat(7,minmax(11rem,1fr))]';
const BAR = 'animate-pulse rounded-sm bg-board';

function DayPlaceholder() {
    return (
        <div className='flex flex-col gap-cell bg-tile p-cell'>
            <div className='flex items-start justify-between gap-cell'>
                <span className='flex flex-col gap-hair'>
                    <span className={`${BAR} h-2 w-8`} />
                    <span className={`${BAR} h-5 w-6`} />
                </span>
                <span className={`${BAR} h-4 w-12`} />
            </div>
            <span className={`${BAR} h-4 w-3/4`} />
            <span className={`${BAR} h-3 w-full`} />
            <span className={`${BAR} mt-bay h-6 w-2/3`} />
        </div>
    );
}

export default function Loading() {
    return (
        <div className='flex flex-col gap-bay'>
            <span className={`${BAR} h-8 w-40`} />
            <span className={`${BAR} h-11 w-56`} />
            <div
                className={`grid grid-cols-1 gap-px rounded-sm border border-rule bg-rule ${LATTICE_COLUMNS}`}>
                {COLUMNS.map((column) => (
                    <DayPlaceholder key={column} />
                ))}
            </div>
        </div>
    );
}
