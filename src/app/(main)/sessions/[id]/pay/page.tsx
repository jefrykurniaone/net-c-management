'use client';

import {
    useEffect,
    useState,
    type ChangeEvent,
    type SubmitEvent,
} from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Upload, ArrowLeft, ImageIcon } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary } from '@/lib/i18n/dictionaries';

/** The session prefill the register-&-pay uploader needs (display only). */
interface SessionInfo {
    id: string;
    title: string;
    fee: number;
    ekskul: { name: string };
}

export default function SessionPayPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const sessionId = params.id;
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
              .replace('{activity}', session.ekskul.name)
              .replace('{session}', session.title)
        : '';

    if (loaded && !session) {
        return (
            <div className='max-w-lg mx-auto space-y-6'>
                <BackLink sessionId={sessionId} label={t.sessions.backToList} />
                <div className='text-center py-16 bg-card rounded-xl border border-border'>
                    <p className='text-muted-foreground'>{t.sessions.notFound}</p>
                </div>
            </div>
        );
    }

    return (
        <div className='max-w-lg mx-auto space-y-6'>
            <BackLink sessionId={sessionId} label={t.sessions.backToList} />

            <div className='bg-card rounded-xl border border-border p-6'>
                <div className='flex items-center gap-2 mb-6'>
                    <Upload className='w-5 h-5 text-primary' />
                    <h1 className='text-xl font-bold text-foreground'>
                        {t.payments.paySessionTitle}
                    </h1>
                </div>

                <form onSubmit={handleSubmit} className='space-y-5'>
                    {/* Amount — server-authoritative from the Session's fee */}
                    <div className='space-y-1.5'>
                        <Label htmlFor='amount'>{t.payments.amountLabel}</Label>
                        <Input
                            id='amount'
                            type='text'
                            readOnly
                            className='tabular-nums bg-muted'
                            value={
                                session
                                    ? `Rp ${session.fee.toLocaleString('id-ID')}`
                                    : ''
                            }
                        />
                        {session && (
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
                        disabled={!file || loading}
                        loading={loading}>
                        {t.payments.submit}
                    </Button>
                </form>
            </div>
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
            className='inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground'>
            <ArrowLeft className='w-4 h-4' />
            {label}
        </Link>
    );
}
