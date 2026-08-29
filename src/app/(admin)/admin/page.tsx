import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { format, startOfWeek, endOfWeek, startOfMonth, differenceInCalendarDays } from 'date-fns';
import { id as localeId, enUS } from 'date-fns/locale';
import { Plus, CreditCard, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatStrip } from '@/components/ui/stat-card';
import { ActivityInitial } from '@/components/activity/activity-badge';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getActivities } from '@/lib/activity';
import { isAdminRole } from '@/lib/utils';
import type { AttendanceStatus } from '@prisma/client';

const UNDER_BOOKED_RATIO = 0.6;
const MILLION = 1_000_000;

/**
 * The attendance states that are history — a Session that has been and what
 * became of each Seat. `PRESENT` and `ABSENT` (Opted Out) were the two; `NO_SHOW`
 * is the third, and a Seat held that nobody turned up for is as much a fact
 * about a past Session as the other two. The attendance rate below is `PRESENT`
 * over all three.
 */
const HISTORICAL_ATTENDANCE: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'NO_SHOW'];

function fill(template: string, values: Record<string, string | number>): string {
    return Object.entries(values).reduce(
        (acc, [k, v]) => acc.split(`{${k}}`).join(String(v)),
        template,
    );
}

function formatRupiahShort(amount: number): string {
    if (amount >= MILLION) return `Rp ${(amount / MILLION).toFixed(2)}M`;
    return `Rp ${amount.toLocaleString('id-ID')}`;
}

