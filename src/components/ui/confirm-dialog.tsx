'use client';

import { useState, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type ConfirmDialogProps = Readonly<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: ReactNode;
    description: ReactNode;
    confirmLabel: ReactNode;
    cancelLabel: ReactNode;
    /** Destructive (red) by default; pass 'primary' for high-impact non-destructive. */
    tone?: 'destructive' | 'primary';
    icon?: LucideIcon;
    /** Renders a required reason textarea; the value is passed to onConfirm. */
    reasonLabel?: ReactNode;
    reasonPlaceholder?: string;
    /** Word the user must type before confirm enables (e.g. "remove"). */
    typeToConfirm?: string;
    /** Prompt shown above the type-to-confirm input; falls back to the word. */
    typeToConfirmLabel?: ReactNode;
    onConfirm: (reason: string) => void | Promise<void>;
}>;

/**
 * Club Premium confirmation dialog — every destructive or high-impact action
 * asks first. Supports a required reason (reject payment) and type-to-confirm
 * (remove member). Copy is passed in so i18n stays with the caller.
 */
export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel,
    cancelLabel,
    tone = 'destructive',
    icon: Icon = AlertTriangle,
    reasonLabel,
    reasonPlaceholder,
    typeToConfirm,
    typeToConfirmLabel,
    onConfirm,
}: ConfirmDialogProps) {
    const [reason, setReason] = useState('');
    const [typed, setTyped] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const needsReason = reasonLabel !== undefined && reason.trim() === '';
    const needsTyped =
        typeToConfirm !== undefined &&
        typed.trim().toLowerCase() !== typeToConfirm.toLowerCase();
    const isBlocked = needsReason || needsTyped || isSubmitting;

    const reset = (next: boolean) => {
        if (!next) {
            setReason('');
            setTyped('');
        }
        onOpenChange(next);
    };

    const handleConfirm = async () => {
        setIsSubmitting(true);
        try {
            await onConfirm(reason.trim());
            reset(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={reset}>
            <DialogContent showCloseButton={false} className='sm:max-w-md'>
                <DialogHeader className='flex-row items-start gap-3.5 text-left'>
                    <span
                        aria-hidden
                        className={
                            tone === 'destructive'
                                ? 'flex size-9 shrink-0 items-center justify-center rounded-xl bg-destructive-soft'
                                : 'flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft'
                        }>
                        <Icon
                            className={
                                tone === 'destructive'
                                    ? 'size-[18px] text-destructive'
                                    : 'size-[18px] text-primary'
                            }
                        />
                    </span>
                    <div className='space-y-1.5'>
                        <DialogTitle className='font-bold'>
                            {title}
                        </DialogTitle>
                        <DialogDescription className='leading-relaxed'>
                            {description}
                        </DialogDescription>
                    </div>
                </DialogHeader>
                {reasonLabel !== undefined && (
                    <div className='space-y-1.5'>
                        <Label htmlFor='confirm-reason' className='text-xs'>
                            {reasonLabel} <span className='text-destructive'>*</span>
                        </Label>
                        <Textarea
                            id='confirm-reason'
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder={reasonPlaceholder}
                            rows={2}
                        />
                    </div>
                )}
                {typeToConfirm !== undefined && (
                    <div className='space-y-1.5'>
                        <Label
                            htmlFor='confirm-typed'
                            className='text-xs font-normal text-muted-foreground'>
                            {typeToConfirmLabel ?? (
                                <b className='text-secondary-foreground'>
                                    {typeToConfirm}
                                </b>
                            )}
                        </Label>
                        <Input
                            id='confirm-typed'
                            value={typed}
                            onChange={(e) => setTyped(e.target.value)}
                            placeholder={typeToConfirm}
                            autoComplete='off'
                        />
                    </div>
                )}
                <DialogFooter className='gap-2.5'>
                    <Button
                        variant='outline'
                        onClick={() => reset(false)}
                        disabled={isSubmitting}>
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={tone === 'destructive' ? 'destructive' : 'default'}
                        onClick={handleConfirm}
                        loading={isSubmitting}
                        disabled={isBlocked}>
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
