import { auth } from '@/lib/auth';
import { COLUMN_MEASURE } from '@/components/layout/measure';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import { id as localeId, enUS } from 'date-fns/locale';
import { SessionDetailHeader } from '@/components/sessions/session-detail-header';
import { SessionFacts } from '@/components/sessions/session-facts';
import { SessionPlayersCard } from '@/components/sessions/session-players-card';
import { SessionActionCard } from '@/components/sessions/session-action-card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary, type Dictionary } from '@/lib/i18n/dictionaries';
import { currentPeriod } from '@/lib/payment-mode';
import { getSessionQuotas } from '@/lib/recurring-sessions';
import { getSettings } from '@/lib/settings';
import { ShareSessionCard } from '@/components/sessions/share-session-card';
import { buildSessionDetailView } from '@/lib/session-detail-view';

/** The Session, with just enough of its Activity and its attendee rows for
 *  the detail page's cards — never the shape another surface happens to want. */
function findSessionForDetail(id: string) {
    return prisma.activitySession.findUnique({
        where: { id },
        include: {
            activity: {
                select: {
                    id: true,
                    name: true,
                    icon: true,
                    allowsMonthly: true,
                    allowsPerSession: true,
                    duesRates: { select: { amount: true, effectiveFrom: true } },
                    minMembers: true,
                    adminWhatsapp: true,
                },
            },
            attendances: {
                // ABSENT rows (monthly members who cancelled) are opt-out
                // markers, not participants — hide them. MAYBE is a tentative
                // RSVP: shown in the list, but it holds no seat (see _count).
                where: { status: { in: ['REGISTERED', 'MAYBE', 'PRESENT'] } },
                include: {
                    user: { select: { id: true, name: true, image: true } },
                },
                orderBy: { createdAt: 'asc' },
            },
            _count: {
                select: {
                    attendances: {
                        where: { status: { in: ['REGISTERED', 'PRESENT'] } },
                    },
                },
            },
        },
    });
}

type SessionForDetail = NonNullable<
    Awaited<ReturnType<typeof findSessionForDetail>>
>;

/**
 * Everything besides the Session row itself that the page needs: the
 * reader's own Membership and Payments, their own Seat, the Activity's
 * viability quota and the community's Settings. One `Promise.all` — none of
 * these five reads depends on another.
 */
function fetchSessionExtras(session: SessionForDetail, userId: string) {
    return Promise.all([
        prisma.membership.findUnique({
            where: {
                userId_activityId: { userId, activityId: session.activityId },
            },
            select: {
                isActive: true,
                paymentMode: true,
                effectiveFrom: true,
                pendingMode: true,
                pendingEffectiveFrom: true,
            },
        }),
        prisma.payment.findFirst({
            where: { userId, sessionId: session.id, type: 'SESSION' },
            select: { status: true, notes: true },
        }),
        prisma.payment.findFirst({
            where: {
                userId,
                activityId: session.activityId,
                type: 'MONTHLY',
                ...currentPeriod(session.date),
                status: { in: ['PENDING', 'CONFIRMED'] },
            },
            select: { id: true },
        }),
        // The reader's own row, read directly rather than picked out of the
        // participants list: that list filters ABSENT out (an Opted Out row
        // is not a Participant), which is exactly the state the header and
        // the forfeit sentence below have to be able to see.
        prisma.attendance.findUnique({
            where: { userId_sessionId: { userId, sessionId: session.id } },
            select: { status: true, holdExpiresAt: true },
        }),
        getSessionQuotas([session]),
        getSettings(),
    ]);
}

/** The Prisma row shape both `SessionDetailBody` and `buildSessionDetailView`
 *  read from — named once so neither repeats the other's type. */
type DetailSession = SessionForDetail;

/**
 * The page's whole render: the header, facts, players and action cards, in
 * that order, then Share — unchanged from where it always sat. The page
 * component above this only fetches; this only draws, from what it fetched.
 */
