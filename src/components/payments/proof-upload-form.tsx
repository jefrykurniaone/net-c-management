'use client';

import { useState, type ChangeEvent, type SubmitEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { BankAccountInfo } from '@/components/payments/bank-account-info';
import { ProofFileField } from '@/components/payments/proof-file-field';
import { ReadOnlyField } from '@/components/payments/read-only-field';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { MonthlyActivity } from '@/lib/proof-upload-cases';
import { validateProofFile } from '@/lib/proof-file';

/** Where the history this screen returns to lives. */
const PAYMENTS_PATH = '/payments';

/**
 * Rupiah is billed in whole units — no subunits, ever — and every amount in
 * this product is a tabular figure. Grouping stays `id-ID` regardless of the UI
 * locale, because the amount is a Rupiah amount in both languages.
 */
const RUPIAH_FORMAT = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
});

function rupiah(amount: number): string {
    return `Rp ${RUPIAH_FORMAT.format(amount)}`;
}

/** Which Activity, and which period, this Proof settles. */
function owedLine(
    t: Dictionary,
    activityName: string,
    month: number,
    year: number,
): string {
    return t.payments.owedFor
        .split('{activity}')
        .join(activityName)
        .split('{month}')
        .join(t.months[month])
        .split('{year}')
        .join(String(year));
}

/** The API's own message, or the generic fallback when it sends none. */
function errorMessage(body: unknown, fallback: string): string {
    if (typeof body !== 'object' || body === null) return fallback;
    const { error } = body as { error?: unknown };
    return typeof error === 'string' && error !== '' ? error : fallback;
}

interface ProofSubmission {
    file: File;
    activityId: string;
    month: number;
    year: number;
    fallback: string;
}

/**
 * The upload itself, unchanged: the same endpoint, the same fields, the same
 * calendar period the screen was opened in. The server re-derives what is owed
 * and stays the authority on both the amount and the mode.
 */
async function postProof(submission: ProofSubmission): Promise<void> {
    const formData = new FormData();
    formData.append('file', submission.file);
    formData.append('activityId', submission.activityId);
    formData.append('month', String(submission.month));
    formData.append('year', String(submission.year));

    const res = await fetch('/api/payments/upload', {
        method: 'POST',
        body: formData,
    });
    if (!res.ok) {
        const body: unknown = await res.json();
        throw new Error(errorMessage(body, submission.fallback));
    }
}

/**
 * The file a member just picked, or `null` when it cannot be sent. A rejected
 * file is reported here rather than on a round trip: the shared validator names
 * the problem, and the fix that goes with it is this screen's own copy.
 */
function pickProofFile(
    event: ChangeEvent<HTMLInputElement>,
    t: Dictionary,
): File | null {
    const picked = event.target.files?.[0];
    if (!picked) return null;
    const problem = validateProofFile(picked, t);
    if (!problem) return picked;
    toast.error(problem, { description: t.payments.proofFileFix });
    event.target.value = '';
    return null;
}

interface ProofUploadFormProps {
    t: Dictionary;
    /** Every Activity billed monthly for this period — never empty. */
    activities: readonly MonthlyActivity[];
    month: number;
    year: number;
    periodLabel: string;
}

/**
 * Proof of a monthly-dues transfer, for one Activity in the current period.
 *
 * A member with exactly one monthly Activity has it preselected, so the only
 * thing left to do is attach the transfer. With more than one, the Activity is
 * named on screen — in the select, in the amount owed, and in the bank details
 * beside the upload — before anything can be submitted.
 */
export function ProofUploadForm({
    t,
    activities,
    month,
    year,
    periodLabel,
}: Readonly<ProofUploadFormProps>) {
    const router = useRouter();
    const [activityId, setActivityId] = useState(
        activities.length === 1 ? activities[0].id : '',
    );
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const chosen = activities.find((activity) => activity.id === activityId);

    function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
        const picked = pickProofFile(event, t);
        if (!picked) return;
        setFile(picked);
        setPreview(URL.createObjectURL(picked));
    }

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!activityId) {
            toast.error(t.payments.activityNotChosen);
            return;
        }
        if (!file) {
            toast.error(t.payments.proofMissing);
            return;
        }

        setLoading(true);
        try {
            await postProof({
                file,
                activityId,
                month,
                year,
                fallback: t.payments.toastError,
            });
            toast.success(t.payments.toastSuccess);
            router.push(PAYMENTS_PATH);
            router.refresh();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t.common.error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className='space-y-block'>
            <ActivityField
                t={t}
                activities={activities}
                activityId={activityId}
                onChange={setActivityId}
            />
            <ServerSetFields
                t={t}
                periodLabel={periodLabel}
                amount={chosen ? rupiah(chosen.duesAmount) : ''}
                owed={chosen ? owedLine(t, chosen.name, month, year) : null}
            />
            <BankAccountInfo account={chosen ?? null} />
            <ProofFileField
                t={t}
                file={file}
                preview={preview}
                onChange={handleFileChange}
            />
            <SubmitRow
                t={t}
                loading={loading}
                ready={file !== null && activityId !== ''}
            />
        </form>
    );
}

/** Which Activity the Proof is for — preselected when there is only one. */
function ActivityField({
    t,
    activities,
    activityId,
    onChange,
}: Readonly<{
    t: Dictionary;
    activities: readonly MonthlyActivity[];
    activityId: string;
    onChange: (id: string) => void;
}>) {
    return (
        <div className='space-y-hair'>
            <Label htmlFor='activity'>{t.activity.label}</Label>
            <Select value={activityId} onValueChange={onChange}>
                <SelectTrigger id='activity' className='w-full'>
                    <SelectValue placeholder={t.activity.selectPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                    {activities.map((activity) => (
                        <SelectItem key={activity.id} value={activity.id}>
                            {activity.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

/**
 * The period and the amount owed. Both are the server's, not the member's: they
 * take the ground fill a read-only field takes, a lock, and a sentence saying
 * who set them — so the state is never carried by colour.
 */
function ServerSetFields({
    t,
    periodLabel,
    amount,
    owed,
}: Readonly<{
    t: Dictionary;
    periodLabel: string;
    amount: string;
    /** Which Activity and period the amount settles, once one is chosen. */
    owed: string | null;
}>) {
    return (
        <div className='space-y-cell'>
            <div className='grid grid-cols-2 gap-cell'>
                <ReadOnlyField
                    id='period'
                    label={t.payments.periodLabel}
                    value={periodLabel}
                    note={t.payments.periodLocked}
                />
                <ReadOnlyField
                    id='amount'
                    label={t.payments.amountLabel}
                    value={amount}
                    note={t.payments.amountLocked}
                    isFigure
                />
            </div>
            {owed && (
                <p className='type-caption text-secondary-foreground'>{owed}</p>
            )}
        </div>
    );
}

/**
 * The act of committing money, and the disclosure the label defers to. That
 * sentence is Body in Secondary Ink and tied to the control — a condition in
 * fine print is not disclosed.
 */
function SubmitRow({
    t,
    loading,
    ready,
}: Readonly<{ t: Dictionary; loading: boolean; ready: boolean }>) {
    return (
        <div className='space-y-cell'>
            <Button
                type='submit'
                className='w-full type-label'
                aria-describedby='verify-note'
                disabled={!ready || loading}
                loading={loading}>
                {loading ? t.payments.submitting : t.payments.submitReview}
            </Button>
            <p id='verify-note' className='type-body text-secondary-foreground'>
                {t.payments.verifyNote}
            </p>
        </div>
    );
}

