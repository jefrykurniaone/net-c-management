import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { id as localeId, enUS } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ActivityBadge } from '@/components/activity/activity-badge';
import { ActivityFilter } from '@/components/activity/activity-filter';
import { SessionCards } from './session-cards';
import Link from 'next/link';
import { Plus, ExternalLink } from 'lucide-react';
import type { ActivitySession } from '@prisma/client';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getActivities } from '@/lib/activity';
import { ensureRecurringSessions } from '@/lib/recurring-sessions';
import { sessionStatusVariant, isAdminRole } from '@/lib/utils';

type SessionRow = ActivitySession & {
    _count: { attendances: number };
    activity: { id: string; name: string; color: string; icon: string | null };
};

export default async function AdminSessionsPage({
    searchParams,
}: Readonly<{ searchParams: Promise<{ activityId?: string }> }>) {
    const [session, locale] = await Promise.all([auth(), getLocale()]);
    if (!session?.user?.id || !isAdminRole(session.user.role))
        redirect('/dashboard');

    const t = getDictionary(locale);
    const dateLocale = locale === 'id' ? localeId : enUS;

    const sp = await searchParams;
    const selected = sp.activityId || undefined;

    // Lazy idempotent generation of this month's weekly sessions (no cron).
    await ensureRecurringSessions();

    const [sessions, activities] = await Promise.all([
        prisma.activitySession.findMany({
            where: selected ? { activityId: selected } : {},
            orderBy: { date: 'desc' },
            take: 50,
            include: {
                _count: {
                    select: {
                        attendances: {
                            where: {
                                status: { in: ['REGISTERED', 'PRESENT'] },
                            },
                        },
                    },
                },
                activity: {
                    select: { id: true, name: true, color: true, icon: true },
                },
            },
        }),
        getActivities(),
    ]);

    return (
        <div className='space-y-6'>
            <div className='flex items-center justify-between flex-wrap gap-3'>
                <div>
                    <h1 className='text-2xl font-bold text-foreground'>
                        {t.admin.sessionsTitle}
                    </h1>
                    <p className='text-sm text-muted-foreground mt-1'>
                        {t.admin.sessionsSubtitle}
                    </p>
                </div>
                <div className='flex items-center gap-2'>
                    <ActivityFilter
                        activities={activities}
                        selected={selected}
                        allLabel={t.activity.filterAll}
                    />
                    <Link href='/admin/sessions/new'>
                        <Button className='gap-2'>
                            <Plus className='w-4 h-4' />
                            {t.admin.newSession}
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Mobile: stacked cards (< md) */}
            <div className='md:hidden'>
                <SessionCards sessions={sessions} t={t} locale={locale} />
            </div>

            {/* Desktop: full table (>= md) */}
            <div className='hidden md:block bg-card rounded-xl border border-border overflow-hidden'>
                <div className='overflow-x-auto'>
                    <table className='w-full text-sm'>
                        <thead>
                            <tr className='bg-muted/50 border-b border-border'>
                                <th className='text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
                                    {t.admin.colSession}
                                </th>
                                <th className='text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
                                    {t.admin.colDate}
                                </th>
                                <th className='text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
                                    {t.admin.colLocation}
                                </th>
                                <th className='text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
                                    {t.admin.colParticipants}
                                </th>
                                <th className='text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
                                    {t.admin.colStatus}
                                </th>
                                <th className='text-right px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
                                    {t.admin.colActions}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.map((s: SessionRow) => {
                                    const fillPct = Math.min(
                                        (s._count.attendances / s.maxPlayers) *
                                            100,
                                        100,
                                    );
                                    const isUnderBooked = fillPct < 60;
                                    return (
                                        <tr
                                            key={s.id}
                                            className='border-b border-border last:border-b-0 hover:bg-muted/40'>
                                            <td className='px-5 py-3.5 max-w-50'>
                                                <span className='truncate block font-semibold text-foreground'>
                                                    {s.title}
                                                </span>
                                                <ActivityBadge
                                                    name={s.activity.name}
                                                    color={s.activity.color}
                                                    icon={s.activity.icon}
                                                    className='mt-1'
                                                />
                                            </td>
                                            <td className='px-5 py-3.5 text-secondary-foreground whitespace-nowrap tabular-nums'>
                                                {format(
                                                    new Date(s.date),
                                                    'd MMM yyyy',
                                                    { locale: dateLocale },
                                                )}
                                                <span className='text-xs text-muted-foreground block'>
                                                    {s.startTime} – {s.endTime}
                                                </span>
                                            </td>
                                            <td className='px-5 py-3.5 text-muted-foreground max-w-37.5 truncate'>
                                                {s.location}
                                            </td>
                                            <td className='px-5 py-3.5'>
                                                <span className='block text-[13px] font-semibold text-foreground tabular-nums'>
                                                    {s._count.attendances}/
                                                    {s.maxPlayers}
                                                </span>
                                                <span className='mt-1 block h-1 w-16 overflow-hidden rounded-full bg-muted'>
                                                    <span
                                                        className={
                                                            'block h-full rounded-full ' +
                                                            (isUnderBooked
                                                                ? 'bg-warning-solid'
                                                                : 'bg-primary')
                                                        }
                                                        style={{
                                                            width: `${fillPct}%`,
                                                        }}
                                                    />
                                                </span>
                                            </td>
                                            <td className='px-5 py-3.5'>
                                                <Badge
                                                    variant={sessionStatusVariant(s.status)}>
                                                    {t.sessionStatus[s.status]}
                                                </Badge>
                                            </td>
                                            <td className='px-5 py-3.5 text-right'>
                                                <div className='flex items-center justify-end gap-2.5'>
                                                    <Link
                                                        href={`/sessions/${s.id}`}
                                                        className='text-xs font-semibold text-primary hover:underline flex items-center gap-1'>
                                                        <ExternalLink className='w-3 h-3' />
                                                        {t.admin.detail}
                                                    </Link>
                                                    <Link
                                                        href={`/admin/sessions/${s.id}/edit`}
                                                        className='text-xs font-semibold text-secondary-foreground hover:text-foreground hover:underline'>
                                                        {t.admin.edit}
                                                    </Link>
                                                    <a
                                                        href={`/api/sessions/${s.id}/export`}
                                                        className='text-xs font-semibold text-primary hover:underline'
                                                        download>
                                                        CSV
                                                    </a>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                },
                            )}
                            {sessions.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className='px-4 py-8 text-center text-muted-foreground'>
                                        {t.admin.noSessions}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
