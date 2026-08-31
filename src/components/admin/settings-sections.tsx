import type { ReactNode } from 'react';

/**
 * One named group of Settings rows: a tracked-caps Label-role legend sitting
 * on the card's own face, ruled below it — the Table primitive's own head
 * treatment (DESIGN.md § Components), copied here as token classes rather
 * than imported from `register.tsx`, since a Settings form is a `<fieldset>`,
 * never the register's own `<table>`.
 */
const SECTION_HEAD_CLASS =
    'block w-full px-block py-cell border-b border-border type-label text-muted-foreground';

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
