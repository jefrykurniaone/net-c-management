'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary, type Dictionary } from '@/lib/i18n/dictionaries';

/**
 * The four jobs an Admin does to a Session, from the row they are already
 * reading: take its attendance, edit its facts, open it as a member sees it, and
 * export it. Cancelling is the fifth and asks first — it is what a member's
 * board reads as struck, and a Session cannot be un-cancelled through this
 * route.
 *
 * A Session that is already Completed or Cancelled renders **no** cancel
 * control. The server refuses the write either way, so a disabled button would
 * only advertise a job that cannot be done; its absence is what makes the row
 * read as closed rather than merely locked.
 *
 * Every control is a real link or button in the row's DOM order, so Tab reaches
 * them in reading order and Enter presses them. Nothing here puts a `tabIndex`
 * on the row itself.
 */

type SessionActionsView = Readonly<{
    id: string;
    title: string;
    isClosed: boolean;
}>;

/** The one write this cell makes: strike the Session from the register. */
function useCancelSession(sessionId: string, t: Dictionary) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function cancel() {
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/sessions/${sessionId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'CANCELLED' }),
            });
            if (!res.ok) {
                const err = (await res.json()) as { error?: string };
                throw new Error(err.error ?? t.admin.sessionCancelFailed);
            }
            toast.success(t.admin.sessionCancelled);
            router.refresh();
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : t.admin.sessionCancelFailed,
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return { isSubmitting, cancel };
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
    const { isSubmitting, cancel } = useCancelSession(session.id, t);
    const [isAsking, setIsAsking] = useState(false);

    return (
        <>
            <SessionLinks session={session} t={t} />
            {!session.isClosed && (
                <Button
                    variant='destructive-outline'
                    size='sm'
                    loading={isSubmitting}
                    onClick={() => setIsAsking(true)}>
                    {t.admin.cancelSessionBtn}
                </Button>
            )}
            <ConfirmDialog
                open={isAsking}
                onOpenChange={setIsAsking}
                title={t.admin.confirmCancelSessionTitle.replace(
                    '{title}',
                    session.title,
                )}
                description={t.admin.confirmCancelSessionDesc}
                confirmLabel={t.admin.cancelSessionBtn}
                cancelLabel={t.common.cancel}
                onConfirm={cancel}
            />
        </>
    );
}
