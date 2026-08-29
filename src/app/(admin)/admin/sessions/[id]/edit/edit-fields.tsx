'use client';

import type { ControllerRenderProps, UseFormReturn } from 'react-hook-form';
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { parseIntInput } from '@/lib/form-utils';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { UpdateSessionFormData } from '@/lib/validations/session';

/**
 * One field of the Session edit form, and how a locked one is drawn.
 *
 * A locked field is **read-only**, never disabled: its value still posts, it is
 * still focusable and copyable, and a screen reader announces it as read-only
 * rather than skipping it. It takes the design system's read-only treatment —
 * Enamel Ground fill, `bg-board`, so it visibly is not the Admin's to edit
 * (DESIGN.md, Inputs / Fields) — applied here rather than to the shared input,
 * which is not this ticket's to restyle.
 *
 * Every lock carries a sentence at **Body** size tied to the control with
 * `aria-describedby`. A condition disclosed in the fine print is not disclosed,
 * and the courtesy is only ever a courtesy: `PATCH /api/sessions/[id]` refuses
 * the write whatever this form offered.
 */

/** Enamel Ground fill: the read-only treatment, on the field itself. */
const READ_ONLY_CLASS = 'bg-board';

/** Zod's own floors: a Session seats at least two, and a free one costs zero. */
export const MIN_CAPACITY = 2;
export const MIN_FEE = 0;

export const CLOSED_NOTE_ID = 'session-closed-note';
export const FEE_NOTE_ID = 'session-fee-note';
export const CAPACITY_NOTE_ID = 'session-capacity-note';

const SELECT_CLASS =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring';

export type SessionEditForm = UseFormReturn<UpdateSessionFormData>;

/** What the stored row makes read-only, and how much of it. */
export type SessionEditLocks = Readonly<{
    isClosed: boolean;
    isMoneyBehind: boolean;
    heldSeats: number;
}>;

/** One field's share of that: whether it is locked, and which sentence says why. */
export type FieldLock = Readonly<{ isLocked: boolean; describedBy?: string }>;

/** Everything but notes goes read-only once the Session is Closed. */
export function closedLock(locks: SessionEditLocks): FieldLock {
    return locks.isClosed
        ? { isLocked: true, describedBy: CLOSED_NOTE_ID }
        : { isLocked: false };
}

/**
 * The fee is frozen by money behind the Session *and* by a Closed one. The money
 * sentence is the more specific of the two, so it is the one the field points at
 * when both apply.
 */
export function feeLock(locks: SessionEditLocks): FieldLock {
    if (locks.isMoneyBehind) {
        return { isLocked: true, describedBy: FEE_NOTE_ID };
    }
    return closedLock(locks);
}

/** The sentence a locked field points at. Body size, never Caption. */
export function LockNote({
    id,
    children,
}: Readonly<{ id: string; children: string }>) {
    return (
        <p id={id} className='type-body text-secondary-foreground'>
            {children}
        </p>
    );
}

/**
 * The five plain-text fields, which differ only in their label and input type.
 *
 * A locked one drops its `type`: `readOnly` does not close the native date and
 * time pickers in every browser, so a locked `type='date'` would still open a
 * calendar and let an Admin change a value the route is going to refuse. As
 * plain text the field shows the same stored face, still focusable, still
 * posting, and visibly not theirs to edit.
 */
export function TextField({
    form,
    name,
    label,
    lock,
    type,
}: Readonly<{
    form: SessionEditForm;
    name: 'title' | 'date' | 'startTime' | 'endTime' | 'location';
    label: string;
    lock: FieldLock;
    type?: string;
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
                            type={lock.isLocked ? undefined : type}
                            {...field}
                            value={field.value ?? ''}
                            readOnly={lock.isLocked}
                            aria-describedby={lock.describedBy}
                            className={
                                lock.isLocked ? READ_ONLY_CLASS : undefined
                            }
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}

/**
 * Where a Session is in its life. Closed, it is drawn as its own label in the
 * read-only treatment rather than as a disabled `<select>`: the value still
 * posts from the form's own state, unchanged, so this form never asks for a
 * standing the route would refuse.
 *
 * A Cancelled Session *can* be reopened, but not from here — that move lives on
 * the register, as one control with one question, beside the Cancel it undoes.
 * Two places to change a Session's standing is how they come to disagree.
 */
type StatusControlProps = Readonly<{
    field: ControllerRenderProps<UpdateSessionFormData, 'status'>;
    t: Dictionary;
    lock: FieldLock;
}>;

/** Locked, the status is its own label; open, it is the four-way choice. */
function StatusControl({ field, t, lock }: StatusControlProps) {
    if (lock.isLocked) {
        return (
            <Input
                readOnly
                value={field.value ? t.sessionStatus[field.value] : ''}
                aria-describedby={lock.describedBy}
                className={READ_ONLY_CLASS}
            />
        );
    }
    return (
        <select {...field} className={SELECT_CLASS}>
            {Object.entries(t.sessionStatus).map(([value, label]) => (
                <option key={value} value={value}>
                    {label}
                </option>
            ))}
        </select>
    );
}

export function StatusField({
    form,
    t,
    lock,
}: Readonly<{ form: SessionEditForm; t: Dictionary; lock: FieldLock }>) {
    return (
        <FormField
            control={form.control}
            name='status'
            render={({ field }) => (
                <FormItem>
                    <FormLabel>{t.admin.colStatus}</FormLabel>
                    <FormControl>
                        <StatusControl field={field} t={t} lock={lock} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}

/** Capacity and fee, the two figures the locking rules are actually about. */
export function NumberField({
    form,
    name,
    label,
    lock,
    min,
}: Readonly<{
    form: SessionEditForm;
    name: 'maxPlayers' | 'fee';
    label: string;
    lock: FieldLock;
    min: number;
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
                            readOnly={lock.isLocked}
                            aria-describedby={lock.describedBy}
                            className={
                                lock.isLocked ? READ_ONLY_CLASS : undefined
                            }
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}

/** Which Activity a Session belongs to has never been editable after posting. */
export function ActivityField({
    activityName,
    t,
}: Readonly<{ activityName: string; t: Dictionary }>) {
    return (
        <FormItem>
            <FormLabel>{t.activity.label}</FormLabel>
            <div className='flex items-center gap-2 rounded-md border border-input bg-board px-3 py-2 text-sm'>
                <span className='font-medium text-foreground'>
                    {activityName}
                </span>
            </div>
            <p className='type-body text-secondary-foreground'>
                {t.admin.activityLocked}
            </p>
        </FormItem>
    );
}
