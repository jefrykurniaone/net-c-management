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
                    // `Input` now carries the read-only Enamel Ground fill itself
                    // (`read-only:bg-board`), so only the icon clearance and the
                    // Figure role for an amount are this field's own to add.
                    className={cn(
                        'pr-8',
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
