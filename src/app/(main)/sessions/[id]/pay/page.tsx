'use client';

import {
    useEffect,
    useState,
    type ChangeEvent,
    type SubmitEvent,
} from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { TASK_MEASURE } from '@/components/layout/measure';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ReadOnlyField } from '@/components/payments/read-only-field';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary, type Dictionary } from '@/lib/i18n/dictionaries';
import { EmptyState } from '@/components/ui/empty-state';
import {
    BankAccountInfo,
    type BankAccount,
} from '@/components/payments/bank-account-info';
import { ProofFileField } from '@/components/payments/proof-file-field';
import { HoldCountdownChip } from '@/components/payments/hold-countdown';
import { validateProofFile } from '@/lib/proof-file';

/**
 * Register-and-pay for one Session, as four cards: the amount (read-only,
 * server-set), the bank account to transfer to, the proof upload, and the submit
 * action — the same shape the monthly-dues upload form (`proof-upload-form.tsx`)
 * draws. The server is the authority on both the amount and the Payment Mode
 * (ADR 0011); nothing here decides either.
 */

/**
 * One attendee entry of `GET /api/sessions/[id]`. `holdExpiresAt` is optional
 * because the route sends it on the reader's own row only — see
 * `src/lib/session-detail-response.ts`.
 */
interface SessionAttendanceRow {
    readonly user: Readonly<{ id: string }>;
    readonly holdExpiresAt?: string | null;
}

/** The session prefill the register-&-pay uploader needs (display only). */
interface SessionInfo {
    id: string;
    title: string;
    fee: number;
    activity: { name: string } & BankAccount;
    attendances: readonly SessionAttendanceRow[];
}

/** The reader's own live reservation hold on this Session, or null. */
function myHoldExpiresAt(
    session: SessionInfo | null,
    userId: string | undefined,
): string | null {
    if (!session || !userId) return null;
    return (
        session.attendances.find((a) => a.user.id === userId)
            ?.holdExpiresAt ?? null
    );
}

export default function SessionPayPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const sessionId = params.id;
    const { data: authSession } = useSession();
    const { locale } = useLocale();
    const t = getDictionary(locale);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [session, setSession] = useState<SessionInfo | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);

    useEffect(() => {
        // Prefill (amount is display-only; the server recomputes from the fee).
        fetch(`/api/sessions/${sessionId}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((data: SessionInfo | null) => setSession(data))
            .catch(() => setSession(null))
            .finally(() => setLoaded(true));
    }, [sessionId]);

    function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0];
        if (!f) return;
        const error = validateProofFile(f, t);
        if (error) {
            toast.error(error);
            e.target.value = '';
            return;
        }
        setFile(f);
        setPreview(URL.createObjectURL(f));
    }

    async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!file) {
            toast.error(t.payments.selectFile);
            return;
        }
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('sessionId', sessionId);

            const res = await fetch('/api/payments/upload', {
                method: 'POST',
                body: formData,
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? t.payments.toastError);
            }

            toast.success(t.payments.toastSuccess);
            router.push(`/sessions/${sessionId}`);
            router.refresh();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t.common.error);
        } finally {
            setLoading(false);
        }
    }

    const owedLabel = session
        ? t.payments.sessionOwedFor
              .split('{activity}').join(session.activity.name)
              .split('{session}').join(session.title)
        : '';
    const holdExpiresAtISO = myHoldExpiresAt(session, authSession?.user?.id);

    if (loaded && !session) {
        return (
            <div className={`${TASK_MEASURE} space-y-block`}>
                <BackLink sessionId={sessionId} label={t.sessions.backToList} />
                <EmptyState title={t.sessions.notFound} />
            </div>
        );
    }

    return (
        <div className={`${TASK_MEASURE} space-y-block`}>
            <BackLink sessionId={sessionId} label={t.sessions.backToList} />

            <PayHeader
                t={t}
                holdExpiresAtISO={holdExpiresAtISO}
            />

            <form onSubmit={handleSubmit} className='space-y-block'>
                <Card>
                    <CardContent className='space-y-hair'>
                        <ReadOnlyField
                            id='amount'
                            label={t.payments.amountLabel}
                            value={
                                session
                                    ? `Rp ${session.fee.toLocaleString('id-ID')}`
                                    : ''
                            }
                            note={t.payments.sessionAmountLocked}
                            isFigure
                        />
                        {owedLabel && (
                            <p className='type-caption text-secondary-foreground'>
                                {owedLabel}
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <BankAccountInfo account={session?.activity ?? null} />
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <ProofFileField
                            t={t}
                            file={file}
                            preview={preview}
                            onChange={handleFileChange}
                        />
                    </CardContent>
                </Card>

                <div className='space-y-cell'>
                    <Button
                        type='submit'
                        className='w-full'
                        disabled={!file || loading}
                        loading={loading}>
                        {t.payments.submit}
                    </Button>
                    <p className='text-center type-body text-secondary-foreground'>
                        {t.payments.verifyNote}
                    </p>
                </div>
            </form>
        </div>
    );
}

/** The page's own title, with the live hold deadline beside it where one
 *  applies — the chip carries the countdown, so nothing else has to. */
function PayHeader({
    t,
    holdExpiresAtISO,
}: Readonly<{ t: Dictionary; holdExpiresAtISO: string | null }>) {
    return (
        <div className='flex flex-wrap items-center justify-between gap-cell'>
            <h1 className='type-title text-foreground'>
                {t.payments.paySessionTitle}
            </h1>
            {holdExpiresAtISO && (
                <HoldCountdownChip
                    iso={holdExpiresAtISO}
                    template={t.sessions.reservedPayWithin}
                    expiredLabel={t.sessions.holdExpired}
                />
            )}
        </div>
    );
}

function BackLink({
    sessionId,
    label,
}: Readonly<{ sessionId: string; label: string }>) {
    return (
        <Link
            href={`/sessions/${sessionId}`}
            className='inline-flex items-center gap-cell type-label text-secondary-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2'>
            <ArrowLeft aria-hidden='true' className='size-4' />
            {label}
        </Link>
    );
}