function SessionDetailBody({
    activitySession,
    view,
    locale,
    t,
}: Readonly<{
    activitySession: DetailSession;
    view: ReturnType<typeof buildSessionDetailView>;
    locale: string;
    t: Dictionary;
}>) {
    return (
        <div className={COLUMN_MEASURE}>
            <div className='mb-4 flex items-center gap-2 border-b border-border pb-4'>
                <Link
                    href='/sessions'
                    className='text-muted-foreground hover:text-foreground'>
                    <ArrowLeft className='w-5 h-5' />
                    <span className='sr-only'>{t.sessions.backToList}</span>
                </Link>
                <span className='text-base font-semibold text-foreground'>
                    {t.sessions.backTitle}
                </span>
            </div>

            {/* Opening a Session shows, in order: the header card, the facts
                card, the players card, then the action card. Share and
                WhatsApp actions stay where they were — the WhatsApp button
                inside the action card, the share card last. */}
            <div className='space-y-4'>
                <SessionDetailHeader
                    session={{
                        title: activitySession.title,
                        date: activitySession.date,
                        startTime: activitySession.startTime,
                        endTime: activitySession.endTime,
                        location: activitySession.location,
                        activityName: activitySession.activity.name,
                        activityIcon: activitySession.activity.icon ?? null,
                        status: activitySession.status,
                        ownStatus: view.rsvpStatus,
                        seats: {
                            free: Math.max(
                                activitySession.maxPlayers -
                                    view.attendeeCount,
                                0,
                            ),
                            max: activitySession.maxPlayers,
                        },
                        quota: view.quota ?? null,
                    }}
                    t={t}
                />

                {/* Only what the header above cannot say — never the times, the
                    venue or the quota a second time. */}
                <SessionFacts
                    session={{
                        dateLabel: view.dateLabel,
                        startTime: activitySession.startTime,
                        endTime: activitySession.endTime,
                        location: activitySession.location,
                        fee: activitySession.fee,
                        notes: activitySession.notes,
                    }}
                    t={t}
                />

                <SessionPlayersCard
                    data={{
                        players: view.players,
                        attendeeCount: view.attendeeCount,
                        maxPlayers: activitySession.maxPlayers,
                        fillPercent: view.fillPercent,
                    }}
                    locale={locale}
                    t={t}
                />

                <SessionActionCard data={view.actionData} t={t} />

                <ShareSessionCard
                    sessionId={activitySession.id}
                    sessionTitle={activitySession.title}
                    labels={{
                        title: t.sessions.shareSession,
                        description: t.sessions.shareSessionDesc,
                        copyLink: t.sessions.copyLink,
                        copied: t.sessions.linkCopied,
                        shareWhatsapp: t.sessions.shareViaWhatsapp,
                        shareX: t.sessions.shareViaTwitter,
                    }}
                />
            </div>
        </div>
    );
}

export default async function SessionDetailPage({
    params,
}: Readonly<{
    params: Promise<{ id: string }>;
}>) {
    const [authSession, locale] = await Promise.all([auth(), getLocale()]);
    if (!authSession?.user?.id) redirect('/auth/signin');

    const t = getDictionary(locale);
    const dateLocale = locale === 'id' ? localeId : enUS;

    const { id } = await params;
    const activitySession = await findSessionForDetail(id);
    if (!activitySession) notFound();

    const offered = {
        allowsMonthly: activitySession.activity.allowsMonthly,
        allowsPerSession: activitySession.activity.allowsPerSession,
    };
    const [membership, sessionPayment, monthlyPayment, mySeat, quotas, settings] =
        await fetchSessionExtras(activitySession, authSession.user.id);
    const whatsapp =
        activitySession.activity.adminWhatsapp || settings.adminWhatsapp || '';

    const view = buildSessionDetailView({
        session: {
            id: activitySession.id,
            activityId: activitySession.activityId,
            title: activitySession.title,
            date: activitySession.date,
            startTime: activitySession.startTime,
            endTime: activitySession.endTime,
            location: activitySession.location,
            fee: activitySession.fee,
            notes: activitySession.notes,
            maxPlayers: activitySession.maxPlayers,
            status: activitySession.status,
            attendances: activitySession.attendances,
            confirmedCount: activitySession._count.attendances,
        },
        offered,
        duesRates: activitySession.activity.duesRates,
        membership,
        sessionPayment,
        hasLiveMonthlyDues: monthlyPayment !== null,
        mySeat,
        quota: quotas.get(activitySession.id),
        adminWhatsapp: whatsapp,
        userId: authSession.user.id,
        dateLocale,
        t,
    });

    return (
        <SessionDetailBody
            activitySession={activitySession}
            view={view}
            locale={locale}
            t={t}
        />
    );
}
