import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { id as localeId, enUS } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EkskulBadge } from '@/components/ekskul/ekskul-badge';
import { EkskulFilter } from '@/components/ekskul/ekskul-filter';
import { SessionCards } from './session-cards';
import Link from 'next/link';
import { CalendarDays, Plus, ExternalLink } from 'lucide-react';
import type { ActivitySession } from '@prisma/client';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getEkskuls } from '@/lib/ekskul';
import { sessionStatusVariant, isAdminRole } from '@/lib/utils';

type SessionRow = ActivitySession & {
    _count: { attendances: number };
    ekskul: { id: string; name: string; color: string; icon: string | null };
};

export default async function AdminSessionsPage({
    searchParams,
}: Readonly<{ searchParams: Promise<{ ekskulId?: string }> }>) {
    const [session, locale] = await Promise.all([auth(), getLocale()]);
    if (!session?.user?.id || !isAdminRole(session.user.role))
        redirect('/dashboard');

    const t = getDictionary(locale);
    const dateLocale = locale === 'id' ? localeId : enUS;

    const sp = await searchParams;
    const selected = sp.ekskulId || undefined;

    const [sessions, ekskuls] = await Promise.all([
        prisma.activitySession.findMany({
            where: selected ? { ekskulId: selected } : {},
            orderBy: { date: 'desc' },
            take: 50,
            include: {
                _count: { select: { attendances: true } },
                ekskul: {
                    select: { id: true, name: true, color: true, icon: true },
                },
            },
        }),
        getEkskuls(),
    ]);

    return (
        <div className='space-y-6'>
            <div className='flex items-center justify-between flex-wrap gap-3'>
                <div>
                    <h1 className='text-2xl font-bold text-foreground flex items-center gap-2'>
                        <CalendarDays className='w-6 h-6 text-primary' />
                        {t.admin.sessionsTitle}
                    </h1>
                    <p className='text-sm text-muted-foreground mt-1'>
                        {t.admin.sessionsSubtitle}
                    </p>
                </div>
                <div className='flex items-center gap-2'>
                    <EkskulFilter
                        ekskuls={ekskuls}
                        selected={selected}
                        allLabel={t.ekskul.filterAll}
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
                            <tr className='bg-muted border-b border-border'>
                                <th className='text-left px-4 py-3 font-medium text-muted-foreground'>
                                    {t.admin.colSession}
                                </th>
                                <th className='text-left px-4 py-3 font-medium text-muted-foreground'>
                                    {t.admin.colDate}
                                </th>
                                <th className='text-left px-4 py-3 font-medium text-muted-foreground'>
                                    {t.admin.colLocation}
                                </th>
                                <th className='text-center px-4 py-3 font-medium text-muted-foreground'>
                                    {t.admin.colParticipants}
                                </th>
                                <th className='text-center px-4 py-3 font-medium text-muted-foreground'>
                                    {t.admin.colStatus}
                                </th>
                                <th className='text-right px-4 py-3 font-medium text-muted-foreground'>
                                    {t.admin.colActions}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.map((s: SessionRow) => {
                                    return (
                                        <tr
                                            key={s.id}
                                            className='border-b border-border hover:bg-muted'>
                                            <td className='relative px-4 py-3 font-medium text-foreground max-w-50'>
                                                <span
                                                    aria-hidden
                                                    className='absolute left-0 top-0 h-full w-[3px]'
                                                    style={{
                                                        backgroundColor:
                                                            s.ekskul.color,
                                                    }}
                                                />
                                                <span className='truncate block'>
                                                    {s.title}
                                                </span>
                                                <EkskulBadge
                                                    name={s.ekskul.name}
                                                    color={s.ekskul.color}
                                                    icon={s.ekskul.icon}
                                                    className='mt-1'
                                                />
                                            </td>
                                            <td className='px-4 py-3 text-muted-foreground whitespace-nowrap'>
                                                {format(
                                                    new Date(s.date),
                                                    'd MMM yyyy',
                                                    { locale: dateLocale },
                                                )}
                                                <span className='text-xs text-muted-foreground block'>
                                                    {s.startTime} – {s.endTime}
                                                </span>
                                            </td>
                                            <td className='px-4 py-3 text-muted-foreground max-w-37.5 truncate'>
                                                {s.location}
                                            </td>
                                            <td className='px-4 py-3 text-center text-muted-foreground tabular-nums'>
                                                {s._count.attendances}/
                                                {s.maxPlayers}
                                            </td>
                                            <td className='px-4 py-3 text-center'>
                                                <Badge
                                                    variant={sessionStatusVariant(s.status)}>
                                                    {t.sessionStatus[s.status]}
                                                </Badge>
                                            </td>
                                            <td className='px-4 py-3 text-right'>
                                                <div className='flex items-center justify-end gap-2'>
                                                    <Link
                                                        href={`/sessions/${s.id}`}
                                                        className='text-xs text-primary hover:underline flex items-center gap-1'>
                                                        <ExternalLink className='w-3 h-3' />
                                                        {t.admin.detail}
                                                    </Link>
                                                    <Link
                                                        href={`/admin/sessions/${s.id}/edit`}
                                                        className='text-xs text-muted-foreground hover:text-foreground hover:underline'>
                                                        {t.admin.edit}
                                                    </Link>
                                                    <a
                                                        href={`/api/sessions/${s.id}/export`}
                                                        className='text-xs text-primary hover:underline'
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
