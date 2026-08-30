import { auth } from '@/lib/auth';
import { COLUMN_MEASURE } from '@/components/layout/measure';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import { format } from 'date-fns';
import { id as localeId, enUS } from 'date-fns/locale';
import { RSVPButton } from '@/components/sessions/rsvp-button';
import { SessionDetailHeader } from '@/components/sessions/session-detail-header';
import { SessionFacts } from '@/components/sessions/session-facts';
import { PlayerList, type PlayerItem } from '@/components/sessions/player-list';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary, type Dictionary } from '@/lib/i18n/dictionaries';
import { monthDayLabel } from '@/components/sessions/board-view';
import {
    resolvePaymentMode,
    singleOfferedMode,
    currentPeriod,
    toPeriodKey,
} from '@/lib/payment-mode';
import { resolveDuesRate } from '@/lib/dues-rate';
import { getSessionQuotas } from '@/lib/recurring-sessions';
import { getSettings } from '@/lib/settings';
import { WhatsappButton } from '@/components/sessions/whatsapp-button';
import { ShareSessionCard } from '@/components/sessions/share-session-card';
import { isRsvpClosed, rsvpCloseAt } from '@/lib/rsvp';

/**
 * The Session's own WIB day, read with `getUTC*` and named from the dictionary.
 * The Slot Cell in the header above reads the date this way; a locale formatter
 * reads the machine's zone instead, which on a UTC or UTC+8 host puts a
 * different weekday and date beside it on the very same screen.
 */
