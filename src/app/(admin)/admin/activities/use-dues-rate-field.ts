'use client';

import { useState } from 'react';
import type { DuesRateFieldView } from '@/lib/dues-rate-view';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { CreateActivityFormData } from '@/lib/validations/activity';
import type { ActivityForm, DuesRateFieldProps } from './dues-rate-field';

/**
 * The Dues field's state, and the shape of the save that carries it.
 *
 * Creating an Activity has neither: its beginning-of-time rate is written by the
 * create path from the single amount box, so there is no Billing Period to pick
 * and nothing extra to post. Everything here is therefore optional by
 * construction — `props` absent means "draw the plain amount box".
 */

/**
 * What an Activity save posts. On edit the Dues figure travels as `duesRate` —
 * an amount **and** the Period it starts from — because a Dues Rate is a history
 * rather than a live field. `monthlyFee` rides along unchanged and is stripped
 * by the update schema, so a cached bundle still posting one cannot write the
 * column this work is retiring.
 */
export type ActivityRequestBody = CreateActivityFormData & {
    duesRate?: { amount: number; effectiveFrom: number };
};

export type DuesRateFieldState = Readonly<{
    /** What `PaymentSection` draws, or `undefined` when creating an Activity. */
    props: DuesRateFieldProps | undefined;
    toRequestBody: (data: CreateActivityFormData) => ActivityRequestBody;
}>;

/**
 * Which Period the Admin has picked, and what the field falls back to once a
 * queued change is withdrawn.
 *
 * Withdrawing leaves the amount box showing a figure that is no longer queued,
 * so it is reset to what the Activity charges now — the rate that stands after
 * the withdrawal. `router.refresh()` re-derives the sentence from the server;
 * only the input's own value has to be put back by hand, because react-hook-form
 * captured it at mount.
 */
export function useDuesRateField(
    input: Readonly<{
        form: ActivityForm;
        t: Dictionary;
        view: DuesRateFieldView | null;
        activityId: string | undefined;
    }>,
): DuesRateFieldState {
    const { form, t, view, activityId } = input;
    const [effectiveFrom, setEffectiveFrom] = useState(view?.effectiveFrom ?? 0);

    function handleWithdrawn(): void {
        if (view === null) {
            return;
        }
        setEffectiveFrom(view.nextEffectiveFrom);
        if (view.currentAmount !== null) {
            form.setValue('monthlyFee', view.currentAmount);
        }
    }

    if (view === null || activityId === undefined) {
        return { props: undefined, toRequestBody: (data) => data };
    }
    return {
        props: {
            form,
            t,
            view,
            activityId,
            effectiveFrom,
            onEffectiveFromChange: setEffectiveFrom,
            onWithdrawn: handleWithdrawn,
        },
        toRequestBody: (data) => ({
            ...data,
            duesRate: { amount: data.monthlyFee, effectiveFrom },
        }),
    };
}
