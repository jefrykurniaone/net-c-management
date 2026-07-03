'use client';

import { useEffect, useState } from 'react';
import { PaymentMode } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { ActivityBadge } from '@/components/activity/activity-badge';
import { toast } from 'sonner';
import { MessageCircle, Shapes } from 'lucide-react';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary, type Dictionary } from '@/lib/i18n/dictionaries';

/** Radix for decoding a YYYYMM period key back into month + year. */
const PERIOD_RADIX = 100;

interface MembershipActivity {
    id: string;
    name: string;
    color: string;
    slug: string;
    joined: boolean;
    monthlyFee: number;
    sessionFee: number;
    allowsMonthly: boolean;
    allowsPerSession: boolean;
    adminWhatsapp: string;
    pendingMode: PaymentMode | null;
    pendingEffectiveFrom: number | null;
    effectiveMode: PaymentMode | null;
}

function money(n: number): string {
    return `Rp ${n.toLocaleString('id-ID')}`;
}

/** Human label for a YYYYMM period key using the localized month names. */
function periodLabel(key: number, months: string[]): string {
    const year = Math.floor(key / PERIOD_RADIX);
    const month = key % PERIOD_RADIX;
    return `${months[month] ?? ''} ${year}`.trim();
}

/**
 * Read-only payment-mode summary. The mode itself is chosen (and switched)
 * in the session-registration flow, never here — this only reflects the
 * server-resolved state for the current period.
 */
function PaymentModeLine({
    activity,
    t,
}: Readonly<{ activity: MembershipActivity; t: Dictionary }>) {
    if (!activity.allowsMonthly && !activity.allowsPerSession) {
        return (
            <p className='mt-2 text-xs text-muted-foreground'>
                {t.paymentMode.noModesOffered}
            </p>
        );
    }
    const mode = activity.effectiveMode;
    if (!mode) {
        return (
            <p className='mt-2 text-xs text-muted-foreground'>
                {t.paymentMode.chooseAtRegistration}
            </p>
        );
    }
    const isMonthly = mode === PaymentMode.MONTHLY;
    const label = isMonthly ? t.paymentMode.monthly : t.paymentMode.perSession;
    const fee = isMonthly
        ? `${money(activity.monthlyFee)}${t.paymentMode.perMonthSuffix}`
        : `${money(activity.sessionFee)}${t.paymentMode.perSessionSuffix}`;
    const pendingLabel =
        activity.pendingMode === PaymentMode.MONTHLY
            ? t.paymentMode.monthly
            : t.paymentMode.perSession;
    return (
        <div className='mt-2 text-xs text-muted-foreground'>
            <p>
                {t.paymentMode.youPay}:{' '}
                <span className='font-medium text-foreground'>{label}</span>{' '}
                <span className='tabular-nums'>{fee}</span>
            </p>
            {activity.pendingMode && activity.pendingEffectiveFrom && (
                <p className='mt-1 text-warning'>
                    {pendingLabel} · {t.paymentMode.pendingNote} ·{' '}
                    {t.paymentMode.effectivePrefix}{' '}
                    {periodLabel(activity.pendingEffectiveFrom, t.months)}
                </p>
            )}
        </div>
    );
}

function fetchMemberships(): Promise<MembershipActivity[] | null> {
    return fetch('/api/users/memberships')
        .then((r) => r.json())
        .then((data: { activities?: MembershipActivity[] }) => data.activities ?? [])
        .catch(() => null);
}

export function ActivityMemberships() {
    const { locale } = useLocale();
    const t = getDictionary(locale);
    const [activities, setActivities] = useState<MembershipActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [pendingId, setPendingId] = useState<string | null>(null);

    useEffect(() => {
        fetchMemberships()
            .then((list) => setActivities(list ?? []))
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
        setActivities(list);
    }

    async function toggle(activity: MembershipActivity) {
        const action = activity.joined ? 'leave' : 'join';
        setPendingId(activity.id);
        try {
            const res = await fetch('/api/users/memberships', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activityId: activity.id, action }),
            });
            if (!res.ok) throw new Error(t.activity.actionFailed);
            toast.success(
                action === 'join' ? t.activity.joinSuccess : t.activity.leaveSuccess,
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
                    {t.activity.yourActivity}
                </h2>
            </div>
            <p className='text-sm text-muted-foreground mb-4'>{t.activity.yourActivitySub}</p>

            {loading ? (
                <p className='text-sm text-muted-foreground'>{t.common.loading}</p>
            ) : activities.length === 0 ? (
                <p className='text-sm text-muted-foreground'>{t.admin.noActivity}</p>
            ) : (
                <div className='space-y-2'>
                    {activities.map((e) => (
                        <div
                            key={e.id}
                            className='py-2 border-b border-border last:border-0'>
                            <div className='flex items-center justify-between gap-2'>
                                <ActivityBadge name={e.name} color={e.color} />
                                <div className='flex items-center gap-1'>
                                    {e.adminWhatsapp && (
                                        <a
                                            href={`https://wa.me/${e.adminWhatsapp.replace(/\D/g, '')}`}
                                            target='_blank'
                                            rel='noopener noreferrer'
                                            aria-label={t.sessions.contactAdmin}
                                            title={t.sessions.contactAdmin}
                                            className='inline-flex h-11 sm:h-7 items-center justify-center rounded-md border border-success/40 px-2 text-success hover:bg-success/10'>
                                            <MessageCircle className='w-3.5 h-3.5' />
                                        </a>
                                    )}
                                    <Button
                                        variant={e.joined ? 'outline' : 'default'}
                                        size='sm'
                                        className='h-11 sm:h-7 text-xs'
                                        loading={pendingId === e.id}
                                        onClick={() => toggle(e)}>
                                        {e.joined ? t.activity.leave : t.activity.join}
                                    </Button>
                                </div>
                            </div>
                            {e.joined && <PaymentModeLine activity={e} t={t} />}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
