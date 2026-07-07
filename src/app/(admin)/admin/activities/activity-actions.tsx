'use client';

import { useState } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import {
    buildCreateActivitySchema,
    type CreateActivityFormData,
} from '@/lib/validations/activity';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import {
    BasicInfoSection,
    PaymentSection,
    ScheduleSection,
    ContactSection,
} from './activity-form-sections';
import { toast } from 'sonner';
import { Plus, Pencil } from 'lucide-react';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary } from '@/lib/i18n/dictionaries';

export interface ActivityRow {
    id: string;
    name: string;
    slug: string;
    color: string;
    description: string | null;
    monthlyFee: number;
    sessionFee: number;
    allowsMonthly: boolean;
    allowsPerSession: boolean;
    minMembers: number;
    recurringDay: number | null;
    recurringStartTime: string;
    recurringEndTime: string;
    defaultLocation: string;
    maxPlayers: number;
    adminWhatsapp: string;
    bankName: string;
    bankAccountNumber: string;
    bankAccountHolder: string;
    isActive: boolean;
}

function ActivityFormDialog({
    activity,
    open,
    onOpenChange,
}: Readonly<{
    activity?: ActivityRow;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}>) {
    const router = useRouter();
    const { locale } = useLocale();
    const t = getDictionary(locale);
    const [loading, setLoading] = useState(false);
    const isEdit = !!activity;

    const form = useForm<CreateActivityFormData>({
        resolver: zodResolver(buildCreateActivitySchema(t)),
        defaultValues: {
            name: activity?.name ?? '',
            slug: activity?.slug ?? '',
            color: activity?.color ?? '#16a34a',
            description: activity?.description ?? '',
            // Empty (undefined) on create so the admin must enter a fee
            // explicitly — a blank submit is rejected, never a silent 0.
            monthlyFee: activity?.monthlyFee,
            sessionFee: activity?.sessionFee,
            allowsMonthly: activity?.allowsMonthly ?? true,
            allowsPerSession: activity?.allowsPerSession ?? false,
            minMembers: activity?.minMembers ?? 0,
            recurringDay: activity?.recurringDay ?? null,
            recurringStartTime: activity?.recurringStartTime ?? '08:00',
            recurringEndTime: activity?.recurringEndTime ?? '10:00',
            defaultLocation: activity?.defaultLocation ?? '',
            maxPlayers: activity?.maxPlayers ?? 20,
            adminWhatsapp: activity?.adminWhatsapp ?? '',
            bankName: activity?.bankName ?? '',
            bankAccountNumber: activity?.bankAccountNumber ?? '',
            bankAccountHolder: activity?.bankAccountHolder ?? '',
        },
    });

    // The ≥1-payment-mode refine attaches its error to a synthetic
    // `paymentModes` path (not a real form field) so it never misattributes
    // to whichever mode checkbox happens to be named in the path.
    const paymentModesError = (
        form.formState.errors as FieldErrors<CreateActivityFormData> & {
            paymentModes?: { message?: string };
        }
    ).paymentModes;

    async function onSubmit(data: CreateActivityFormData) {
        setLoading(true);
        try {
            const res = await fetch(
                isEdit ? `/api/activities/${activity.id}` : '/api/activities',
                {
                    method: isEdit ? 'PATCH' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                },
            );
            if (!res.ok) {
                const err = await res.json();
                throw new Error(
                    err.error ??
                        (isEdit
                            ? t.admin.activityUpdateFailed
                            : t.admin.activityCreateFailed),
                );
            }
            toast.success(isEdit ? t.admin.activityUpdated : t.admin.activityCreated);
            onOpenChange(false);
            form.reset();
            router.refresh();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t.common.error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                aria-describedby={undefined}
                className='max-h-[90vh] overflow-y-auto sm:max-w-md'>
                <DialogHeader>
                    <DialogTitle>
                        {isEdit ? t.admin.editActivity : t.admin.newActivity}
                    </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className='space-y-5'>
                        <BasicInfoSection form={form} t={t} isEdit={isEdit} />
                        <PaymentSection
                            form={form}
                            t={t}
                            modesError={paymentModesError?.message}
                        />
                        <ScheduleSection form={form} t={t} />
                        <ContactSection form={form} t={t} />
                        <Button
                            type='submit'
                            className='w-full'
                            loading={loading}>
                            {isEdit
                                ? t.admin.updateActivityBtn
                                : t.admin.createActivityBtn}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export function NewActivityButton() {
    const { locale } = useLocale();
    const t = getDictionary(locale);
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button className='gap-2' onClick={() => setOpen(true)}>
                <Plus className='w-4 h-4' />
                {t.admin.newActivity}
            </Button>
            {open && <ActivityFormDialog open={open} onOpenChange={setOpen} />}
        </>
    );
}

export function ActivityActions({ activity }: Readonly<{ activity: ActivityRow }>) {
    const router = useRouter();
    const { locale } = useLocale();
    const t = getDictionary(locale);
    const [editOpen, setEditOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    async function toggleActive() {
        setLoading(true);
        try {
            const res = await fetch(`/api/activities/${activity.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !activity.isActive }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? t.admin.activityUpdateFailed);
            }
            toast.success(
                activity.isActive ? t.admin.activityDeleted : t.admin.activityUpdated,
            );
            router.refresh();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t.common.error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className='flex items-center justify-end gap-1'>
            <Button
                variant='outline'
                size='sm'
                className='h-7 text-xs gap-1'
                onClick={() => setEditOpen(true)}>
                <Pencil className='w-3 h-3' />
                {t.admin.edit}
            </Button>
            <Button
                variant={activity.isActive ? 'destructive-outline' : 'outline'}
                size='sm'
                className='h-7 text-xs'
                loading={loading}
                onClick={() => setConfirmOpen(true)}>
                {activity.isActive ? t.admin.deactivate : t.admin.activate}
            </Button>
            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                tone={activity.isActive ? 'destructive' : 'primary'}
                title={activity.isActive ? t.admin.deactivate : t.admin.activate}
                description={
                    activity.isActive
                        ? t.admin.confirmDeactivateActivity
                        : t.admin.confirmActivateActivity
                }
                confirmLabel={
                    activity.isActive ? t.admin.deactivate : t.admin.activate
                }
                cancelLabel={t.common.cancel}
                onConfirm={toggleActive}
            />
            {editOpen && (
                <ActivityFormDialog
                    activity={activity}
                    open={editOpen}
                    onOpenChange={setEditOpen}
                />
            )}
        </div>
    );
}
