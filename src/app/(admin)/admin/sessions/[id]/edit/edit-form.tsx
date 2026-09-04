'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { SessionStatus } from '@prisma/client';
import { useLocale } from '@/components/providers/locale-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Form } from '@/components/ui/form';
import { FormSection } from '@/components/ui/form-section';
import { LockNote } from '@/components/ui/lock-note';
import { getDictionary, type Dictionary } from '@/lib/i18n/dictionaries';
import { isMoneyBehind, type SessionLockFacts } from '@/lib/session-lock';
import {
    buildUpdateSessionSchema,
    type UpdateSessionFormData,
} from '@/lib/validations/session';
import {
    CLOSED_NOTE_ID,
    type SessionEditForm,
    type SessionEditLocks,
} from './edit-fields';
import {
    BasicFields,
    CapacityFields,
    NotesField,
    ScheduleFields,
} from './edit-sections';
import { EditSideCards } from './edit-side-cards';
import { useSessionEditActions } from './use-session-edit-actions';

/**
 * This form is about the Session's own facts — title, time, venue, capacity,
 * fee, notes; recording who turned up lives on its own surface (ADR 0012). The
 * two locks are **reflected and never enforced here**: a Session with a Payment
 * or a held Seat has a read-only fee and a capacity floored at the Seats held,
 * and a Completed or Cancelled one is read-only but for its notes. Delete is
 * **absent**, not disabled, where the route would refuse it (ADR 0010). Every
 * fact behind all three is resolved server-side by the same helper the route
 * decides with (ADR 0011).
 */

/** The Session as this form reads it — no Attendance rows, only the counts. */
export type SessionEditView = Readonly<{
    id: string;
    title: string;
    date: Date;
    startTime: string;
    endTime: string;
    location: string;
    maxPlayers: number;
    fee: number;
    notes: string | null;
    status: SessionStatus;
    activityName: string;
    lastReminderAt: Date | null;
}>;

/** `yyyy-MM-dd` is the first ten characters of an ISO instant. */
const DATE_FACE_LENGTH = 'yyyy-MM-dd'.length;

/**
 * The `yyyy-MM-dd` face the date input carries, read in **UTC**.
 *
 * A Session is stored at UTC midnight of its WIB calendar day, and the route
 * compares the posted face against that instant. Formatting it in the browser's
 * own zone instead would hand a browser west of UTC the previous day, and a
 * notes-only save on a Closed Session would then post a date that differs from
 * the stored one and be refused for an edit nobody made.
 */
function dateFaceOf(date: Date): string {
    return new Date(date).toISOString().slice(0, DATE_FACE_LENGTH);
}

function useSessionForm(
    session: SessionEditView,
    t: Dictionary,
): SessionEditForm {
    return useForm<UpdateSessionFormData>({
        resolver: zodResolver(buildUpdateSessionSchema(t)),
        defaultValues: {
            title: session.title,
            date: dateFaceOf(session.date),
            startTime: session.startTime,
            endTime: session.endTime,
            location: session.location,
            maxPlayers: session.maxPlayers,
            fee: session.fee,
            notes: session.notes ?? '',
            status: session.status,
        },
    });
}

function BackLink({ t }: Readonly<{ t: Dictionary }>) {
    return (
        <Link
            href='/admin/sessions'
            className='inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground'>
            <ArrowLeft className='w-4 h-4' />
            {t.admin.backToSessions}
        </Link>
    );
}

