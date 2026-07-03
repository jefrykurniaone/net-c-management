'use client';

import { useEffect, useState, type ChangeEvent, type SubmitEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { PaymentMode } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, ArrowLeft, ImageIcon } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { EmptyState } from '@/components/ui/empty-state';
import {
    BankAccountInfo,
    type BankAccount,
} from '@/components/payments/bank-account-info';

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

/** An Activity the member is billed monthly for this period. */
interface MonthlyActivity extends BankAccount {
    id: string;
    name: string;
    monthlyFee: number;
}

type MembershipRow = MonthlyActivity & {
    joined: boolean;
    effectiveMode: PaymentMode | null;
};

type LoadStatus = 'loading' | 'loaded' | 'error';

export default function UploadPaymentPage() {
    const router = useRouter();
    const { locale } = useLocale();
    const t = getDictionary(locale);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<LoadStatus>('loading');
    const [preview, setPreview] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [activities, setActivities] = useState<MonthlyActivity[]>([]);
    const [activityId, setActivityId] = useState('');

    useEffect(() => {
        // Only Activities the member is billed monthly for THIS period can raise a
        // monthly charge; effectiveMode is server-resolved by the memberships GET
        // for the current period, so this uploader only ever submits for it.
        fetch('/api/users/memberships')
            .then((r) => {
                if (!r.ok) throw new Error('fetch failed');
                return r.json();
            })
            .then((data: { activities?: MembershipRow[] }) => {
                const list = (data.activities ?? [])
                    .filter((e) => e.joined && e.effectiveMode === 'MONTHLY')
                    .map((e) => ({
                        id: e.id,
                        name: e.name,
                        monthlyFee: e.monthlyFee,
                        bankName: e.bankName,
                        bankAccountNumber: e.bankAccountNumber,
                        bankAccountHolder: e.bankAccountHolder,
                    }));
                setActivities(list);
                if (list.length === 1) setActivityId(list[0].id);
                setStatus('loaded');
            })
            .catch(() => setStatus('error'));
    }, []);

    function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0];
        if (!f) return;
        setFile(f);
        setPreview(URL.createObjectURL(f));
    }

    async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!activityId) {
            toast.error(t.validation.activityRequired);
            return;
        }
        if (!file) {
            toast.error(t.payments.selectFile);
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('activityId', activityId);
            formData.append('month', String(currentMonth));
            formData.append('year', String(currentYear));

            const res = await fetch('/api/payments/upload', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? t.payments.toastError);
            }

            toast.success(t.payments.toastSuccess);
            router.push('/payments');
            router.refresh();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t.common.error);
        } finally {
            setLoading(false);
        }
    }

    const chosen = activities.find((e) => e.id === activityId);
    const owedLabel = chosen
        ? t.payments.owedFor
              .split('{activity}').join(chosen.name)
              .split('{month}').join(t.months[currentMonth])
              .split('{year}').join(String(currentYear))
        : '';

    if (status !== 'loaded') {
        return (
            <div className='max-w-lg mx-auto space-y-6'>
                <Link
                    href='/payments'
                    className='inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground'>
                    <ArrowLeft className='w-4 h-4' />
                    {t.payments.backToHistory}
                </Link>
                <EmptyState
                    title={status === 'loading' ? t.common.loading : t.common.error}
                />
            </div>
        );
    }

    if (activities.length === 0) {
        return (
            <div className='max-w-lg mx-auto space-y-6'>
                <Link
                    href='/payments'
                    className='inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground'>
                    <ArrowLeft className='w-4 h-4' />
                    {t.payments.backToHistory}
                </Link>
                <EmptyState title={t.payments.noMonthlyActivity} />
            </div>
        );
    }

    return (
        <div className='max-w-lg mx-auto space-y-6'>
            <Link
                href='/payments'
                className='inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground'>
                <ArrowLeft className='w-4 h-4' />
                {t.payments.backToHistory}
            </Link>

            <div className='bg-card rounded-xl border border-border p-6'>
                <div className='flex items-center gap-2 mb-6'>
                    <Upload className='w-5 h-5 text-primary' />
                    <h1 className='text-xl font-bold text-foreground'>
                    {t.payments.uploadTitle}
                    </h1>
                </div>

                <form onSubmit={handleSubmit} className='space-y-5'>
                    {/* Activity */}
                    <div className='space-y-1.5'>
                        <Label>{t.activity.label}</Label>
                        <Select value={activityId} onValueChange={setActivityId}>
                            <SelectTrigger className='w-full'>
                                <SelectValue
                                    placeholder={t.activity.selectPlaceholder}
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {activities.map((e) => (
                                    <SelectItem key={e.id} value={e.id}>
                                        {e.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Amount — server-authoritative from the Activity's monthly fee */}
                    <div className='space-y-1.5'>
                        <Label htmlFor='amount'>{t.payments.amountLabel}</Label>
                        <Input
                            id='amount'
                            type='text'
                            readOnly
                            className='tabular-nums bg-muted'
                            value={
                                chosen
                                    ? `Rp ${chosen.monthlyFee.toLocaleString('id-ID')}`
                                    : ''
                            }
                        />
                        {chosen && (
                            <p className='text-xs text-muted-foreground'>
                                {t.payments.amountLocked}
                            </p>
                        )}
                        {owedLabel && (
                            <p className='text-sm text-muted-foreground'>
                                {owedLabel}
                            </p>
                        )}
                    </div>

                    {/* Where to transfer — the activity's configured account */}
                    <BankAccountInfo account={chosen ?? null} />

                    {/* File Upload */}
                    <div className='space-y-2'>
                        <Label>{t.payments.fileLabel}</Label>
                        <label
                            htmlFor='proof-file'
                            className='flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors relative overflow-hidden'>
                            {preview ? (
                                <Image
                                    src={preview}
                                    alt='Preview'
                                    fill
                                    className='object-cover rounded-xl'
                                />
                            ) : (
                                <div className='flex flex-col items-center gap-2 text-muted-foreground pointer-events-none'>
                                    <ImageIcon className='w-8 h-8' />
                                    <p className='text-sm'>
                                        {t.payments.selectImage}
                                    </p>
                                    <p className='text-xs'>
                                        {t.payments.fileDesc}
                                    </p>
                                </div>
                            )}
                        </label>
                        <input
                            id='proof-file'
                            type='file'
                            accept='image/jpeg,image/jpg,image/png,image/webp'
                            onChange={handleFileChange}
                            className='sr-only'
                        />
                        {file && (
                            <p className='text-xs text-muted-foreground truncate tabular-nums'>
                                {file.name} ({(file.size / 1024).toFixed(0)} KB)
                            </p>
                        )}
                    </div>

                    <Button
                        type='submit'
                        className='w-full'
                        disabled={!file || !activityId || loading}
                        loading={loading}>
                        {loading ? t.payments.submitting : t.payments.submit}
                    </Button>
                </form>
            </div>
        </div>
    );
}
