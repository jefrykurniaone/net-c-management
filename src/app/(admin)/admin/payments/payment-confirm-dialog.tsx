'use client';

import { useId } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { PaymentFactList, type PaymentFacts } from './payment-facts';

/**
 * Confirming a Payment. It restates the row, and where the amount is short of
 * the Activity's current Dues or the Session's current Fee it says so in plain
 * words and then lets the Admin Confirm anyway: **it warns; it never blocks**
 * (ADR 0010 carries the ledger argument). The shortfall sentence is a disclosure
 * the Confirm label defers to, so it renders at **Body** in Secondary Ink and
 * the button points at it with `aria-describedby` (DESIGN.md, Actions).
 */

type ConfirmPaymentDialogProps = Readonly<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    t: Dictionary;
    facts: PaymentFacts;
    /** Set only when the amount is below the current price for this mode. */
    shortfallNote: string | null;
    isSubmitting: boolean;
    onConfirm: () => void;
}>;

/** Cancel, then Confirm — the Confirm tied to the disclosure when there is one. */
function ConfirmFooter({
    t,
    describedBy,
    isSubmitting,
    onCancel,
    onConfirm,
}: Readonly<{
    t: Dictionary;
    describedBy: string | undefined;
    isSubmitting: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}>) {
    return (
        <DialogFooter className='gap-2.5'>
            <Button variant='outline' onClick={onCancel} disabled={isSubmitting}>
                {t.common.cancel}
            </Button>
            <Button
                onClick={onConfirm}
                loading={isSubmitting}
                aria-describedby={describedBy}>
                {t.admin.confirmBtn}
            </Button>
        </DialogFooter>
    );
}

export function ConfirmPaymentDialog({
    open,
    onOpenChange,
    t,
    facts,
    shortfallNote,
    isSubmitting,
    onConfirm,
}: ConfirmPaymentDialogProps) {
    const noteId = useId();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={false} className='sm:max-w-md'>
                <DialogHeader>
                    <DialogTitle>{t.admin.confirmPaymentTitle}</DialogTitle>
                    <DialogDescription>
                        {t.admin.confirmPaymentDesc}
                    </DialogDescription>
                </DialogHeader>
                <PaymentFactList facts={facts} t={t} />
                {shortfallNote !== null && (
                    <p
                        id={noteId}
                        className='type-body text-secondary-foreground'>
                        {shortfallNote}
                    </p>
                )}
                <ConfirmFooter
                    t={t}
                    describedBy={shortfallNote === null ? undefined : noteId}
                    isSubmitting={isSubmitting}
                    onCancel={() => onOpenChange(false)}
                    onConfirm={onConfirm}
                />
            </DialogContent>
        </Dialog>
    );
}