function sessionDateLabel(date: Date, t: Dictionary): string {
    return `${t.days[date.getUTCDay()]}, ${monthDayLabel(date, t)}`;
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

    const activitySession = await prisma.activitySession.findUnique({
        where: { id },
        include: {
            activity: {
                select: {
                    id: true,
                    name: true,
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
                    user: {
                        select: {
                            id: true,
                            name: true,
                            image: true,
                        },
                    },
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

    if (!activitySession) notFound();

    // Resolve the member's effective payment mode for THIS session's period,
    // their per-session payment status, and whether this period's monthly dues
    // are in (seat lock follows money — an unpaid monthly member can't register).
    const period = currentPeriod(activitySession.date);
    // No rate covering the Period is a broken invariant (dues-rate.ts) — read
    // like the "no fee set" branch elsewhere, never a free Period. Resolved
    // against this session's own Period (`period` above), the same Period the
    // membership/payment gate below is read against, not necessarily "today".
    const duesAmount =
        resolveDuesRate(activitySession.activity.duesRates, period) ?? 0;
    const [membership, sessionPayment, monthlyPayment, mySeat] =
        await Promise.all([
            prisma.membership.findUnique({
                where: {
                    userId_activityId: {
                        userId: authSession.user.id,
                        activityId: activitySession.activityId,
                    },
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
                where: {
                    userId: authSession.user.id,
                    sessionId: activitySession.id,
                    type: 'SESSION',
                },
                select: { status: true, notes: true },
            }),
            prisma.payment.findFirst({
                where: {
                    userId: authSession.user.id,
                    activityId: activitySession.activityId,
                    type: 'MONTHLY',
                    month: period.month,
                    year: period.year,
                    status: { in: ['PENDING', 'CONFIRMED'] },
                },
                select: { id: true },
            }),
            // The reader's own row, read directly rather than picked out of the
            // participants list: that list filters ABSENT out (an Opted Out row
            // is not a Participant), which is exactly the state the header and
            // the forfeit sentence below have to be able to see.
            prisma.attendance.findUnique({
                where: {
                    userId_sessionId: {
                        userId: authSession.user.id,
                        sessionId: activitySession.id,
                    },
                },
                select: { status: true, holdExpiresAt: true },
            }),
        ]);
    const offered = {
        allowsMonthly: activitySession.activity.allowsMonthly,
        allowsPerSession: activitySession.activity.allowsPerSession,
    };
    // Non-members may register too (join-on-register), so a missing membership
    // resolves like an unselected one: the offered set decides — a single
    // offered mode auto-applies, both-offered stays null until the join dialog.
    const effectiveMode = membership?.isActive
        ? resolvePaymentMode(membership, offered, period.month, period.year)
        : singleOfferedMode(offered);

    // A queued mode switch that hasn't reached this session's period yet: surface
    // it so a switch on an already-paid period doesn't read as a silent no-op
    // (the CTA price stays the same until the switch's period arrives).
    const pendingSwitchNote =
        membership?.pendingMode &&
        membership.pendingEffectiveFrom &&
        toPeriodKey(period.month, period.year) < membership.pendingEffectiveFrom
            ? t.sessions.modeSwitchPending
                  .replace(
                      '{mode}',
                      membership.pendingMode === 'MONTHLY'
                          ? t.paymentMode.monthly
                          : t.paymentMode.perSession,
                  )
                  .replace(
                      '{period}',
                      `${t.months[membership.pendingEffectiveFrom % 100]} ${Math.floor(membership.pendingEffectiveFrom / 100)}`,
                  )
            : null;

    const [quotas, settings] = await Promise.all([
        getSessionQuotas([activitySession]),
        getSettings(),
    ]);
    const quota = quotas.get(activitySession.id);
    const whatsapp =
        activitySession.activity.adminWhatsapp || settings.adminWhatsapp || '';

    const rsvpStatus = mySeat?.status ?? null;
    // "Registered" means holding a seat — a MAYBE row is a tentative RSVP that
    // does not, so it isn't treated as registered for capacity/CTA purposes.
    const isRegistered =
        rsvpStatus === 'REGISTERED' || rsvpStatus === 'PRESENT';
    // A Dues member who released this Seat forfeited the Session: monthly Dues
    // buy availability for the month, not a per-Session credit, so nothing is
    // owed back. `releaseSessionSeat` keeps the row as ABSENT in exactly this
    // case, which is why the three facts together are the whole test.
    const hasForfeitedSeat =
        rsvpStatus === 'ABSENT' &&
        effectiveMode === 'MONTHLY' &&
        monthlyPayment !== null;
    const isFull =
        activitySession._count.attendances >= activitySession.maxPlayers;
    const isFreeSession = activitySession.fee === 0;
    const rsvpClosed = isRsvpClosed(
        activitySession.date,
        activitySession.startTime,
    );
    const rsvpCloseLabel = format(
        rsvpCloseAt(activitySession.date, activitySession.startTime),
        'EEE, d MMM HH:mm',
        { locale: dateLocale },
    );

    const attendeeCount = activitySession._count.attendances;
    const fillPercent = Math.min(
        (attendeeCount / activitySession.maxPlayers) * 100,
        100,
    );
    const players: PlayerItem[] = activitySession.attendances.map((a) => ({
        id: a.id,
        name: a.user.name ?? '—',
        initials:
            a.user.name
                ?.split(' ')
                .slice(0, 2)
                .map((n) => n[0])
                .join('')
                .toUpperCase() ?? '?',
        image: a.user.image ?? '',
        status: a.status,
        isYou: a.userId === authSession.user.id,
    }));

    return (
        <div className={COLUMN_MEASURE}>
            {/* Back header */}
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

            <div className='space-y-4'>
                {/* The header is the Slot Cell — one Session, drawn one way,
                    wherever it appears. */}
                <SessionDetailHeader
                    session={{
                        title: activitySession.title,
                        date: activitySession.date,
                        startTime: activitySession.startTime,
                        endTime: activitySession.endTime,
                        location: activitySession.location,
                        activityName: activitySession.activity.name,
                        status: activitySession.status,
                        ownStatus: rsvpStatus,
                        seats: {
                            free: Math.max(
                                activitySession.maxPlayers - attendeeCount,
                                0,
                            ),
                            max: activitySession.maxPlayers,
                        },
                        quota: quota ?? null,
                    }}
                    t={t}
                />

                {/* Only what the header above cannot say — never the times, the
                    venue or the quota a second time. */}
                <SessionFacts
                    session={{
                        dateLabel: sessionDateLabel(activitySession.date, t),
                        startTime: activitySession.startTime,
                        endTime: activitySession.endTime,
                        location: activitySession.location,
                        fee: activitySession.fee,
                        notes: activitySession.notes,
                    }}
                    t={t}
                />

                {/* RSVP card */}
                <div className='rounded-sm border border-rule bg-tile p-block space-y-3'>
                    <div className='flex items-baseline justify-between gap-2'>
                        <h2 className='font-semibold text-foreground'>
                            {t.sessions.areYouPlaying}
                        </h2>
                        <span className='shrink-0 text-xs text-muted-foreground'>
                            {t.sessions.rsvpCloses} {rsvpCloseLabel}
                        </span>
                    </div>
                    <RSVPButton
                        sessionId={activitySession.id}
                        activityId={activitySession.activityId}
                        isRegistered={isRegistered}
                        isFull={isFull && !isRegistered}
                        isCancelled={activitySession.status === 'CANCELLED'}
                        isCompleted={activitySession.status === 'COMPLETED'}
                        isRsvpClosed={rsvpClosed}
                        isFreeSession={isFreeSession}
                        rsvpStatus={rsvpStatus}
                        paymentMode={effectiveMode}
                        allowsBothModes={
                            offered.allowsMonthly && offered.allowsPerSession
                        }
                        sessionFee={activitySession.fee}
                        duesAmount={duesAmount}
                        hasMonthlyPaid={monthlyPayment !== null}
                        sessionPaymentStatus={sessionPayment?.status ?? null}
                        sessionPaymentNotes={sessionPayment?.notes ?? null}
                        holdExpiresAtISO={
                            mySeat?.holdExpiresAt?.toISOString() ?? null
                        }
                        adminWhatsapp={whatsapp}
                    />
                    {hasForfeitedSeat && (
                        <p className='text-center text-xs text-muted-foreground'>
                            {t.sessions.duesForfeited}
                        </p>
                    )}
                    {pendingSwitchNote && (
                        <p className='text-center text-xs text-muted-foreground'>
                            {pendingSwitchNote}
                        </p>
                    )}
                    {whatsapp && (
                        <WhatsappButton
                            phone={whatsapp}
                            label={t.sessions.contactAdmin}
                        />
                    )}
                </div>

                {/* Players card */}
                <div className='rounded-sm border border-rule bg-tile p-block'>
                    <div className='flex items-center justify-between mb-3'>
                        <h2 className='font-semibold text-foreground'>
                            {t.sessions.playersLabel}
                        </h2>
                        <p className='text-[13px] font-semibold text-foreground tabular-nums'>
                            {attendeeCount}
                            <span className='font-normal text-subtle-foreground'>
                                /{activitySession.maxPlayers}
                            </span>
                        </p>
                    </div>
                    <div className='mb-3 h-[5px] rounded-full bg-muted overflow-hidden'>
                        <div
                            className='h-full rounded-full bg-primary'
                            style={{ width: `${fillPercent}%` }}
                        />
                    </div>
                    {players.length === 0 ? (
                        <p className='text-sm text-muted-foreground text-center py-4'>
                            {t.sessions.noAttendees}
                        </p>
                    ) : (
                        <PlayerList
                            players={players}
                            youLabel={locale === 'id' ? 'Kamu' : 'you'}
                            showAllTemplate={t.sessions.showAllPlayers}
                            chipLabels={t.chips}
                        />
                    )}
                </div>

                {/* Share session card */}
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
