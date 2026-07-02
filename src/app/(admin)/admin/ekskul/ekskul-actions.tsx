'use client';

import { useState } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import {
    buildCreateEkskulSchema,
    type CreateEkskulFormData,
} from '@/lib/validations/ekskul';
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
import { toast } from 'sonner';
import { Plus, Pencil } from 'lucide-react';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary } from '@/lib/i18n/dictionaries';

export interface EkskulRow {
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

function EkskulFormDialog({
    ekskul,
    open,
    onOpenChange,
}: Readonly<{
    ekskul?: EkskulRow;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}>) {
    const router = useRouter();
    const { locale } = useLocale();
    const t = getDictionary(locale);
    const [loading, setLoading] = useState(false);
    const isEdit = !!ekskul;

    const form = useForm<CreateEkskulFormData>({
        resolver: zodResolver(buildCreateEkskulSchema(t)),
        defaultValues: {
            name: ekskul?.name ?? '',
            slug: ekskul?.slug ?? '',
            color: ekskul?.color ?? '#16a34a',
            description: ekskul?.description ?? '',
            // Empty (undefined) on create so the admin must enter a fee
            // explicitly — a blank submit is rejected, never a silent 0.
            monthlyFee: ekskul?.monthlyFee,
            sessionFee: ekskul?.sessionFee,
            allowsMonthly: ekskul?.allowsMonthly ?? true,
            allowsPerSession: ekskul?.allowsPerSession ?? false,
            minMembers: ekskul?.minMembers ?? 0,
            recurringDay: ekskul?.recurringDay ?? null,
            recurringStartTime: ekskul?.recurringStartTime ?? '08:00',
            recurringEndTime: ekskul?.recurringEndTime ?? '10:00',
            defaultLocation: ekskul?.defaultLocation ?? '',
            maxPlayers: ekskul?.maxPlayers ?? 20,
            adminWhatsapp: ekskul?.adminWhatsapp ?? '',
        },
    });

    // The ≥1-payment-mode refine attaches its error to a synthetic
    // `paymentModes` path (not a real form field) so it never misattributes
    // to whichever mode checkbox happens to be named in the path.
    const paymentModesError = (
        form.formState.errors as FieldErrors<CreateEkskulFormData> & {
            paymentModes?: { message?: string };
        }
    ).paymentModes;

    async function onSubmit(data: CreateEkskulFormData) {
        setLoading(true);
        try {
            const res = await fetch(
                isEdit ? `/api/ekskul/${ekskul.id}` : '/api/ekskul',
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
                            ? t.admin.ekskulUpdateFailed
                            : t.admin.ekskulCreateFailed),
                );
            }
            toast.success(isEdit ? t.admin.ekskulUpdated : t.admin.ekskulCreated);
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
                        {isEdit ? t.admin.editEkskul : t.admin.newEkskul}
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
                                    <FormLabel>{t.admin.ekskulName}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t.admin.ekskulNamePlaceholder}
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
                                    <FormLabel>{t.admin.ekskulSlug}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t.admin.ekskulSlugPlaceholder} {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        {t.admin.ekskulSlugHint}
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
                                    <FormLabel>{t.admin.ekskulColor}</FormLabel>
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
                                        <FormLabel>{t.admin.ekskulFee}</FormLabel>
                                        <FormControl>
                                            <Input
                                                type='number'
                                                min={0}
                                                {...field}
                                                value={field.value ?? ''}
                                                onChange={(e) =>
                                                    field.onChange(
                                                        e.target.value === ''
                                                            ? undefined
                                                            : Number.parseInt(
                                                                  e.target.value,
                                                                  10,
                                                              ),
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
                                            {t.admin.ekskulSessionFee}
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type='number'
                                                min={0}
                                                {...field}
                                                value={field.value ?? ''}
                                                onChange={(e) =>
                                                    field.onChange(
                                                        e.target.value === ''
                                                            ? undefined
                                                            : Number.parseInt(
                                                                  e.target.value,
                                                                  10,
                                                              ),
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
                                {t.admin.ekskulPaymentModes}
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
                                                {t.admin.ekskulModeMonthly}
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
                                                {t.admin.ekskulModePerSession}
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
                                        {t.admin.ekskulMinMembers}
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type='number'
                                            min={0}
                                            {...field}
                                            value={field.value ?? ''}
                                            onChange={(e) => {
                                                const parsed = Number.parseInt(
                                                    e.target.value,
                                                    10,
                                                );
                                                field.onChange(
                                                    Number.isNaN(parsed)
                                                        ? 0
                                                        : parsed,
                                                );
                                            }}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        {t.admin.ekskulMinMembersHint}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {form.watch('allowsMonthly') && (
                            <div className='space-y-3 rounded-lg border border-border p-3'>
                                <div className='text-sm font-medium leading-none'>
                                    {t.admin.ekskulRecurringTitle}
                                </div>
                                <p className='text-xs text-muted-foreground'>
                                    {t.admin.ekskulRecurringHint}
                                </p>
                                <FormField
                                    control={form.control}
                                    name='recurringDay'
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                {t.admin.ekskulRecurringDay}
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
                                                                .ekskulRecurringOff
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
                                        {t.admin.ekskulMaxPlayers}
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type='number'
                                            min={2}
                                            {...field}
                                            value={field.value ?? ''}
                                            onChange={(e) => {
                                                const parsed = Number.parseInt(
                                                    e.target.value,
                                                    10,
                                                );
                                                field.onChange(
                                                    Number.isNaN(parsed)
                                                        ? undefined
                                                        : parsed,
                                                );
                                            }}
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
                                    <FormLabel>{t.admin.ekskulLocation}</FormLabel>
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
                                    <FormLabel>{t.admin.ekskulWhatsapp}</FormLabel>
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
                                        {t.admin.ekskulDescription}
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
                                ? t.admin.updateEkskulBtn
                                : t.admin.createEkskulBtn}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export function NewEkskulButton() {
    const { locale } = useLocale();
    const t = getDictionary(locale);
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button className='gap-2' onClick={() => setOpen(true)}>
                <Plus className='w-4 h-4' />
                {t.admin.newEkskul}
            </Button>
            {open && <EkskulFormDialog open={open} onOpenChange={setOpen} />}
        </>
    );
}

export function EkskulActions({ ekskul }: Readonly<{ ekskul: EkskulRow }>) {
    const router = useRouter();
    const { locale } = useLocale();
    const t = getDictionary(locale);
    const [editOpen, setEditOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    async function toggleActive() {
        const confirmMsg = ekskul.isActive
            ? t.admin.confirmDeactivateEkskul
            : t.admin.confirmActivateEkskul;
        if (!confirm(confirmMsg)) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/ekskul/${ekskul.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !ekskul.isActive }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? t.admin.ekskulUpdateFailed);
            }
            toast.success(
                ekskul.isActive ? t.admin.ekskulDeleted : t.admin.ekskulUpdated,
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
                {ekskul.isActive ? t.admin.deactivate : t.admin.activate}
            </Button>
            {editOpen && (
                <EkskulFormDialog
                    ekskul={ekskul}
                    open={editOpen}
                    onOpenChange={setEditOpen}
                />
            )}
        </div>
    );
}
