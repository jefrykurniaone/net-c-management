'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { PaymentMode } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type {
    MembershipModeView,
    ModeOptionView,
} from '@/lib/membership-mode-view';

interface PaymentModeControlProps {
    activityId: string;
    activityName: string;
    mode: MembershipModeView;
    t: Dictionary;
}

/**
 * Where a member changes how they pay for **one** Activity.
 *
 * Two things this control owes the member. First, that it is scoped to this
 * Activity and nothing else: the legend names the Activity, and each cell owns
 * its own selection and its own action, so saving Badminton cannot move Futsal.
 * Second, which Billing Period the change lands in — stated in a sentence beside
 * the options, before the action is pressed, and re-stated as the selection
 * moves. The current period is immutable, so a switch made today may well not
 * change today's bill, and a member surprised by this month's bill was not told.
 *
 * Every sentence here is derived server-side by `buildMembershipModeView`, which
 * reads the resolver. Nothing in this file decides an effective period.
 */
export function PaymentModeControl({
    activityId,
    activityName,
    mode,
    t,
}: Readonly<PaymentModeControlProps>) {
    // Nothing to choose between: a single offered mode is auto-applied by the
    // resolver, and an Activity offering none has no control to render.
    if (mode.options.length < 2) {
        return (
            <p className='type-body text-secondary-foreground'>
                {mode.options.length === 0
                    ? t.paymentMode.noModesOffered
                    : t.profile.modeSingleOffered}
            </p>
        );
    }

    return (
        <ModeFieldset
            activityId={activityId}
            legend={t.profile.modeLegend.replace('{name}', activityName)}
            options={mode.options}
            initialMode={mode.nextMode}
            t={t}
        />
    );
}

interface ModeFieldsetProps {
    activityId: string;
    legend: string;
    options: readonly ModeOptionView[];
    initialMode: PaymentMode | null;
    t: Dictionary;
}

/** The group itself: this Activity's selection, and the action that commits it. */
function ModeFieldset({
    activityId,
    legend,
    options,
    initialMode,
    t,
}: Readonly<ModeFieldsetProps>) {
    const [selected, setSelected] = useState<PaymentMode | null>(initialMode);
    const { saving, save } = useModeSave(activityId, t);
    const sentenceId = `mode-effect-${activityId}`;
    const chosen = options.find((option) => option.mode === selected);

    return (
        <fieldset className='min-w-0' disabled={saving}>
            {/* The control group's own label — furniture, not an eyebrow. */}
            <legend className='type-label text-muted-foreground'>
                {legend}
            </legend>
            <ModeOptionList
                groupName={`mode-${activityId}`}
                describedBy={sentenceId}
                options={options}
                selected={selected}
                onSelect={setSelected}
            />
            <EffectSentence
                id={sentenceId}
                sentence={chosen?.effectSentence ?? ''}
            />
            <Button
                className='mt-cell'
                size='sm'
                onClick={() => save(selected)}
                disabled={selected === null || selected === initialMode}
                loading={saving}>
                {t.profile.modeSaveButton}
            </Button>
        </fieldset>
    );
}

/**
 * The write. Only the chosen mode is sent: the effective period is the server's
 * to derive, never the client's to propose, so a member cannot backdate a switch
 * to rewrite what they already owe. The refresh is what re-derives the sentences
 * from the resolver against whatever the server actually recorded.
 */
function useModeSave(activityId: string, t: Dictionary) {
    const router = useRouter();
    const [saving, setSaving] = useState(false);

    async function save(mode: PaymentMode | null): Promise<void> {
        if (mode === null) return;
        setSaving(true);
        try {
            await patchPaymentMode(activityId, mode, t);
            toast.success(t.paymentMode.saved);
            router.refresh();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t.common.error);
        } finally {
            setSaving(false);
        }
    }

    return { saving, save };
}

async function patchPaymentMode(
    activityId: string,
    mode: PaymentMode,
    t: Dictionary,
): Promise<void> {
    const res = await fetch(`/api/users/memberships/${activityId}/mode`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
    });
    if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? t.common.error);
    }
}

/**
 * The disclosure the action's label defers to, so it renders at **Body** in
 * Secondary Ink — never Caption, and never the muted step. A condition disclosed
 * in the fine print is not disclosed. `aria-live` so the period is announced as
 * the selection moves, not only when a radio is first focused.
 */
function EffectSentence({
    id,
    sentence,
}: Readonly<{ id: string; sentence: string }>) {
    return (
        <p
            id={id}
            aria-live='polite'
            className='mt-cell type-body text-secondary-foreground'>
            {sentence}
        </p>
    );
}

interface ModeOptionListProps {
    groupName: string;
    describedBy: string;
    options: readonly ModeOptionView[];
    selected: PaymentMode | null;
    onSelect: (mode: PaymentMode) => void;
}

/** The offered modes, as ruled cells separated by a hairline. */
function ModeOptionList({
    groupName,
    describedBy,
    options,
    selected,
    onSelect,
}: Readonly<ModeOptionListProps>) {
    return (
        <div className='mt-cell flex flex-col gap-hair'>
            {options.map((option) => (
                <ModeOption
                    key={option.mode}
                    option={option}
                    groupName={groupName}
                    describedBy={describedBy}
                    isSelected={option.mode === selected}
                    onSelect={() => onSelect(option.mode)}
                />
            ))}
        </div>
    );
}

interface ModeOptionProps {
    option: ModeOptionView;
    groupName: string;
    describedBy: string;
    isSelected: boolean;
    onSelect: () => void;
}

/**
 * One way to pay, as a cell you can write in. A native radio, so the group is
 * keyboard-complete and its focus ring is the browser's own; selection is
 * carried by the radio's form first and by the cell's fill second, and that fill
 * covers the whole cell rather than tinting a neutral one.
 *
 * Dues and a per-Session Fee are different things, so the amount always says
 * which of the two it is, in tabular figures.
 */
function ModeOption({
    option,
    groupName,
    describedBy,
    isSelected,
    onSelect,
}: Readonly<ModeOptionProps>) {
    return (
        <label
            className={cn(
                'flex cursor-pointer items-start gap-cell rounded-sm border border-rule p-cell',
                'focus-within:border-ring',
                isSelected ? 'bg-accent' : 'bg-background',
            )}>
            <input
                type='radio'
                name={groupName}
                value={option.mode}
                checked={isSelected}
                onChange={onSelect}
                aria-describedby={describedBy}
                className='mt-0.5 size-4 shrink-0 accent-primary'
            />
            <span className='min-w-0 flex-1'>
                <span className='type-title block text-card-foreground'>
                    {option.modeLabel}
                </span>
                <span className='type-caption block text-secondary-foreground'>
                    {option.modeDesc}
                </span>
            </span>
            <ModeAmount option={option} />
        </label>
    );
}

/** The price, saying which of Dues or Fee it is, in tabular figures. */
function ModeAmount({ option }: Readonly<{ option: ModeOptionView }>) {
    return (
        <span className='shrink-0 text-right'>
            <span className='type-label block text-muted-foreground'>
                {option.billsLabel}
            </span>
            <span className='type-figure block text-card-foreground'>
                {option.amount}
            </span>
        </span>
    );
}
