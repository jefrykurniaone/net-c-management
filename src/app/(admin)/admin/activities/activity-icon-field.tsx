'use client';

import { useId } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
    FormDescription,
    FormField,
    FormItem,
    FormMessage,
} from '@/components/ui/form';
import {
    ACTIVITY_ICON_GLYPHS,
    ACTIVITY_ICON_NONE_GLYPH,
} from '@/components/activity/activity-icon-glyphs';
import { ACTIVITY_ICON_KEYS, type ActivityIconKey } from '@/lib/activity-icons';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { cn } from '@/lib/utils';
import type { ActivityForm } from './dues-rate-field';

/**
 * The Activity's icon, picked from the curated set (#164).
 *
 * A native radio group, not a grid of buttons carrying `role="radio"`: the
 * browser then gives roving focus, arrow-key movement and one tab stop for the
 * whole group for free, and none of it can drift out of step with the visual
 * state. Each radio is visually hidden and labelled from the dictionary, so the
 * glyph never has to carry a name it cannot say.
 *
 * The chosen tile is told apart by three channels, not one: the highlight fill,
 * a doubled edge, and the lift. That is The Boundary Rule — the accent fill is
 * a hue step rather than a lightness one, so a reader who cannot see the hue
 * still has the weight and the shadow. `aria-checked` is the fourth, and it is
 * the browser's own.
 */

/** The radio value standing for "no icon". Never a stored key. */
const NO_ICON_VALUE = 'none';

type IconChoiceProps = Readonly<{
    /** Shared across the group, so two open dialogs never cross-select. */
    groupName: string;
    value: string;
    label: string;
    isSelected: boolean;
    onSelect: () => void;
    glyph: LucideIcon;
}>;

function IconChoice({
    groupName,
    value,
    label,
    isSelected,
    onSelect,
    glyph: Glyph,
}: IconChoiceProps) {
    return (
        <label className='cursor-pointer'>
            <input
                type='radio'
                name={groupName}
                value={value}
                checked={isSelected}
                onChange={onSelect}
                aria-label={label}
                className='peer sr-only'
            />
            <span
                title={label}
                className={cn(
                    'flex size-9 items-center justify-center rounded-md border border-border',
                    'transition-rally',
                    'peer-focus-visible:border-ring peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50',
                    isSelected
                        ? 'border-2 bg-accent text-accent-foreground shadow-lift'
                        : 'bg-card text-muted-foreground hover:bg-muted',
                )}>
                <Glyph aria-hidden='true' className='size-4' />
            </span>
        </label>
    );
}

type IconGridProps = Readonly<{
    groupName: string;
    selected: ActivityIconKey | null;
    onChange: (key: ActivityIconKey | null) => void;
    t: Dictionary;
}>;

/**
 * The "no icon" choice leads the grid rather than trailing it: clearing a wrong
 * pick is one of the Admin stories this ticket exists for, and a control that
 * undoes something belongs where the eye starts.
 */
function IconGrid({ groupName, selected, onChange, t }: IconGridProps) {
    return (
        <div className='grid grid-cols-6 gap-cell sm:grid-cols-9'>
            <IconChoice
                groupName={groupName}
                value={NO_ICON_VALUE}
                label={t.activityIcon.none}
                isSelected={selected === null}
                onSelect={() => onChange(null)}
                glyph={ACTIVITY_ICON_NONE_GLYPH}
            />
            {ACTIVITY_ICON_KEYS.map((key) => (
                <IconChoice
                    key={key}
                    groupName={groupName}
                    value={key}
                    label={t.activityIcon.names[key]}
                    isSelected={selected === key}
                    onSelect={() => onChange(key)}
                    glyph={ACTIVITY_ICON_GLYPHS[key]}
                />
            ))}
        </div>
    );
}

export function ActivityIconField({
    form,
    t,
}: Readonly<{ form: ActivityForm; t: Dictionary }>) {
    const groupName = useId();

    return (
        <FormField
            control={form.control}
            name='icon'
            render={({ field }) => (
                <FormItem>
                    <fieldset>
                        <legend className='mb-2 text-sm font-medium leading-none'>
                            {t.activityIcon.label}
                        </legend>
                        <IconGrid
                            groupName={groupName}
                            selected={field.value ?? null}
                            onChange={field.onChange}
                            t={t}
                        />
                    </fieldset>
                    <FormDescription>{t.activityIcon.hint}</FormDescription>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}
