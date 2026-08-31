'use client';

import type { Control } from 'react-hook-form';
import { FormField, FormItem } from '@/components/ui/form';
import { ActivityTile } from '@/components/activity/activity-tile';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { OnboardingFormData } from '@/lib/validations/user';
import type { ActivityOption } from '@/types/activity';
import { ACTIVITY_ERROR_KEYS, FieldErrorMessage } from './field-error-message';

const CHIP_BASE_CLASS =
    'inline-flex min-h-11 items-center gap-2 rounded-[2px] border py-1.5 pl-2 pr-4 type-body transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';
const CHIP_SELECTED_CLASS =
    'border-transparent bg-primary-solid text-primary-solid-foreground';
const CHIP_UNSELECTED_CLASS =
    'border-rule bg-tile text-secondary-foreground hover:bg-accent hover:text-accent-foreground';

/** Toggles one Activity id in the selection, keeping the rest in place. */
function toggleSelection(current: string[] | undefined, id: string): string[] {
    const selected = current ?? [];
    return selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id];
}

/**
 * The onboarding Activity picker — a `<fieldset>`/`<legend>` group rather
 * than a floating label, since there is no single control here for a
 * `<FormLabel htmlFor>` to point at. Each chip is a native `<button>`, so the
 * whole group is keyboard-operable and carries a visible focus ring with no
 * extra wiring.
 */
export function ActivityField({
    control,
    activities,
    t,
}: Readonly<{
    control: Control<OnboardingFormData>;
    activities: readonly ActivityOption[];
    t: Dictionary;
}>) {
    return (
        <FormField
            control={control}
            name='activityIds'
            render={({ field }) => (
                <FormItem>
                    <fieldset className='m-0 flex flex-col gap-cell border-0 p-0'>
                        <legend className='text-sm font-medium text-foreground'>
                            {t.onboarding.activityLabel}
                        </legend>
                        <div className='flex flex-wrap gap-cell'>
                            {activities.map((activity) => {
                                const isSelected =
                                    field.value?.includes(activity.id) ?? false;
                                return (
                                    <button
                                        type='button'
                                        key={activity.id}
                                        onClick={() =>
                                            field.onChange(
                                                toggleSelection(
                                                    field.value,
                                                    activity.id,
                                                ),
                                            )
                                        }
                                        aria-pressed={isSelected}
                                        className={`${CHIP_BASE_CLASS} ${isSelected ? CHIP_SELECTED_CLASS : CHIP_UNSELECTED_CLASS}`}>
                                        <ActivityTile
                                            name={activity.name}
                                            size='inline'
                                        />
                                        {activity.name}
                                    </button>
                                );
                            })}
                        </div>
                        <p className='type-caption text-secondary-foreground'>
                            {t.onboarding.activityHint}
                        </p>
                        <FieldErrorMessage t={t} keyMap={ACTIVITY_ERROR_KEYS} />
                    </fieldset>
                </FormItem>
            )}
        />
    );
}
