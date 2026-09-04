import type { ReactNode } from 'react';

/**
 * Primitives of the public route's band stack — a third layout category
 * alongside the member surfaces and the interstitial, existing on this route
 * and nowhere else. A vertical stack of full-bleed bands: air *between* bands,
 * density *inside* the cards on them, which is what keeps the page from reading
 * as two websites stapled together. The hero is the one band that does not take
 * the shared gutter below; it carries its own dark ground at a text measure.
 */

/** The shared gutter. Every surface except the hero band aligns to it. */
export const BOARD_GUTTER_CLASS = 'max-w-[72rem]';

/**
 * Band air: `56px`, collapsing to `28px` below 768px so a phone lands back on
 * `bay`. The hero takes the step above this one.
 */
const BAND_AIR_CLASS = 'py-bay md:py-band';

/**
 * A full-bleed band on the page ground. No top or bottom rule: below the hero
 * every band is the same material as its neighbours, and the one boundary that
 * matters — the hero's dark ground returning to the themed page — is a
 * material change, which is a harder edge than any hairline.
 *
 * No `min-height` and no `100dvh`. A band's height is its content plus its
 * padding, because the law that replaces a minimum height is a budget: no band
 * may be sized such that the next band's top edge falls below the fold at a
 * 900px viewport.
 */
export function Band({ children }: Readonly<{ children: ReactNode }>) {
    return (
        <section className={`w-full bg-background ${BAND_AIR_CLASS}`}>
            {/* The padding sits *inside* the gutter wrapper, matching the rail
                and the footer. Outside it the band's content lands 16px left of
                both — the gutter caps the wrapper at 72rem and then the padding
                insets everything else, so the shared left edge silently breaks
                at any viewport wide enough to reach the cap. It is invisible on
                a phone, where no surface reaches the gutter. */}
            <div className={`mx-auto ${BOARD_GUTTER_CLASS} px-block`}>
                {children}
            </div>
        </section>
    );
}

/**
 * A band's opening. The head is **Display** — Rally has one condensed heavy
 * uppercase role and DESIGN.md gives it the public page's section heads as
 * well as the hero pitch and the app's page titles, so a band head and the
 * hero headline are the same role on two different grounds.
 *
 * `body` is optional: the Activities band explains what a card holds, and the
 * about and features bands have the Admin's own words directly beneath the
 * head with nothing for the product to add.
 */
export function BandHead({
    head,
    body,
}: Readonly<{ head: string; body?: string }>) {
    return (
        <div className='mb-bay flex flex-col gap-cell'>
            <h2 className='type-display min-w-0 max-w-full break-words text-foreground'>
                {head}
            </h2>
            {body ? (
                <p className='type-body max-w-[65ch] text-secondary-foreground'>
                    {body}
                </p>
            ) : null}
        </div>
    );
}

/**
 * How many cards a band puts across a desktop viewport. A closed union rather
 * than a class string, so a band cannot invent a fifth column count and the
 * two grids on this route stay comparable.
 */
export type BandGridKind = 'activities' | 'features';

const GRID_COLUMNS: Readonly<Record<BandGridKind, string>> = {
    /** Activity cards carry four lines each, so three across is the ceiling. */
    activities: 'sm:grid-cols-2 lg:grid-cols-3',
    /** Feature cards carry two, so the whole set of four fits one row. */
    features: 'sm:grid-cols-2 lg:grid-cols-4',
};

/**
 * A band's card grid. One column on a phone, two from `sm`, and the band's own
 * count from `lg`; the gap is `block`, so cards read as separate objects on the
 * ground rather than as cells sharing a rule — which is exactly what ADR 0003
 * chose over the lattice.
 */
export function BandGrid({
    kind,
    children,
}: Readonly<{ kind: BandGridKind; children: ReactNode }>) {
    return (
        <div className={`grid gap-block ${GRID_COLUMNS[kind]}`}>{children}</div>
    );
}