/** Save, and — where the route would allow it — the delete that asks first. */
function SubmitRow({
    loading,
    canDelete,
    onDelete,
    t,
}: Readonly<{
    loading: boolean;
    canDelete: boolean;
    onDelete: () => void;
    t: Dictionary;
}>) {
    const [isAsking, setIsAsking] = useState(false);
    return (
        <>
            <div className='flex gap-3'>
                <Button type='submit' className='flex-1' loading={loading}>
                    {t.admin.updateBtn}
                </Button>
                {canDelete && (
                    <Button
                        type='button'
                        variant='destructive-outline'
                        onClick={() => setIsAsking(true)}
                        loading={loading}>
                        {t.admin.deleteBtn}
                    </Button>
                )}
            </div>
            {canDelete && (
                <ConfirmDialog
                    open={isAsking}
                    onOpenChange={setIsAsking}
                    title={t.admin.deleteBtn}
                    description={t.admin.confirmDelete}
                    confirmLabel={t.admin.deleteBtn}
                    cancelLabel={t.common.cancel}
                    onConfirm={onDelete}
                />
            )}
        </>
    );
}

type FormBodyProps = Readonly<{
    form: SessionEditForm;
    session: SessionEditView;
    locks: SessionEditLocks;
    loading: boolean;
    canDelete: boolean;
    onSubmit: (data: UpdateSessionFormData) => void;
    onDelete: () => void;
    t: Dictionary;
}>;

function SessionFormBody({
    form,
    session,
    locks,
    loading,
    canDelete,
    onSubmit,
    onDelete,
    t,
}: FormBodyProps) {
    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className='space-y-5'>
                <FormSection title={t.admin.sectionBasicInfo}>
                    <BasicFields
                        form={form}
                        t={t}
                        locks={locks}
                        activityName={session.activityName}
                    />
                </FormSection>
                <FormSection title={t.admin.sectionScheduleLocation}>
                    <ScheduleFields form={form} t={t} locks={locks} />
                </FormSection>
                <FormSection title={t.admin.sectionParticipantsFee}>
                    <CapacityFields form={form} t={t} locks={locks} />
                </FormSection>
                <NotesField form={form} t={t} />
                <SubmitRow
                    loading={loading}
                    canDelete={canDelete}
                    onDelete={onDelete}
                    t={t}
                />
            </form>
        </Form>
    );
}

/** What the stored row locks, as the fields read it. */
function locksOf(lock: SessionLockFacts): SessionEditLocks {
    return {
        isClosed: lock.isClosed,
        isMoneyBehind: isMoneyBehind(lock),
        heldSeats: lock.heldSeats,
    };
}

/**
 * The card the form sits in. One sentence carries the whole Closed lock and
 * every field it closes points at it: six copies of one sentence say nothing
 * the first copy did not.
 */
function EditCard({
    locks,
    t,
    children,
}: Readonly<{
    locks: SessionEditLocks;
    t: Dictionary;
    children: ReactNode;
}>) {
    return (
        <Card className='p-4'>
            {locks.isClosed && (
                <LockNote id={CLOSED_NOTE_ID}>
                    {t.admin.closedFieldsLocked}
                </LockNote>
            )}
            {children}
        </Card>
    );
}

export function EditSessionForm({
    session,
    lock,
    canDelete,
}: Readonly<{
    session: SessionEditView;
    lock: SessionLockFacts;
    canDelete: boolean;
}>) {
    const { locale } = useLocale();
    const t = getDictionary(locale);
    const { loading, update, remove } = useSessionEditActions(session.id, t);
    const form = useSessionForm(session, t);
    const locks = locksOf(lock);

    return (
        <div className='space-y-6'>
            <BackLink t={t} />
            <h1 className='type-display text-foreground'>
                {t.admin.editSessionTitle}
            </h1>
            <EditCard locks={locks} t={t}>
                <SessionFormBody
                    form={form}
                    session={session}
                    locks={locks}
                    loading={loading}
                    canDelete={canDelete}
                    onSubmit={update}
                    onDelete={remove}
                    t={t}
                />
            </EditCard>

            {/* The jobs that are about this Session without being its own facts —
                attendance among them, as a link out and nothing more. */}
            <EditSideCards
                sessionId={session.id}
                sessionTitle={session.title}
                lastReminderAt={session.lastReminderAt?.toISOString() ?? null}
                t={t}
            />
        </div>
    );
}
