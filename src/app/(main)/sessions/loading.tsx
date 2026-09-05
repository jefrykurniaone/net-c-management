/**
 * The sessions page's own skeleton. It has to be sectioned cards: flashing a
 * single ruled column, or one wide card, shows an arrangement the surface does
 * not have and then replaces it half a second later. The same measure, the same
 * section spacing and the same grid as the real page, so nothing shifts when the
 * cards arrive.
 */

import { STRIP_MEASURE } from '@/components/layout/measure';

/** Two headed sections of three cards: one full desktop row each, which is what
 *  a first paint of this page most often resolves to. */
const SECTION_COUNT = 2;
const CARDS_PER_SECTION = 3;

const SECTIONS = Array.from({ length: SECTION_COUNT }, (_, index) => index);
const CARDS = Array.from({ length: CARDS_PER_SECTION }, (_, index) => index);

const BAR = 'animate-pulse rounded-sm bg-muted motion-reduce:animate-none';
const TILE = 'animate-pulse rounded-md bg-muted motion-reduce:animate-none';

/** One card: its information area, then the footer rule under it. */
function CardPlaceholder() {
    return (
        <div className='flex flex-col rounded-xl bg-card shadow-lift'>
            <div className='flex flex-col gap-cell p-cell'>
                <span className={`${BAR} h-5 w-32`} />
                <span className={`${BAR} h-4 w-24`} />
                <span className={`${BAR} h-3 w-2/3`} />
                <span className={`${BAR} h-4 w-28`} />
            </div>
            <div className='flex items-center justify-between rounded-b-xl border-t border-border bg-muted/50 p-cell'>
                <span className={`${BAR} h-5 w-20`} />
                <span className={`${BAR} h-5 w-24`} />
            </div>
        </div>
    );
}

/** One Activity: its tile and name, then its grid of cards. */
function SectionPlaceholder() {
    return (
        <div className='flex flex-col gap-cell'>
            <span className='flex flex-wrap items-center gap-cell'>
                <span className={`${TILE} size-9`} />
                <span className={`${BAR} h-5 w-40`} />
                <span className={`${BAR} h-3 w-24`} />
            </span>
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
                {CARDS.map((card) => (
                    <CardPlaceholder key={card} />
                ))}
            </div>
        </div>
    );
}

export default function Loading() {
    return (
        <div className={`${STRIP_MEASURE} flex flex-col gap-bay`}>
            <span className={`${BAR} h-8 w-40`} />
            <span className={`${BAR} h-11 w-56`} />
            {SECTIONS.map((section) => (
                <SectionPlaceholder key={section} />
            ))}
        </div>
    );
}
