import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { id as localeId, enUS } from 'date-fns/locale';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatStrip } from '@/components/ui/stat-card';
import { DashboardInsightsSlot } from '@/components/admin/dashboard-insights-slot';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary, type Dictionary } from '@/lib/i18n/dictionaries';
import { isAdminRole } from '@/lib/utils';
import { loadDashboardData, type DashboardData } from './dashboard-data';
import { DashboardAttentionCard } from './dashboard-attention-card';
import { DashboardActivityCards } from './dashboard-activity-cards';

const MILLION = 1_000_000;
const NOON_HOUR = 12;
const EVENING_HOUR = 18;

/** `fill('{n} items', { n: 3 })` → `'3 items'` — this page's one templating need. */
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

/** "Good morning" / "Good afternoon" / "Good evening", by the server's own clock. */
function greetingFor(t: Dictionary, hour: number): string {
    if (hour < NOON_HOUR) return t.admin.greetingMorning;
    if (hour < EVENING_HOUR) return t.admin.greetingAfternoon;
    return t.admin.greetingEvening;
}

/** The stat row's four tiles — labels and formatting only; every figure is `data`'s. */
function buildStats(t: Dictionary, data: DashboardData) {
    return [
        {
            label: t.admin.statActiveMembers,
            value: data.activeMembers,
            sub:
                data.newThisMonth > 0
                    ? fill(t.admin.newThisMonth, { n: data.newThisMonth })
                    : undefined,
            subClassName:
                data.newThisMonth > 0 ? 'type-caption text-success' : undefined,
        },
        {
            label: t.admin.statSessionsThisWeek,
            value: data.sessionsThisWeekCount,
            sub: fill(t.admin.acrossActivities, { n: data.activitiesCount }),
        },
        {
            label: t.admin.pendingPayments,
            value: data.pendingPayments,
            sub: t.admin.needReview,
            valueClassName: data.pendingPayments > 0 ? 'text-warning' : undefined,
        },
        {
            label: `${t.admin.statCollected} · ${t.months[data.currentMonth]}`,
            value: formatRupiahShort(data.collected),
            sub:
                data.totalDue > 0
                    ? fill(t.admin.ofDue, { amount: formatRupiahShort(data.totalDue) })
                    : undefined,
        },
    ];
}

export default async function AdminDashboardPage() {
    const [session, locale] = await Promise.all([auth(), getLocale()]);
    if (!session?.user?.id || !isAdminRole(session.user.role))
        redirect('/dashboard');

    const t = getDictionary(locale);
    const dateLocale = locale === 'id' ? localeId : enUS;
    const now = new Date();
    const data = await loadDashboardData(now);
    const greeting = greetingFor(t, now.getHours());
    const stats = buildStats(t, data);

    return (
        <div className='space-y-5'>
            {/* Header — every admin page's Display title with an optional
                action row (docs/spec-rally-admin-v1.md, Implementation
                Decisions → Shell). */}
            <div className='flex items-start justify-between gap-4 flex-wrap'>
                <div className='space-y-0.5'>
                    <h1 className='type-display text-foreground'>
                        {greeting}, {session.user.name?.split(' ')[0]}
                    </h1>
                    <p className='type-caption text-muted-foreground'>
                        {format(now, 'EEEE, d MMMM', { locale: dateLocale })} ·{' '}
                        {t.admin.dashboardHeaderSub}
                    </p>
                </div>
                <Button asChild className='gap-1.5'>
                    <Link href='/admin/sessions/new'>
                        <Plus className='w-4 h-4' />
                        {t.admin.newSession}
                    </Link>
                </Button>
            </div>

            <StatStrip items={stats} />

            <DashboardAttentionCard
                t={t}
                pendingPayments={data.pendingPayments}
                underBooked={data.underBooked}
                now={now}
                dateLocale={dateLocale}
            />

            {/* Reserved for #170/#171 (spec rally-insights) — renders nothing
                until either lands. */}
            <DashboardInsightsSlot />

            <DashboardActivityCards activities={data.activityCards} t={t} />
        </div>
    );
}
