import { continueWithGoogle } from '@/lib/auth-actions';

/**
 * The public route's quiet action, used twice: once in the hero for someone who
 * is already a member, once at the board band's foot for someone the board has
 * just convinced.
 *
 * It is a **submit button, not a link.** The action is the same server action
 * the hero's loud tile fires — one action, three call sites, neither forked nor
 * parameterized — so nothing navigates and no second door exists to drift out
 * of step with this one.
 *
 * Body weight, underlined, and — by default — secondary ink: `secondary-foreground`
 * is chalk secondary on the painted board above the seam and secondary ink on
 * the enamel below it, so the default serves the board band's ordinary ground
 * (`activities-band.tsx`) without knowing which theme it is on.
 *
 * `onPhotograph` (#155 review, round two) is the one call the hero band makes
 * differently: `secondary-foreground` is tuned for that *known* ground, and
 * over an Admin's uploaded photograph — an *unknown* ground, guaranteed only
 * down to a worst-case white behind a fixed scrim — it fails AA (2.87:1
 * measured). The hero passes `onPhotograph` whenever a photograph is set, so
 * this one call site switches to `--foreground`, the same colour the rest of
 * that band's text uses over a photograph (`hero-band.tsx`'s
 * `SCRIM_OPACITY_CLASS` carries the arithmetic). The board-band call site
 * never passes it and keeps the muted colour, unchanged.
 */
export function QuietJoin({
    label,
    className,
    onPhotograph = false,
}: Readonly<{ label: string; className?: string; onPhotograph?: boolean }>) {
    const inkClass = onPhotograph ? 'text-foreground' : 'text-secondary-foreground';
    return (
        <form action={continueWithGoogle} className={className}>
            <button
                type='submit'
                className={`type-body underline underline-offset-4 ${inkClass}`}>
                {label}
            </button>
        </form>
    );
}
