'use client';

import type { UseFormReturn } from 'react-hook-form';
import {
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { FormSection } from '@/components/ui/form-section';
import { PhonePicker } from '@/components/admin/phone-picker';
import { parseIntInput } from '@/lib/form-utils';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { CreateActivityFormData } from '@/lib/validations/activity';

type ActivityForm = UseFormReturn<CreateActivityFormData>;

type TextFieldName =
    | 'slug'
    | 'defaultLocation'
    | 'bankName'
    | 'bankAccountNumber'
    | 'bankAccountHolder';

type IntFieldName = 'monthlyFee' | 'sessionFee' | 'minMembers' | 'maxPlayers';

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

function TextField({
    form,
    name,
    label,
    placeholder,
    hint,
}: Readonly<{
    form: ActivityForm;
    name: TextFieldName;
    label: string;
    placeholder?: string;
    hint?: string;
}>) {
    return (
        <FormField
            control={form.control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                        <Input placeholder={placeholder} {...field} />
                    </FormControl>
                    {hint && <FormDescription>{hint}</FormDescription>}
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}

function IntField({
    form,
    name,
    label,
    min,
    hint,
}: Readonly<{
    form: ActivityForm;
    name: IntFieldName;
    label: string;
    min: number;
    hint?: string;
}>) {
    return (
        <FormField
            control={form.control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                        <Input
                            type='number'
                            min={min}
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(parseIntInput(e))}
                        />
                    </FormControl>
                    {hint && <FormDescription>{hint}</FormDescription>}
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}

/** Name, slug, badge color, and description. */
export function BasicInfoSection({
    form,
    t,
    isEdit,
}: Readonly<{ form: ActivityForm; t: Dictionary; isEdit: boolean }>) {
    return (
        <FormSection title={t.admin.sectionBasicInfo}>
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
            <TextField
                form={form}
                name='slug'
                label={t.admin.activitySlug}
                placeholder={t.admin.activitySlugPlaceholder}
                hint={t.admin.activitySlugHint}
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
            <FormField
                control={form.control}
                name='description'
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{t.admin.activityDescription}</FormLabel>
                        <FormControl>
                            <Textarea rows={2} {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </FormSection>
    );
}

function ModeCheckbox({
    form,
    name,
    label,
}: Readonly<{
    form: ActivityForm;
    name: 'allowsMonthly' | 'allowsPerSession';
    label: string;
}>) {
    return (
        <FormField
            control={form.control}
            name={name}
            render={({ field }) => (
                <FormItem className='flex items-center gap-2 space-y-0'>
                    <FormControl>
                        <Checkbox
                            checked={!!field.value}
                            onCheckedChange={field.onChange}
                        />
                    </FormControl>
                    <FormLabel className='text-sm font-normal'>
                        {label}
                    </FormLabel>
                </FormItem>
            )}
        />
    );
}

/** Fees, offered payment modes, cost-sharing minimum, and bank account. */
export function PaymentSection({
    form,
    t,
    modesError,
}: Readonly<{ form: ActivityForm; t: Dictionary; modesError?: string }>) {
    return (
        <FormSection title={t.admin.sectionPayment}>
            <div className='grid grid-cols-2 gap-4'>
                <IntField
                    form={form}
                    name='monthlyFee'
                    label={t.admin.activityFee}
                    min={0}
                />
                <IntField
                    form={form}
                    name='sessionFee'
                    label={t.admin.activitySessionFee}
                    min={0}
                />
            </div>
            <FormItem>
                <div className='text-sm font-medium leading-none'>
                    {t.admin.activityPaymentModes}
                </div>
                <div className='flex gap-6 pt-1'>
                    <ModeCheckbox
                        form={form}
                        name='allowsMonthly'
                        label={t.admin.activityModeMonthly}
                    />
                    <ModeCheckbox
                        form={form}
                        name='allowsPerSession'
                        label={t.admin.activityModePerSession}
                    />
                </div>
                {modesError && (
                    <p className='text-sm font-medium text-destructive'>
                        {modesError}
                    </p>
                )}
            </FormItem>
            <IntField
                form={form}
                name='minMembers'
                label={t.admin.activityMinMembers}
                min={0}
                hint={t.admin.activityMinMembersHint}
            />
            <div className='space-y-4 border-t border-border pt-4'>
                <p className='text-xs text-muted-foreground'>
                    {t.admin.activityBankHint}
                </p>
                <div className='grid grid-cols-2 gap-4'>
                    <TextField
                        form={form}
                        name='bankName'
                        label={t.admin.activityBankName}
                        placeholder={t.admin.activityBankNamePlaceholder}
                    />
                    <TextField
                        form={form}
                        name='bankAccountNumber'
                        label={t.admin.activityBankNumber}
                    />
                </div>
                <TextField
                    form={form}
                    name='bankAccountHolder'
                    label={t.admin.activityBankHolder}
                />
            </div>
        </FormSection>
    );
}

function RecurringTimeFields({
    form,
    t,
}: Readonly<{ form: ActivityForm; t: Dictionary }>) {
    return (
        <div className='grid grid-cols-2 gap-4'>
            {(['recurringStartTime', 'recurringEndTime'] as const).map(
                (name) => (
                    <FormField
                        key={name}
                        control={form.control}
                        name={name}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    {name === 'recurringStartTime'
                                        ? t.admin.formStartTime
                                        : t.admin.formEndTime}
                                </FormLabel>
                                <FormControl>
                                    <Input type='time' {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                ),
            )}
        </div>
    );
}

/** Weekly auto-schedule plus the defaults new sessions inherit. */
export function ScheduleSection({
    form,
    t,
}: Readonly<{ form: ActivityForm; t: Dictionary }>) {
    return (
        <FormSection title={t.admin.sectionSchedule}>
            {form.watch('allowsMonthly') && (
                <>
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
                                                : Number.parseInt(v, 10),
                                        )
                                    }>
                                    <FormControl>
                                        <SelectTrigger className='w-full'>
                                            <SelectValue />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value={RECURRING_OFF}>
                                            {t.admin.activityRecurringOff}
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
                        <RecurringTimeFields form={form} t={t} />
                    )}
                </>
            )}
            <div className='grid grid-cols-2 gap-4'>
                <IntField
                    form={form}
                    name='maxPlayers'
                    label={t.admin.activityMaxPlayers}
                    min={2}
                />
                <TextField
                    form={form}
                    name='defaultLocation'
                    label={t.admin.activityLocation}
                />
            </div>
        </FormSection>
    );
}

/** Admin WhatsApp number members are pointed to for help/refunds. */
export function ContactSection({
    form,
    t,
}: Readonly<{ form: ActivityForm; t: Dictionary }>) {
    return (
        <FormSection title={t.admin.sectionContact}>
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
        </FormSection>
    );
}
