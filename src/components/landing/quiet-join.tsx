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
 * Body weight, secondary ink, underlined. That is what makes it quiet next to
 * the loud tile without becoming fine print, and it resolves correctly on both
 * materials: `secondary-foreground` is chalk secondary on the painted board
 * above the seam and secondary ink on the enamel below it, so one component
 * serves both without knowing which it is on.
 */
export function QuietJoin({
    label,
    className,
}: Readonly<{ label: string; className?: string }>) {
    return (
        <form action={continueWithGoogle} className={className}>
            <button
                type='submit'
                className='type-body text-secondary-foreground underline underline-offset-4'>
                {label}
            </button>
        </form>
    );
}
