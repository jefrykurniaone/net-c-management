'use client';

import { useId, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { PaymentFactList, type PaymentFacts } from './payment-facts';

/**
 * Rejecting a Payment. Two things must be said before the Admin commits. The
 * **reason** is stored as the Payment's notes and read by the member on their
 * payments history — the only thing telling them what to do next — so empty is
 * refused here with a message, and by the route. **Their Seats**: rejecting
 * monthly Dues releases every Seat they are Registered for across that
 * Activity's Sessions in that Billing Period, and Sessions they attended or
 * opted out of are untouched. Both are disclosures the Reject label defers to,
 * rendered at **Body** in Secondary Ink (ADR 0010; DESIGN.md, Actions).
 */

const REASON_ROWS = 3;

type RejectPaymentDialogProps = Readonly<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    t: Dictionary;
    facts: PaymentFacts;
    /** Set only for monthly Dues, which is the Payment that holds Seats. */
    seatNote: string | null;
    isSubmitting: boolean;
    onReject: (reason: string) => void;
}>;

/**
 * The reason the Admin types, whether it has been refused yet, and the two
 * exits from the dialog. Closing forgets a half-typed reason; submitting an
 * empty one shows the refusal instead of sending it.
 */
function useRejectField(
    onOpenChange: (open: boolean) => void,
    onReject: (reason: string) => void,
) {
    const [reason, setReason] = useState('');
    const [hasError, setHasError] = useState(false);
    return {
        reason,
        hasError,
        change(next: string) {
            setReason(next);
            setHasError(false);
        },
        close(next: boolean) {
            if (!next) {
                setReason('');
                setHasError(false);
            }
            onOpenChange(next);
        },
        submit() {
            const trimmed = reason.trim();
            if (trimmed === '') {
                setHasError(true);
                return;
            }
            onReject(trimmed);
        },
    };
}

type RejectField = ReturnType<typeof useRejectField>;

/** The three ids the dialog's own labelling and disclosures are wired with. */
type RejectIds = Readonly<{
    fieldId: string;
    errorId: string;
    seatId: string;
}>;

type ReasonFieldProps = Readonly<{
    t: Dictionary;
    fieldId: string;
    errorId: string;
    value: string;
    hasError: boolean;
    onChange: (value: string) => void;
}>;

/** The reason, required, with the refusal named where it can be read. */
function ReasonField({
    t,
    fieldId,
    errorId,
    value,
    hasError,
    onChange,
}: ReasonFieldProps) {
    return (
        <div className='space-y-hair'>
            <Label htmlFor={fieldId} className='type-label'>
                {t.payments.rejectReason}{' '}
                <span aria-hidden className='text-destructive'>
                    *
                </span>
            </Label>
            <Textarea
                id={fieldId}
                required
                rows={REASON_ROWS}
                value={value}
                aria-invalid={hasError || undefined}
                aria-describedby={hasError ? errorId : undefined}
                placeholder={t.payments.rejectReasonPrompt}
                onChange={(event) => onChange(event.target.value)}
            />
            {hasError && (
                <p
                    id={errorId}
                    role='alert'
                    className='type-caption text-destructive'>
                    {t.admin.rejectReasonMissing}
                </p>
            )}
        </div>
    );
}

/** Cancel, then Reject — the Reject tied to the Seat consequence when there is one. */
function RejectFooter({
    t,
    describedBy,
    isSubmitting,
    onCancel,
    onReject,
}: Readonly<{
    t: Dictionary;
    describedBy: string | undefined;
    isSubmitting: boolean;
    onCancel: () => void;
    onReject: () => void;
}>) {
    return (
        <DialogFooter className='gap-2.5'>
            <Button variant='outline' onClick={onCancel} disabled={isSubmitting}>
                {t.common.cancel}
            </Button>
            <Button
                variant='destructive'
                onClick={onReject}
                loading={isSubmitting}
                aria-describedby={describedBy}>
                {t.admin.rejectBtn}
            </Button>
        </DialogFooter>
    );
}

/** What the Admin reads before deciding: the row, the reason, the Seats. */
function RejectDialogBody({
    t,
    facts,
    ids,
    seatNote,
    field,
}: Readonly<{
    t: Dictionary;
    facts: PaymentFacts;
    ids: RejectIds;
    seatNote: string | null;
    field: RejectField;
}>) {
    return (
        <>
            <DialogHeader>
                <DialogTitle>{t.admin.rejectPaymentTitle}</DialogTitle>
                <DialogDescription>
                    {t.admin.rejectPaymentDesc}
                </DialogDescription>
            </DialogHeader>
            <PaymentFactList facts={facts} t={t} />
            <ReasonField
                t={t}
                fieldId={ids.fieldId}
                errorId={ids.errorId}
                value={field.reason}
                hasError={field.hasError}
                onChange={field.change}
            />
            {seatNote !== null && (
                <p
                    id={ids.seatId}
                    className='type-body text-secondary-foreground'>
                    {seatNote}
                </p>
            )}
        </>
    );
}

export function RejectPaymentDialog({
    open,
    onOpenChange,
    t,
    facts,
    seatNote,
    isSubmitting,
    onReject,
}: RejectPaymentDialogProps) {
    const fieldId = useId();
    const errorId = useId();
    const seatId = useId();
    const field = useRejectField(onOpenChange, onReject);

    return (
        <Dialog open={open} onOpenChange={field.close}>
            <DialogContent showCloseButton={false} className='sm:max-w-md'>
                <RejectDialogBody
                    t={t}
                    facts={facts}
                    ids={{ fieldId, errorId, seatId }}
                    seatNote={seatNote}
                    field={field}
                />
                <RejectFooter
                    t={t}
                    describedBy={seatNote === null ? undefined : seatId}
                    isSubmitting={isSubmitting}
                    onCancel={() => field.close(false)}
                    onReject={field.submit}
                />
            </DialogContent>
        </Dialog>
    );
}
