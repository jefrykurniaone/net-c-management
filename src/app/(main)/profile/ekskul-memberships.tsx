'use client';

import { useEffect, useState } from 'react';
import type { PaymentMode } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { EkskulBadge } from '@/components/ekskul/ekskul-badge';
import { PaymentModeSelector } from './payment-mode-selector';
import { toast } from 'sonner';
import { Shapes } from 'lucide-react';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary } from '@/lib/i18n/dictionaries';

interface MembershipEkskul {
    id: string;
    name: string;
    color: string;
    slug: string;
    joined: boolean;
    monthlyFee: number;
    sessionFee: number;
    allowsMonthly: boolean;
    allowsPerSession: boolean;
    pendingMode: PaymentMode | null;
    pendingEffectiveFrom: number | null;
    effectiveMode: PaymentMode | null;
}

function fetchMemberships(): Promise<MembershipEkskul[] | null> {
    return fetch('/api/users/memberships')
        .then((r) => r.json())
        .then((data: { ekskuls?: MembershipEkskul[] }) => data.ekskuls ?? [])
        .catch(() => null);
}

export function EkskulMemberships() {
    const { locale } = useLocale();
    const t = getDictionary(locale);
    const [ekskuls, setEkskuls] = useState<MembershipEkskul[]>([]);
    const [loading, setLoading] = useState(true);
    const [pendingId, setPendingId] = useState<string | null>(null);

    useEffect(() => {
        fetchMemberships()
            .then((list) => setEkskuls(list ?? []))
            .finally(() => setLoading(false));
    }, []);

    // Silent re-read after a mode change — the effective mode (and any queued
    // switch) is resolved server-side, so re-fetch rather than guess locally.
    // A failed re-fetch keeps the current list instead of blanking it — the
    // action that triggered this already succeeded.
    async function refresh() {
        const list = await fetchMemberships();
        if (list === null) {
            toast.error(t.common.error);
            return;
        }
        setEkskuls(list);
    }

    async function toggle(ekskul: MembershipEkskul) {
        const action = ekskul.joined ? 'leave' : 'join';
        setPendingId(ekskul.id);
        try {
            const res = await fetch('/api/users/memberships', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ekskulId: ekskul.id, action }),
            });
            if (!res.ok) throw new Error(t.ekskul.actionFailed);
            toast.success(
                action === 'join' ? t.ekskul.joinSuccess : t.ekskul.leaveSuccess,
            );
            await refresh();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t.common.error);
        } finally {
            setPendingId(null);
        }
    }

    return (
        <div className='bg-card rounded-xl border border-border p-6'>
            <div className='flex items-center gap-2 mb-1'>
                <Shapes className='w-5 h-5 text-primary' />
                <h2 className='font-semibold text-foreground'>
                    {t.ekskul.yourEkskul}
                </h2>
            </div>
            <p className='text-sm text-muted-foreground mb-4'>{t.ekskul.yourEkskulSub}</p>

            {loading ? (
                <p className='text-sm text-muted-foreground'>{t.common.loading}</p>
            ) : ekskuls.length === 0 ? (
                <p className='text-sm text-muted-foreground'>{t.admin.noEkskul}</p>
            ) : (
                <div className='space-y-2'>
                    {ekskuls.map((e) => (
                        <div
                            key={e.id}
                            className='py-2 border-b border-border last:border-0'>
                            <div className='flex items-center justify-between'>
                                <EkskulBadge name={e.name} color={e.color} />
                                <Button
                                    variant={e.joined ? 'outline' : 'default'}
                                    size='sm'
                                    className='h-11 sm:h-7 text-xs'
                                    loading={pendingId === e.id}
                                    onClick={() => toggle(e)}>
                                    {e.joined ? t.ekskul.leave : t.ekskul.join}
                                </Button>
                            </div>
                            {e.joined && (
                                <PaymentModeSelector
                                    membership={{
                                        ekskulId: e.id,
                                        monthlyFee: e.monthlyFee,
                                        sessionFee: e.sessionFee,
                                        allowsMonthly: e.allowsMonthly,
                                        allowsPerSession: e.allowsPerSession,
                                        pendingMode: e.pendingMode,
                                        pendingEffectiveFrom: e.pendingEffectiveFrom,
                                        effectiveMode: e.effectiveMode,
                                    }}
                                    onChanged={refresh}
                                />
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
