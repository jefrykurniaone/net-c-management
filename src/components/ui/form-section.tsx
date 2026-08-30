import type { ReactNode } from 'react';

/**
 * Visual grouping for long forms: related fields sit inside one bordered
 * fieldset with a legend, so the user scans a handful of titled blocks
 * instead of one flat list of inputs.
 */
export function FormSection({
    title,
    hint,
    children,
}: Readonly<{ title: string; hint?: string; children: ReactNode }>) {
    return (
        <fieldset className='space-y-4 rounded-sm border border-rule p-block'>
            <legend className='px-1 text-sm font-semibold text-foreground'>
                {title}
            </legend>
            {hint && <p className='text-xs text-muted-foreground'>{hint}</p>}
            {children}
        </fieldset>
    );
}
