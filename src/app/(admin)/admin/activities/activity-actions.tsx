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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { PhonePicker } from '@/components/admin/phone-picker';
import { parseIntInput } from '@/lib/form-utils';
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
    isActive: boolean;
}

/** Sentinel for the "no weekly auto-schedule" select option. */
const RECURRING_OFF = 'off';
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

function slugify(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
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
            <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-md'>
                <DialogHeader>
                    <DialogTitle>
                        {isEdit ? t.admin.editActivity : t.admin.newActivity}
                    </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className='space-y-4'>
                        <FormField
                            control={form.control}
                            name='name'
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t.admin.activityName}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t.admin.activityNamePlaceholder}
                                            {...field}
                                            onChange={(e) => {
                                                field.onChange(e);
                                                if (!isEdit) {
                                                    form.setValue(
                                                        'slug',
                                                        slugify(e.target.value),
                                                        { shouldValidate: true },
                                                    );
                                                }
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name='slug'
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t.admin.activitySlug}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t.admin.activitySlugPlaceholder} {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        {t.admin.activitySlugHint}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name='color'
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t.admin.activityColor}</FormLabel>
                                    <div className='flex items-center gap-2'>
                                        <FormControl>
                                            <Input
                                                type='color'
                                                className='h-9 w-14 p-1'
                                                {...field}
                                            />
                                        </FormControl>
                                        <Input
                                            value={field.value}
                                            onChange={field.onChange}
                                            placeholder='#16a34a'
                                            className='flex-1'
                                        />
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className='grid grid-cols-2 gap-4'>
                            <FormField
                                control={form.control}
                                name='monthlyFee'
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t.admin.activityFee}</FormLabel>
                                        <FormControl>
                                            <Input
                                                type='number'
                                                min={0}
                                                {...field}
                                                value={field.value ?? ''}
                                                onChange={(e) =>
                                                    field.onChange(
                                                        parseIntInput(e),
                                                    )
                                                }
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name='sessionFee'
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            {t.admin.activitySessionFee}
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type='number'
                                                min={0}
                                                {...field}
                                                value={field.value ?? ''}
                                                onChange={(e) =>
                                                    field.onChange(
                                                        parseIntInput(e),
                                                    )
                                                }
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormItem>
                            <div className='text-sm font-medium leading-none'>
                                {t.admin.activityPaymentModes}
                            </div>
                            <div className='flex gap-6 pt-1'>
                                <FormField
                                    control={form.control}
                                    name='allowsMonthly'
                                    render={({ field }) => (
                                        <FormItem className='flex items-center gap-2 space-y-0'>
                                            <FormControl>
                                                <Checkbox
                                                    checked={!!field.value}
                                                    onCheckedChange={
                                                        field.onChange
                                                    }
                                                />
                                            </FormControl>
                                            <FormLabel className='text-sm font-normal'>
                                                {t.admin.activityModeMonthly}
                                            </FormLabel>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name='allowsPerSession'
                                    render={({ field }) => (
                                        <FormItem className='flex items-center gap-2 space-y-0'>
                                            <FormControl>
                                                <Checkbox
                                                    checked={!!field.value}
                                                    onCheckedChange={
                                                        field.onChange
                                                    }
                                                />
                                            </FormControl>
                                            <FormLabel className='text-sm font-normal'>
                                                {t.admin.activityModePerSession}
                                            </FormLabel>
                                        </FormItem>
                                    )}
                                />
                            </div>
                            {paymentModesError && (
                                <p className='text-sm font-medium text-destructive'>
                                    {paymentModesError.message}
                                </p>
                            )}
                        </FormItem>
                        <FormField
                            control={form.control}
                            name='minMembers'
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        {t.admin.activityMinMembers}
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type='number'
                                            min={0}
                                            {...field}
                                            value={field.value ?? ''}
                                            onChange={(e) =>
                                                field.onChange(parseIntInput(e))
                                            }
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        {t.admin.activityMinMembersHint}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {form.watch('allowsMonthly') && (
                            <div className='space-y-3 rounded-lg border border-border p-3'>
                                <div className='text-sm font-medium leading-none'>
                                    {t.admin.activityRecurringTitle}
                                </div>
                                <p className='text-xs text-muted-foreground'>
                                    {t.admin.activityRecurringHint}
                                </p>
                                <FormField
                                    control={form.control}
                                    name='recurringDay'
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                {t.admin.activityRecurringDay}
                                            </FormLabel>
                                            <Select
                                                value={
                                                    field.value === null ||
                                                    field.value === undefined
                                                        ? RECURRING_OFF
                                                        : String(field.value)
                                                }
                                                onValueChange={(v) =>
                                                    field.onChange(
                                                        v === RECURRING_OFF
                                                            ? null
                                                            : Number.parseInt(
                                                                  v,
                                                                  10,
                                                              ),
                                                    )
                                                }>
                                                <FormControl>
                                                    <SelectTrigger className='w-full'>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem
                                                        value={RECURRING_OFF}>
                                                        {
                                                            t.admin
                                                                .activityRecurringOff
                                                        }
                                                    </SelectItem>
                                                    {WEEKDAYS.map((d) => (
                                                        <SelectItem
                                                            key={d}
                                                            value={String(d)}>
                                                            {t.days[d]}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {form.watch('recurringDay') !== null && (
                                    <div className='grid grid-cols-2 gap-4'>
                                        <FormField
                                            control={form.control}
                                            name='recurringStartTime'
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        {t.admin.formStartTime}
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type='time'
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name='recurringEndTime'
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        {t.admin.formEndTime}
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type='time'
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                        <FormField
                            control={form.control}
                            name='maxPlayers'
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        {t.admin.activityMaxPlayers}
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type='number'
                                            min={2}
                                            {...field}
                                            value={field.value ?? ''}
                                            onChange={(e) =>
                                                field.onChange(parseIntInput(e))
                                            }
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name='defaultLocation'
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t.admin.activityLocation}</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name='adminWhatsapp'
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t.admin.activityWhatsapp}</FormLabel>
                                    <FormControl>
                                        <Input placeholder='628...' {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        {t.admin.whatsappHint}
                                    </FormDescription>
                                    <PhonePicker
                                        onPick={(phone) =>
                                            form.setValue('adminWhatsapp', phone, {
                                                shouldValidate: true,
                                            })
                                        }
                                    />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name='description'
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        {t.admin.activityDescription}
                                    </FormLabel>
                                    <FormControl>
                                        <Textarea rows={2} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
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
    const [loading, setLoading] = useState(false);

    async function toggleActive() {
        const confirmMsg = activity.isActive
            ? t.admin.confirmDeactivateActivity
            : t.admin.confirmActivateActivity;
        if (!confirm(confirmMsg)) return;
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
                variant='outline'
                size='sm'
                className='h-7 text-xs'
                loading={loading}
                onClick={toggleActive}>
                {activity.isActive ? t.admin.deactivate : t.admin.activate}
            </Button>
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
