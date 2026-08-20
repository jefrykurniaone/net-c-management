import type { ReactNode } from 'react';

/**
 * The profile surface's structure: cells sitting adjacent and sharing one rule
 * with their neighbours, which is what a grid physically is. Never gaps between
 * floating panels, and never a coloured accent line in any direction.
 *
 * Local to this surface on purpose. The public route carries the same three
 * classes in `src/components/landing/band.tsx`, but that module is the public
 * band stack's own vocabulary — importing it here would tie a member surface to
 * a route it shares nothing else with.
 */
export function Lattice({ children }: Readonly<{ children: ReactNode }>) {
    return (
        <div className='divide-y divide-rule overflow-hidden rounded-sm border border-rule bg-card'>
            {children}
        </div>
    );
}

/**
 * A section's opening. The head is **Title**, not tracked caps: tracked caps are
 * the board's own furniture — rail labels, column heads, marks — and never an
 * eyebrow above a section. The supporting line takes Body, at the measure the
 * rest of the system reads prose at.
 */
export function SectionHead({
    label,
    hint,
}: Readonly<{ label: string; hint?: string }>) {
    return (
        <div className='flex flex-col gap-hair'>
            <h2 className='type-title text-foreground'>{label}</h2>
            {hint ? (
                <p className='type-body max-w-[65ch] text-secondary-foreground'>
                    {hint}
                </p>
            ) : null}
        </div>
    );
}