export default async function AdminDashboardPage() {
    const [session, locale] = await Promise.all([auth(), getLocale()]);
    if (!session?.user?.id || !isAdminRole(session.user.role))
        redirect('/dashboard');

    const t = getDictionary(locale);
    const dateLocale = locale === 'id' ? localeId : enUS;

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = startOfMonth(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const [
        activeMembers,
        newThisMonth,
        pendingPayments,
        collectedAgg,
        activities,
        membersByActivity,
        confirmedByActivity,
        sessionsThisWeek,
        underBookedSession,
        attendanceRows,
    ] = await Promise.all([
        prisma.user.count({ where: { isActive: true, isProfileComplete: true } }),
        prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
        prisma.payment.count({ where: { status: 'PENDING' } }),
        prisma.payment.aggregate({
            _sum: { amount: true },
            where: { status: 'CONFIRMED', month: currentMonth, year: currentYear },
        }),
        getActivities(),
        prisma.membership.groupBy({
            by: ['activityId'],
            where: { isActive: true },
            _count: true,
        }),
        // Only MONTHLY dues count toward "dues collected" — a per-session
        // (SESSION) payment is not a monthly due and would otherwise push the
        // count above the member total (OBS-01: "22/21").
        prisma.payment.groupBy({
            by: ['activityId'],
            where: {
                status: 'CONFIRMED',
                type: 'MONTHLY',
                month: currentMonth,
                year: currentYear,
            },
            _count: true,
        }),
        prisma.activitySession.findMany({
            where: {
                date: { gte: weekStart, lte: weekEnd },
                status: { not: 'CANCELLED' },
            },
            orderBy: { date: 'asc' },
            take: 6,
            include: {
                activity: { select: { name: true } },
                _count: {
                    select: {
                        attendances: {
                            where: { status: { in: ['REGISTERED', 'PRESENT'] } },
                        },
                    },
                },
            },
        }),
        prisma.activitySession.findMany({
            where: {
                date: { gte: startOfToday },
                status: { in: ['SCHEDULED', 'ONGOING'] },
            },
            orderBy: { date: 'asc' },
            take: 20,
            include: {
                _count: {
                    select: {
                        attendances: {
                            where: { status: { in: ['REGISTERED', 'PRESENT'] } },
                        },
                    },
                },
            },
        }),
        prisma.attendance.findMany({
            where: {
                status: { in: HISTORICAL_ATTENDANCE },
                session: { date: { gte: monthStart, lte: now } },
            },
            select: { status: true, session: { select: { activityId: true } } },
        }),
    ]);

    const memberCounts = new Map(
        membersByActivity.map((r) => [r.activityId, r._count]),
    );
    const confirmedCounts = new Map(
        confirmedByActivity.map((r) => [r.activityId, r._count]),
    );
    const weeklyCounts = new Map<string, number>();
    for (const s of sessionsThisWeek) {
        weeklyCounts.set(s.activityId, (weeklyCounts.get(s.activityId) ?? 0) + 1);
    }
    const attendance = new Map<string, { present: number; total: number }>();
    for (const row of attendanceRows) {
        const id = row.session.activityId;
        const cur = attendance.get(id) ?? { present: 0, total: 0 };
        cur.total += 1;
        if (row.status === 'PRESENT') cur.present += 1;
        attendance.set(id, cur);
    }

    const collected = collectedAgg._sum.amount ?? 0;
    const totalDue = activities.reduce(
        (sum, a) => sum + (memberCounts.get(a.id) ?? 0) * a.monthlyFee,
        0,
    );
    const underBooked = underBookedSession.find(
        (s) => s._count.attendances < s.maxPlayers * UNDER_BOOKED_RATIO,
    );

    const hour = now.getHours();
    const greeting =
        hour < 12
            ? t.admin.greetingMorning
            : hour < 18
              ? t.admin.greetingAfternoon
              : t.admin.greetingEvening;

    const stats = [
        {
            label: t.admin.statActiveMembers,
            value: activeMembers,
            sub:
                newThisMonth > 0
                    ? fill(t.admin.newThisMonth, { n: newThisMonth })
                    : undefined,
            subClassName: newThisMonth > 0 ? 'text-xs text-green-600' : undefined,
        },
        {
            label: t.admin.statSessionsThisWeek,
            value: sessionsThisWeek.length,
            sub: fill(t.admin.acrossActivities, { n: activities.length }),
        },
        {
            label: t.admin.pendingPayments,
            value: pendingPayments,
            sub: t.admin.needReview,
            valueClassName: pendingPayments > 0 ? 'text-warning' : undefined,
        },
        {
            label: `${t.admin.statCollected} · ${t.months[currentMonth]}`,
            value: formatRupiahShort(collected),
            sub:
                totalDue > 0
                    ? fill(t.admin.ofDue, { amount: formatRupiahShort(totalDue) })
                    : undefined,
        },
    ];

    const attentionCount = (pendingPayments > 0 ? 1 : 0) + (underBooked ? 1 : 0);

    return (
        <div className='space-y-5'>
            {/* Header */}
            <div className='flex items-start justify-between gap-4 flex-wrap'>
                <div className='space-y-0.5'>
                    <h1 className='text-[26px] font-bold text-foreground tracking-tight'>
                        {greeting}, {session.user.name?.split(' ')[0]}
                    </h1>
                    <p className='text-sm text-muted-foreground'>
                        {format(now, 'EEEE, d MMMM', { locale: dateLocale })} ·{' '}
                        {t.admin.dashboardHeaderSub}
                    </p>
                </div>
                <Link href='/admin/sessions/new'>
                    <Button className='gap-1.5'>
                        <Plus className='w-4 h-4' />
                        {t.admin.newSession}
                    </Button>
                </Link>
            </div>

            <StatStrip items={stats} />

            {/* Needs attention + This week */}
            <div className='grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-4'>
                {/* Needs attention */}
                <div className='rounded-sm border border-rule bg-tile overflow-hidden'>
                    <div className='flex items-center justify-between px-5 py-4 border-b border-border'>
                        <h2 className='text-[15px] font-semibold text-foreground'>
                            {t.admin.needsAttentionTitle}
                        </h2>
                        {attentionCount > 0 && (
                            <span className='text-[11px] font-semibold text-warning-soft-foreground bg-warning-soft border border-warning-soft-border rounded-full px-2.5 py-0.5'>
                                {fill(t.admin.itemsCount, { n: attentionCount })}
                            </span>
                        )}
                    </div>
                    {attentionCount === 0 ? (
                        <p className='px-5 py-8 text-sm text-muted-foreground text-center'>
                            {t.admin.allClear}
                        </p>
                    ) : (
                        <div className='divide-y divide-border'>
                            {pendingPayments > 0 && (
                                <div className='flex items-center gap-3.5 px-5 py-3.5'>
                                    <span className='flex size-9 shrink-0 items-center justify-center rounded-sm bg-warning-soft'>
                                        <CreditCard className='w-4 h-4 text-warning' />
                                    </span>
                                    <div className='flex-1 min-w-0'>
                                        <p className='text-sm font-semibold text-foreground'>
                                            {fill(t.admin.pendingProofsItem, {
                                                n: pendingPayments,
                                            })}
                                        </p>
                                        <p className='text-xs text-muted-foreground'>
                                            {t.admin.pendingProofsSub}
                                        </p>
                                    </div>
                                    <Link href='/admin/payments'>
                                        <Button
                                            size='sm'
                                            variant='outline'
                                            className='text-primary border-primary-soft-border bg-primary-soft hover:bg-primary-soft/70'>
                                            {t.admin.reviewAction}
                                        </Button>
                                    </Link>
                                </div>
                            )}
                            {underBooked && (
                                <div className='flex items-center gap-3.5 px-5 py-3.5'>
                                    <span className='flex size-9 shrink-0 items-center justify-center rounded-sm bg-primary-soft'>
                                        <Users className='w-4 h-4 text-primary' />
                                    </span>
                                    <div className='flex-1 min-w-0'>
                                        <p className='text-sm font-semibold text-foreground truncate'>
                                            {fill(t.admin.underBookedItem, {
                                                title: underBooked.title,
                                                n: underBooked._count.attendances,
                                                max: underBooked.maxPlayers,
                                            })}
                                        </p>
                                        <p className='text-xs text-muted-foreground'>
                                            {format(
                                                new Date(underBooked.date),
                                                'EEE, d MMM',
                                                { locale: dateLocale },
                                            )}{' '}
                                            ·{' '}
                                            {fill(t.admin.rsvpClosesInDays, {
                                                n: differenceInCalendarDays(
                                                    new Date(underBooked.date),
                                                    now,
                                                ),
                                            })}
                                        </p>
                                    </div>
                                    <Link href={`/admin/sessions/${underBooked.id}/edit`}>
                                        <Button size='sm' variant='outline'>
                                            {t.admin.remindMembers}
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* This week */}
                <div className='rounded-sm border border-rule bg-tile overflow-hidden'>
                    <div className='flex items-center justify-between px-5 py-4 border-b border-border'>
                        <h2 className='text-[15px] font-semibold text-foreground'>
                            {t.admin.thisWeekTitle}
                        </h2>
                        <Link
                            href='/admin/sessions'
                            className='text-[13px] font-semibold text-primary hover:underline'>
                            {t.admin.allSessionsLink}
                        </Link>
                    </div>
                    {sessionsThisWeek.length === 0 ? (
                        <p className='px-5 py-8 text-sm text-muted-foreground text-center'>
                            {t.admin.noSessionsThisWeek}
                        </p>
                    ) : (
                        <div className='divide-y divide-border'>
                            {sessionsThisWeek.map((s) => (
                                <div
                                    key={s.id}
                                    className='flex items-center gap-3 px-5 py-3'>
                                    <span className='flex w-9 shrink-0 flex-col items-center rounded-sm bg-accent py-1'>
                                        <span className='text-[9.5px] font-semibold uppercase text-primary'>
                                            {format(new Date(s.date), 'EEE', {
                                                locale: dateLocale,
                                            })}
                                        </span>
                                        <span className='text-[15px] font-bold text-foreground leading-none tabular-nums'>
                                            {format(new Date(s.date), 'dd')}
                                        </span>
                                    </span>
                                    <div className='flex-1 min-w-0'>
                                        <p className='text-[13px] font-semibold text-foreground truncate'>
                                            {s.title}
                                        </p>
                                        <p className='text-[11.5px] text-muted-foreground truncate'>
                                            {s.startTime} · {s.activity.name}
                                        </p>
                                    </div>
                                    <span className='text-[13px] font-semibold text-foreground tabular-nums'>
                                        {s._count.attendances}
                                        <span className='font-normal text-subtle-foreground'>
                                            /{s.maxPlayers}
                                        </span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Per-activity cards */}
            {activities.length > 0 && (
                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
                    {activities.map((a) => {
                        const members = memberCounts.get(a.id) ?? 0;
                        // Cap at the member total: a lingering confirmed payment
                        // from a member who has since left must not read as
                        // "more collected than owed".
                        const confirmed = Math.min(
                            confirmedCounts.get(a.id) ?? 0,
                            members,
                        );
                        const att = attendance.get(a.id);
                        const rate =
                            att && att.total > 0
                                ? Math.round((att.present / att.total) * 100)
                                : null;
                        const perWeek = weeklyCounts.get(a.id) ?? 0;
                        const duesPct =
                            members > 0
                                ? Math.min((confirmed / members) * 100, 100)
                                : 0;
                        return (
                            <div
                                key={a.id}
                                className='rounded-sm border border-rule bg-tile overflow-hidden'>
                                {/* No coloured top border: the accent-line
                                    device is banned, and the Activity is named
                                    by its initial tile plus its name below. */}
                                <div className='p-5 space-y-3.5'>
                                    <div className='flex items-center gap-2.5'>
                                        <ActivityInitial name={a.name} />
                                        <span className='flex-1 text-[15px] font-semibold text-foreground truncate'>
                                            {a.name}
                                        </span>
                                        <span className='text-xs text-subtle-foreground'>
                                            {members} {t.admin.membersSuffix}
                                        </span>
                                    </div>
                                    <div className='flex gap-6'>
                                        <div className='flex flex-col'>
                                            <span className='text-[17px] font-bold text-foreground tabular-nums'>
                                                {rate === null ? '—' : `${rate}%`}
                                            </span>
                                            <span className='text-[11px] text-subtle-foreground'>
                                                {t.admin.attendanceMetric}
                                            </span>
                                        </div>
                                        <div className='flex flex-col'>
                                            <span className='text-[17px] font-bold text-foreground tabular-nums'>
                                                {perWeek}
                                            </span>
                                            <span className='text-[11px] text-subtle-foreground'>
                                                {t.admin.sessionsPerWeek}
                                            </span>
                                        </div>
                                    </div>
                                    <div className='space-y-1.5'>
                                        <div className='flex justify-between'>
                                            <span className='text-[11.5px] font-medium text-muted-foreground'>
                                                {t.admin.duesCollectedLabel}
                                            </span>
                                            <span className='text-[11.5px] font-semibold text-foreground tabular-nums'>
                                                {confirmed}/{members}
                                            </span>
                                        </div>
                                        <div className='h-[5px] rounded-full bg-muted overflow-hidden'>
                                            <div
                                                className='h-full rounded-full bg-primary'
                                                style={{ width: `${duesPct}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
