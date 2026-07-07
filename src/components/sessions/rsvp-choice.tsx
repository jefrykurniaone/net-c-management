'use client';

import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type RsvpChoiceValue = 'GOING' | 'MAYBE' | 'NONE';

/**
 * Segmented RSVP control matching the design: "Going" (filled when active),
 * optional "Maybe", and "Can't make it". Purely presentational — the parent
 * owns the fetch + loading state. Maybe is only offered on free sessions
 * (`showMaybe`), where a tentative seat costs nothing.
 */
export function RsvpChoice({
    active,
    showMaybe,
    disabled,
    goingDisabled = false,
    labels,
    onGoing,
    onMaybe,
    onCancel,
}: Readonly<{
    active: RsvpChoiceValue;
    showMaybe: boolean;
    disabled: boolean;
    goingDisabled?: boolean;
    labels: { going: string; maybe: string; cantMakeIt: string };
    onGoing: () => void;
    onMaybe: () => void;
    onCancel: () => void;
}>) {
    return (
        <div
            className={cn(
                'grid gap-2.5',
                showMaybe ? 'grid-cols-3' : 'grid-cols-2',
            )}>
            <Button
                variant={active === 'GOING' ? 'default' : 'outline'}
                disabled={disabled || active === 'GOING' || goingDisabled}
                onClick={onGoing}
                className='w-full'>
                {active === 'GOING' && <Check className='size-4' />}
                {labels.going}
            </Button>

            {showMaybe && (
                <Button
                    variant={active === 'MAYBE' ? 'secondary' : 'outline'}
                    disabled={disabled || active === 'MAYBE'}
                    onClick={onMaybe}
                    className='w-full'>
                    {labels.maybe}
                </Button>
            )}

            <Button
                variant='outline'
                disabled={disabled || active === 'NONE'}
                onClick={onCancel}
                className={cn(
                    'w-full',
                    active !== 'NONE' &&
                        'text-destructive hover:bg-destructive/10',
                )}>
                {labels.cantMakeIt}
            </Button>
        </div>
    );
}
