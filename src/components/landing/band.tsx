import type { ReactNode } from 'react';

/**
 * Primitives of the public route's band stack — a third layout category
 * alongside the board surface and the interstitial, and one that exists on this
 * route and nowhere else.
 *
 * A vertical stack of full-bleed bands. The hero is painted board and centres
 * its content at its own text measure; every band below the seam is themed
 * material, gutter-aligned to the same 72rem as the header rail and the footer,
 * and genuinely dense inside generous band padding. That positional split —
 * air *between* bands, board density *inside* cells — is what keeps the page
 * from reading as two websites stapled together.
 */

/** The shared gutter. Every surface above and below the seam aligns to it — the hero band alone does not. */
export const BOARD_GUTTER_CLASS = 'max-w-[72rem]';

/**
 * Band air: `56px`, collapsing to `28px` below 768px so mobile lands back on
 * `bay` and inherits board density. The hero takes the step above this one.
 */
const BAND_AIR_CLASS = 'py-bay md:py-band';

/**
 * A full-bleed enamel band. No bottom rule and no top rule: below the seam the
 * bands are the same material as each other, and the boundary that matters —
 * painted board returning to enamel — is a material change, which is a harder
 * edge than any hairline.
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
                at any viewport wide enough to reach the cap. That is the same
                family of defect as the misalignment this route was rebuilt to
                stop, and it is invisible on a phone, where no surface reaches
                the gutter. */}
            <div className={`mx-auto ${BOARD_GUTTER_CLASS} px-block`}>
                {children}
            </div>
        </section>
    );
}

/**
 * A band's opening, in **board register**: the head is Title, not Display. The
 * seam is the material change and nothing else. Display heads are an asset when
 * the band has data and a liability when it does not, since they announce a
 * section that then says nothing has been posted yet.
 */
export function BandHead({
    head,
    body,
}: Readonly<{ head: string; body: string }>) {
    return (
        <div className='mb-block flex flex-col gap-hair'>
            <h2 className='type-title text-balance text-foreground'>{head}</h2>
            <p className='type-body max-w-[65ch] text-secondary-foreground'>
                {body}
            </p>
        </div>
    );
}

/**
 * Cells sharing a single rule with their neighbours, which is what a grid
 * physically is. Never gaps between floating panels.
 */
export function Lattice({ children }: Readonly<{ children: ReactNode }>) {
    return (
        <div className='divide-y divide-rule overflow-hidden rounded-sm border border-rule bg-card'>
            {children}
        </div>
    );
}

/**
 * An Activity's livery: a magnet tile bearing its initial, **with no colour.**
 * Not a coloured square and never an edge stripe. There is no Activity colour to
 * read — Court Green is the only green the system permits, and an arbitrary
 * admin-chosen hex can be trusted neither to carry legible lettering nor to
 * clear contrast on both board materials, so the column was dropped outright.
 */
export function Livery({ initial }: Readonly<{ initial: string }>) {
    return (
        <span className='type-figure flex size-9 shrink-0 items-center justify-center rounded-sm border border-rule bg-background text-secondary-foreground'>
            {initial}
        </span>
    );
}
