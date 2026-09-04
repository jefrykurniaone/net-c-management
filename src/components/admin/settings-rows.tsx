import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';

const ROW_CLASS = 'grid gap-cell md:grid-cols-2 md:items-start md:gap-block';

/** The id a row's helper paragraph carries, for the control's `aria-describedby`. */
export function settingsHelperId(id: string): string {
    return `${id}-helper`;
}

/**
 * One setting per row: tracked-caps label and helper on the left, the control
 * on the right, at `md` and up; stacked below it. Unruled — the section card
 * that holds the rows is what bounds them, and rows are told apart by the space
 * between them.
 */
export function SettingsRow({
    id,
    label,
    helper,
    children,
}: Readonly<{
    id: string;
    label: string;
    helper?: string;
    children: ReactNode;
}>) {
    return (
        <div className={ROW_CLASS}>
            <div className='space-y-hair'>
                <Label
                    htmlFor={id}
                    typeRole='label'
                    className='text-muted-foreground'>
                    {label}
                </Label>
                {helper && (
                    <p
                        id={settingsHelperId(id)}
                        className='type-caption text-muted-foreground'>
                        {helper}
                    </p>
                )}
            </div>
            <div className='space-y-cell'>{children}</div>
        </div>
    );
}
