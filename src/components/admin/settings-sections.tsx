import type { ReactNode } from 'react';

/**
 * One named group of Settings rows. Composed from the register's own
 * head-cell idiom — a tracked-caps label on a `bg-board` row, ruled below it
 * — copied here as token classes rather than imported from
 * `register.tsx`, since a Settings form is a `<fieldset>`, never the
 * register's own `<table>`.
 */
const SECTION_HEAD_CLASS =
    'block w-full bg-board px-block py-cell border-b border-rule type-label text-muted-foreground';

export function SettingsSection({
    title,
    children,
}: Readonly<{ title: string; children: ReactNode }>) {
    return (
        <fieldset className='m-0 min-w-0 border-0 p-0'>
            <legend className={SECTION_HEAD_CLASS}>{title}</legend>
            {children}
        </fieldset>
    );
}
