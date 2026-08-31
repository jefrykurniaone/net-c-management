import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const ROW_CLASS =
    'grid gap-cell border-b border-border px-block py-cell md:grid-cols-2 md:items-start md:gap-block';

/** The id a row's helper paragraph carries, for the control's `aria-describedby`. */
export function settingsHelperId(id: string): string {
    return `${id}-helper`;
}

/**
 * One ruled row per setting: tracked-caps label and helper on the left,
 * the control on the right, at `md` and up; stacked below it, staying ruled.
 * The register's field treatment, not the register's own `<table>` — a
 * Settings form is a form.
 */
export function SettingsRow({
    id,
    label,
    helper,
    isLast = false,
    children,
}: Readonly<{
    id: string;
    label: string;
    helper?: string;
    isLast?: boolean;
    children: ReactNode;
}>) {
    return (
        <div className={cn(ROW_CLASS, isLast && 'border-b-0')}>
            <div className='space-y-hair'>
                <Label
                    htmlFor={id}
                    className='type-label text-muted-foreground'>
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
