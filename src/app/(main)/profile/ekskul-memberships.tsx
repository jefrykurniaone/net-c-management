'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { EkskulBadge } from '@/components/ekskul/ekskul-badge';
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
}

export function EkskulMemberships() {
    const { locale } = useLocale();
    const t = getDictionary(locale);
    const [ekskuls, setEkskuls] = useState<MembershipEkskul[]>([]);
    const [loading, setLoading] = useState(true);
    const [pendingId, setPendingId] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/users/memberships')
            .then((r) => r.json())
            .then((data: { ekskuls?: MembershipEkskul[] }) =>
                setEkskuls(data.ekskuls ?? []),
            )
            .catch(() => setEkskuls([]))
            .finally(() => setLoading(false));
    }, []);

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
            setEkskuls((prev) =>
                prev.map((e) =>
                    e.id === ekskul.id ? { ...e, joined: !e.joined } : e,
                ),
            );
            toast.success(
                action === 'join'
                    ? t.ekskul.joinSuccess
                    : t.ekskul.leaveSuccess,
            );
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t.common.error);
        } finally {
            setPendingId(null);
        }
    }

    return (
        <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-100 p-6'>
            <div className='flex items-center gap-2 mb-1'>
                <Shapes className='w-5 h-5 text-green-600' />
                <h2 className='font-semibold text-gray-900 dark:text-white'>
                    {t.ekskul.yourEkskul}
                </h2>
            </div>
            <p className='text-sm text-gray-500 mb-4'>{t.ekskul.yourEkskulSub}</p>

            {loading ? (
                <p className='text-sm text-gray-400'>{t.common.loading}</p>
            ) : ekskuls.length === 0 ? (
                <p className='text-sm text-gray-400'>{t.admin.noEkskul}</p>
            ) : (
                <div className='space-y-2'>
                    {ekskuls.map((e) => (
                        <div
                            key={e.id}
                            className='flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0'>
                            <EkskulBadge name={e.name} color={e.color} />
                            <Button
                                variant={e.joined ? 'outline' : 'default'}
                                size='sm'
                                className={`h-7 text-xs${e.joined ? '' : ' bg-green-600 hover:bg-green-700 text-white'}`}
                                loading={pendingId === e.id}
                                onClick={() => toggle(e)}>
                                {e.joined ? t.ekskul.leave : t.ekskul.join}
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
