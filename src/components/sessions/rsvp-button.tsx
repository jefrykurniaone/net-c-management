'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary } from '@/lib/i18n/dictionaries';

interface RSVPButtonProps {
    sessionId: string;
    isRegistered: boolean;
    isFull: boolean;
    isCancelled: boolean;
    isCompleted: boolean;
}

export function RSVPButton({
    sessionId,
    isRegistered,
    isFull,
    isCancelled,
    isCompleted,
}: Readonly<RSVPButtonProps>) {
    const router = useRouter();
    const { locale } = useLocale();
    const t = getDictionary(locale);
    const [loading, setLoading] = useState(false);

    async function cancelRegistration(): Promise<void> {
        const res = await fetch(`/api/sessions/${sessionId}/attendance`, { method: 'DELETE' });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error ?? t.sessions.toastCancelError);
        }
        toast.success(t.sessions.toastCancelSuccess);
    }

    async function registerForSession(): Promise<void> {
        const res = await fetch(`/api/sessions/${sessionId}/attendance`, { method: 'POST' });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error ?? t.sessions.toastRegisterError);
        }
        toast.success(t.sessions.toastRegisterSuccess);
    }

    async function handleRSVP() {
        setLoading(true);
        try {
            if (isRegistered) {
                await cancelRegistration();
            } else {
                await registerForSession();
            }
            router.refresh();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t.common.error);
        } finally {
            setLoading(false);
        }
    }

    if (isCancelled) {
        return (
            <Button disabled variant='outline' className='w-full'>
                {t.sessions.sessionCancelled}
            </Button>
        );
    }

    if (isCompleted) {
        return (
            <Button disabled variant='outline' className='w-full'>
                {t.sessions.sessionCompleted}
            </Button>
        );
    }

    if (!isRegistered && isFull) {
        return (
            <Button disabled variant='outline' className='w-full'>
                {t.sessions.sessionFull}
            </Button>
        );
    }

    return (
        <Button
            onClick={handleRSVP}
            disabled={loading}
            variant={isRegistered ? 'outline' : 'default'}
            className={
                isRegistered
                    ? 'w-full border-red-200 text-red-500 hover:bg-red-50'
                    : 'w-full bg-green-600 hover:bg-green-700 text-white'
            }>
            {(() => {
                if (loading) return isRegistered ? t.sessions.cancelling : t.sessions.registering;
                if (isRegistered) return t.sessions.cancelRegistration;
                return t.sessions.register;
            })()}
        </Button>
    );
}
