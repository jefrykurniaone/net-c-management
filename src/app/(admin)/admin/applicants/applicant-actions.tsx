'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary } from '@/lib/i18n/dictionaries';

type Decision = 'admit' | 'decline';

/**
 * The Admin's decision on one Applicant. Both acts are confirmed — admitting
 * grants access to the community and sends mail, declining shuts a door on a
 * real person — but neither uses type-to-confirm: this is a volunteer organizer
 * on a phone with a handful of rows, not a bulk deletion.
 */
export function ApplicantActions({
    id,
    name,
}: Readonly<{ id: string; name: string }>) {
    const router = useRouter();
    const { locale } = useLocale();
    const t = getDictionary(locale);
    const [loading, setLoading] = useState(false);
    const [asking, setAsking] = useState<Decision | null>(null);

    async function decide(action: Decision) {
        setLoading(true);
        try {
            const res = await fetch('/api/users/admissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action }),
            });
            if (!res.ok) {
                const err = (await res.json()) as { error?: string };
                throw new Error(err.error ?? t.common.error);
            }
            const done =
                action === 'admit'
                    ? t.admin.admittedToast
                    : t.admin.declinedToast;
            toast.success(done.replace('{name}', name));
            router.refresh();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t.common.error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <span className='flex flex-wrap items-center gap-cell'>
            <Button
                size='sm'
                onClick={() => setAsking('admit')}
                loading={loading}>
                {t.admin.admit}
            </Button>
            <Button
                variant='destructive-outline'
                size='sm'
                onClick={() => setAsking('decline')}
                loading={loading}>
                {t.admin.decline}
            </Button>

            <ConfirmDialog
                open={asking === 'admit'}
                onOpenChange={(open) => !open && setAsking(null)}
                tone='primary'
                icon={UserCheck}
                title={t.admin.admitConfirmTitle.replace('{name}', name)}
                description={t.admin.admitConfirmDesc}
                confirmLabel={t.admin.admit}
                cancelLabel={t.common.cancel}
                onConfirm={() => decide('admit')}
            />
            <ConfirmDialog
                open={asking === 'decline'}
                onOpenChange={(open) => !open && setAsking(null)}
                icon={UserX}
                title={t.admin.declineConfirmTitle.replace('{name}', name)}
                description={t.admin.declineConfirmDesc}
                confirmLabel={t.admin.decline}
                cancelLabel={t.common.cancel}
                onConfirm={() => decide('decline')}
            />
        </span>
    );
}
