'use client';

import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { LockNote } from '@/components/ui/lock-note';
import { Textarea } from '@/components/ui/textarea';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import {
    ActivityField,
    CAPACITY_NOTE_ID,
    closedLock,
    FEE_NOTE_ID,
    feeLock,
    MIN_CAPACITY,
    MIN_FEE,
    NumberField,
    StatusField,
    TextField,
    type FieldLock,
    type SessionEditForm,
    type SessionEditLocks,
} from './edit-fields';

/**
 * The form's four groups, and which lock each one is under. Notes are in no
 * group's lock: they are the one thing a Completed or Cancelled Session still
 * accepts, because what happened is exactly what an Admin writes down afterwards.
 */

export function BasicFields({
    form,
    t,
    locks,
    activityName,
}: Readonly<{
    form: SessionEditForm;
    t: Dictionary;
    locks: SessionEditLocks;
    activityName: string;
}>) {
    const lock = closedLock(locks);
    return (
        <>
            <ActivityField activityName={activityName} t={t} />
            <TextField
                form={form}
                name='title'
                label={t.admin.formTitle}
                lock={lock}
            />
            <StatusField form={form} t={t} lock={lock} />
        </>
    );
}

/** The slot, as two faces of one fact: zod refuses an end before its start. */
function TimeFields({
    form,
    t,
    lock,
}: Readonly<{
    form: SessionEditForm;
    t: Dictionary;
    lock: FieldLock;
}>) {
    return (
        <div className='grid grid-cols-2 gap-4'>
            <TextField
                form={form}
                name='startTime'
                type='time'
                label={t.admin.formStartTime}
                lock={lock}
            />
            <TextField
                form={form}
                name='endTime'
                type='time'
                label={t.admin.formEndTime}
                lock={lock}
            />
        </div>
    );
}

export function ScheduleFields({
    form,
    t,
    locks,
}: Readonly<{
    form: SessionEditForm;
    t: Dictionary;
    locks: SessionEditLocks;
}>) {
    const lock = closedLock(locks);
    return (
        <>
            <TextField
                form={form}
                name='date'
                type='date'
                label={t.admin.formDate}
                lock={lock}
            />
            <TimeFields form={form} t={t} lock={lock} />
            <TextField
                form={form}
                name='location'
                label={t.admin.formLocation}
                lock={lock}
            />
        </>
    );
}

/**
 * Capacity carries the Seats already held as its `min` and says so; the fee
 * carries the reason it is frozen. Capacity is **floored, not locked** while the
 * Session is open — an Admin may still raise it, and only a figure below the
 * Seats already held is refused.
 */
/** Whether capacity is floored at the held Seats rather than locked outright. */
function isCapacityFloored(locks: SessionEditLocks): boolean {
    return locks.isMoneyBehind && !locks.isClosed;
}

function CapacityInput({
    form,
    t,
    locks,
}: Readonly<{
    form: SessionEditForm;
    t: Dictionary;
    locks: SessionEditLocks;
}>) {
    const isFloored = isCapacityFloored(locks);
    return (
        <NumberField
            form={form}
            name='maxPlayers'
            label={t.admin.formMaxPlayers}
            lock={
                isFloored
                    ? { isLocked: false, describedBy: CAPACITY_NOTE_ID }
                    : closedLock(locks)
            }
            min={
                isFloored
                    ? Math.max(MIN_CAPACITY, locks.heldSeats)
                    : MIN_CAPACITY
            }
        />
    );
}

export function CapacityFields({
    form,
    t,
    locks,
}: Readonly<{
    form: SessionEditForm;
    t: Dictionary;
    locks: SessionEditLocks;
}>) {
    return (
        <div className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
                <CapacityInput form={form} t={t} locks={locks} />
                <NumberField
                    form={form}
                    name='fee'
                    label={t.admin.formFee}
                    lock={feeLock(locks)}
                    min={MIN_FEE}
                />
            </div>
            {isCapacityFloored(locks) && (
                <LockNote id={CAPACITY_NOTE_ID}>
                    {t.admin.capacityHeldFloor.replace(
                        '{n}',
                        String(locks.heldSeats),
                    )}
                </LockNote>
            )}
            {locks.isMoneyBehind && (
                <LockNote id={FEE_NOTE_ID}>{t.admin.feeLocked}</LockNote>
            )}
        </div>
    );
}

export function NotesField({
    form,
    t,
}: Readonly<{ form: SessionEditForm; t: Dictionary }>) {
    return (
        <FormField
            control={form.control}
            name='notes'
            render={({ field }) => (
                <FormItem>
                    <FormLabel>{t.admin.formNotes}</FormLabel>
                    <FormControl>
                        <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}
