import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';

/**
 * One named group of Settings, as its own card: a Title-role legend over the
 * settings it names — the role the design system already gives card and section
 * headings, so the legend outranks the tracked-caps Label the rows beneath it
 * use. The card's own edge is what separates one group from the next, so
 * neither the legend nor the rows below it are ruled — a rule per row turned a
 * four-group form into a ladder of lines.
 */
const SECTION_HEAD_CLASS =
    'block w-full px-block pt-block pb-cell type-title text-foreground';

export function SettingsSection({
    title,
    children,
}: Readonly<{ title: string; children: ReactNode }>) {
    return (
        <Card className='gap-0 p-0'>
            <fieldset className='m-0 min-w-0 border-0 p-0'>
                <legend className={SECTION_HEAD_CLASS}>{title}</legend>
                <div className='space-y-block px-block pb-block'>
                    {children}
                </div>
            </fieldset>
        </Card>
    );
}
