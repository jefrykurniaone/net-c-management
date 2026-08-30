'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { ControllerRenderProps, UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    useFormField,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { parseIntInput } from '@/lib/form-utils';
import type {
    DuesRateFieldView,
    DuesRatePeriodOption,
} from '@/lib/dues-rate-view';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { CreateActivityFormData } from '@/lib/validations/activity';

/**
 * The Dues field on an existing Activity: the amount, the Billing Period it
 * starts from, and the sentence that says what is charged now and what is about
 * to be.
 *
 * Every figure and every month here is decided server-side by
 * `buildDuesRateFieldView`, which reads the same rules the route enforces.
 * Nothing in this file resolves a rate, ranks a Period or decides what is
 * queued — a form that worked those out for itself would be a second answer to
 * the question the money depends on.
 *
 * Creating an Activity keeps its single amount box and no picker: the
 * beginning-of-time rate is written by the create path, so there is no month to
 * choose.
 */

const DECIMAL_RADIX = 10;

export type ActivityForm = UseFormReturn<CreateActivityFormData>;

export type DuesRateFieldProps = Readonly<{
    form: ActivityForm;
    t: Dictionary;
    view: DuesRateFieldView;
    activityId: string;
    effectiveFrom: number;
    onEffectiveFromChange: (effectiveFrom: number) => void;
    onWithdrawn: () => void;
}>;

/**
 * The amount box, described by the disclosure beneath the field rather than by
 * a `FormDescription`.
 *
 * `FormControl` is deliberately not used: it would point `aria-describedby` at
 * the muted description slot, and per `DESIGN.md` a condition a control's label
 * defers to renders at Body in Secondary Ink, never the muted step. The wiring
 * it does is done here instead, so the validation message still joins the
 * description when there is one.
 */
function DuesAmountInput({
    field,
    describedBy,
}: Readonly<{
    field: ControllerRenderProps<CreateActivityFormData, 'duesAmount'>;
    describedBy: string;
}>) {
    const { formItemId, formMessageId, error } = useFormField();
    return (
        <Input
            type='number'
            min={0}
            {...field}
            value={field.value ?? ''}
            onChange={(e) => field.onChange(parseIntInput(e))}
            id={formItemId}
            aria-invalid={!!error}
            aria-describedby={
                error ? `${describedBy} ${formMessageId}` : describedBy
            }
        />
    );
}

function DuesAmountField({
    form,
    t,
    describedBy,
}: Readonly<{ form: ActivityForm; t: Dictionary; describedBy: string }>) {
    return (
        <FormField
            control={form.control}
            name='duesAmount'
            render={({ field }) => (
                <FormItem>
                    <FormLabel>{t.admin.activityFee}</FormLabel>
                    <DuesAmountInput field={field} describedBy={describedBy} />
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}

/**
 * The months a change may start from — next Period through twelve ahead, and
 * nothing else, because the route refuses anything else. A native `<label>`
 * bound to the trigger by `htmlFor`, so the picker is reachable by keyboard,
 * named when it takes focus, and focusable by clicking its label.
 */
function DuesPeriodPicker({
    t,
    fieldId,
    describedBy,
    options,
    value,
    onChange,
}: Readonly<{
    t: Dictionary;
    fieldId: string;
    describedBy: string;
    options: readonly DuesRatePeriodOption[];
    value: number;
    onChange: (effectiveFrom: number) => void;
}>) {
    return (
        <div className='space-y-2'>
            <Label htmlFor={fieldId}>{t.admin.duesRateStartsFrom}</Label>
            <Select
                value={String(value)}
                onValueChange={(picked) =>
                    onChange(Number.parseInt(picked, DECIMAL_RADIX))
                }>
                <SelectTrigger
                    id={fieldId}
                    className='w-full'
                    aria-describedby={describedBy}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.key} value={String(option.key)}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

async function deleteQueuedDuesRate(
    activityId: string,
    effectiveFrom: number,
    t: Dictionary,
): Promise<void> {
    const res = await fetch(
        `/api/activities/${activityId}/dues-rate?effectiveFrom=${effectiveFrom}`,
        { method: 'DELETE' },
    );
    if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? t.admin.duesRateWithdrawFailed);
    }
}

/**
 * Withdraw the queued change. A **Blank action** per `DESIGN.md` — Enamel Tile
 * ground, a Ruled Line border, Quiet Ink lettering — and a tile, not a link: it
 * writes.
 *
 * `type='button'` is load-bearing. It sits inside the Activity form, and a
 * button that defaults to `submit` would save every half-finished field beside
 * it on the way to withdrawing a rate.
 */
function WithdrawTile({
    t,
    activityId,
    effectiveFrom,
    onWithdrawn,
}: Readonly<{
    t: Dictionary;
    activityId: string;
    effectiveFrom: number;
    onWithdrawn: () => void;
}>) {
    const router = useRouter();
    const [withdrawing, setWithdrawing] = useState(false);

    async function withdraw(): Promise<void> {
        setWithdrawing(true);
        try {
            await deleteQueuedDuesRate(activityId, effectiveFrom, t);
            toast.success(t.admin.duesRateWithdrawn);
            onWithdrawn();
            router.refresh();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t.common.error);
        } finally {
            setWithdrawing(false);
        }
    }

    return (
        <Button
            type='button'
            variant='outline'
            size='sm'
            className='border-rule text-muted-foreground'
            loading={withdrawing}
            onClick={withdraw}>
            {t.admin.duesRateWithdraw}
        </Button>
    );
}

export function DuesRateField({
    form,
    t,
    view,
    activityId,
    effectiveFrom,
    onEffectiveFromChange,
    onWithdrawn,
}: DuesRateFieldProps) {
    const noteId = `dues-rate-note-${activityId}`;
    const pickerId = `dues-rate-period-${activityId}`;

    return (
        <div className='space-y-2'>
            <div className='grid grid-cols-2 gap-4'>
                <DuesAmountField form={form} t={t} describedBy={noteId} />
                <DuesPeriodPicker
                    t={t}
                    fieldId={pickerId}
                    describedBy={noteId}
                    options={view.options}
                    value={effectiveFrom}
                    onChange={onEffectiveFromChange}
                />
            </div>
            <div className='flex flex-wrap items-center gap-cell'>
                {/*
                 * The disclosure the field defers to: Body in Secondary Ink,
                 * never Caption and never the muted step (DESIGN.md). `aria-live`
                 * so a queued change appearing, being replaced or being withdrawn
                 * is announced where it happens, not only on the next focus.
                 */}
                <p
                    id={noteId}
                    aria-live='polite'
                    className='type-body text-secondary-foreground'>
                    {view.sentence}
                </p>
                {view.queuedEffectiveFrom !== null && (
                    <WithdrawTile
                        t={t}
                        activityId={activityId}
                        effectiveFrom={view.queuedEffectiveFrom}
                        onWithdrawn={onWithdrawn}
                    />
                )}
            </div>
        </div>
    );
}
