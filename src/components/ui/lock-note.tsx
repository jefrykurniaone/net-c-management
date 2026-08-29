/**
 * The sentence a locked or restricted control points at.
 *
 * DESIGN.md § Actions: "A disclosure the label defers to is not fine print."
 * Where a control's own label does not state a condition and a sentence beneath
 * it does, that sentence renders at **Body** in Secondary Ink — never Caption,
 * never the subtle or muted step — and is tied to the control with
 * `aria-describedby`. It carries no icon and no colour: the fact is in the
 * sentence, and a panel in a hue nothing else on the board uses would be state
 * by colour alone, which The Mark-Not-Hue Rule forbids.
 *
 * It lives here rather than beside either Session form because both compose it —
 * `/admin/sessions/new` and `/admin/sessions/{id}/edit` — and neither may reach
 * into the other's directory for it. It is a form primitive of the same kind as
 * `FormSection`, so it sits with the other primitives.
 */
export function LockNote({
    id,
    children,
}: Readonly<{ id: string; children: string }>) {
    return (
        <p id={id} className='type-body text-secondary-foreground'>
            {children}
        </p>
    );
}
