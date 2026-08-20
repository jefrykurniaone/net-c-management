import { Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * A field whose value the server set. It takes the ground fill a read-only
 * field takes, a lock, and a note naming who set it — form and words, so the
 * state never rests on colour. `isFigure` gives the value the tabular Figure
 * role, for the one field of the two that carries an amount.
 */
export function ReadOnlyField({
    id,
    label,
    value,
    note,
    isFigure = false,
}: Readonly<{
    id: string;
    label: string;
    value: string;
    note: string;
    isFigure?: boolean;
}>) {
    const noteId = `${id}-note`;
    return (
        <div className='space-y-hair'>
            <Label htmlFor={id}>{label}</Label>
            <div className='relative'>
                <Input
                    id={id}
                    type='text'
                    readOnly
                    aria-describedby={noteId}
                    className={cn(
                        // `dark:bg-board` is not redundant beside `bg-board`.
                        // `Input` ships `dark:bg-input/30`, and the dark variant
                        // compiles to `&:is(.dark *)` — one class more specific
                        // than a plain utility, so it out-specifies `bg-board`
                        // whatever the order here. The field then took a *lighter*
                        // fill than the tile it sits on, reading as raised where
                        // the design says recessed, and the one affordance saying
                        // "the server set this" pointed the wrong way.
                        'bg-board dark:bg-board pr-8',
                        isFigure && 'type-figure tabular-nums',
                    )}
                    value={value}
                />
                <Lock
                    aria-hidden='true'
                    className='pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-secondary-foreground'
                />
            </div>
            <p id={noteId} className='type-caption text-secondary-foreground'>
                {note}
            </p>
        </div>
    );
}
