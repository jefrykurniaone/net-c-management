'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { SessionStatus } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary, type Dictionary } from '@/lib/i18n/dictionaries';

/**
 * The four jobs an Admin does to a Session, from the row they are already
 * reading: take its attendance, edit its facts, open it as a member sees it, and
 * export it. Moving where it stands is the fifth and asks first — it is what a
 * member's board reads as struck.
 *
 * Two moves live here and never both at once. **Cancel** is offered while the
 * Session is open, and **Reopen** — Cancelled back to Scheduled — while its own
 * day has not passed. A Completed Session, and a Cancelled one whose day is
 * over, render neither: the server refuses both writes, so a disabled button
 * would only advertise a job that cannot be done, and its absence is what makes
 * the row read as closed rather than merely locked.
 *
 * Which of the two is offered is decided **server-side** (`session-rows.ts`) and
 * arrives as a boolean. The window turns on the Session's WIB calendar day, and
 * a browser west of Jakarta comparing dates itself would offer the move for
 * seven hours after the rule stopped allowing it.
 *
 * Every control is a real link or button in the row's DOM order, so Tab reaches
 * them in reading order and Enter presses them. Nothing here puts a `tabIndex`
 * on the row itself.
 */

type SessionActionsView = Readonly<{
    id: string;
    title: string;
    isClosed: boolean;
    canReopen: boolean;
}>;

/** One standing write: what it sends, and what it says either way. */
type StatusWrite = Readonly<{
    status: SessionStatus;
    done: string;
    failed: string;
}>;

/** The one kind of write this cell makes: move where the Session stands. */
function useStatusWrite(sessionId: string, write: StatusWrite) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function submit() {
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/sessions/${sessionId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: write.status }),
            });
            if (!res.ok) {
                const err = (await res.json()) as { error?: string };
                throw new Error(err.error ?? write.failed);
            }
            toast.success(write.done);
            router.refresh();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : write.failed);
        } finally {
            setIsSubmitting(false);
        }
    }

    return { isSubmitting, submit };
}

/** A standing move, as the row draws it: the button and the question it asks. */
type StandingAction = Readonly<{
    write: StatusWrite;
    variant: 'outline' | 'destructive-outline';
    label: string;
    confirmTitle: string;
    confirmDesc: string;
}>;

function cancelAction(
    session: SessionActionsView,
    t: Dictionary,
): StandingAction {
    return {
        write: {
            status: 'CANCELLED',
            done: t.admin.sessionCancelled,
            failed: t.admin.sessionCancelFailed,
        },
        variant: 'destructive-outline',
        label: t.admin.cancelSessionBtn,
        confirmTitle: t.admin.confirmCancelSessionTitle.replace(
            '{title}',
            session.title,
        ),
        confirmDesc: t.admin.confirmCancelSessionDesc,
    };
}

function reopenAction(
    session: SessionActionsView,
    t: Dictionary,
): StandingAction {
    return {
        write: {
            status: 'SCHEDULED',
            done: t.admin.sessionReopened,
            failed: t.admin.sessionReopenFailed,
        },
        variant: 'outline',
        label: t.admin.reopenSessionBtn,
        confirmTitle: t.admin.confirmReopenSessionTitle.replace(
            '{title}',
            session.title,
        ),
        confirmDesc: t.admin.confirmReopenSessionDesc,
    };
}

/** The button, and the dialog that states what the move does before it is made. */
function StandingControl({
    sessionId,
    action,
    t,
}: Readonly<{ sessionId: string; action: StandingAction; t: Dictionary }>) {
    const { isSubmitting, submit } = useStatusWrite(sessionId, action.write);
    const [isAsking, setIsAsking] = useState(false);

    return (
        <>
            <Button
                variant={action.variant}
                size='sm'
                loading={isSubmitting}
                onClick={() => setIsAsking(true)}>
                {action.label}
            </Button>
            <ConfirmDialog
                open={isAsking}
                onOpenChange={setIsAsking}
                title={action.confirmTitle}
                description={action.confirmDesc}
                confirmLabel={action.label}
                cancelLabel={t.common.cancel}
                onConfirm={submit}
            />
        </>
    );
}

/** Where the row goes: attendance, the edit form, the member's own view. */
function SessionLinks({
    session,
    t,
}: Readonly<{ session: SessionActionsView; t: Dictionary }>) {
    return (
        <>
            <Button variant='outline' size='sm' asChild>
                <Link href={`/admin/sessions/${session.id}/attendance`}>
                    {t.admin.toAttendance}
                </Link>
            </Button>
            <Button variant='outline' size='sm' asChild>
                <Link href={`/admin/sessions/${session.id}/edit`}>
                    {t.admin.edit}
                </Link>
            </Button>
            <Button variant='ghost' size='sm' asChild>
                <Link href={`/sessions/${session.id}`}>{t.admin.detail}</Link>
            </Button>
            <Button variant='ghost' size='sm' asChild>
                <a href={`/api/sessions/${session.id}/export`} download>
                    CSV
                </a>
            </Button>
        </>
    );
}

export function SessionActions({
    session,
}: Readonly<{ session: SessionActionsView }>) {
    const { locale } = useLocale();
    const t = getDictionary(locale);

    return (
        <>
            <SessionLinks session={session} t={t} />
            {!session.isClosed && (
                <StandingControl
                    sessionId={session.id}
                    action={cancelAction(session, t)}
                    t={t}
                />
            )}
            {session.canReopen && (
                <StandingControl
                    sessionId={session.id}
                    action={reopenAction(session, t)}
                    t={t}
                />
            )}
        </>
    );
}
