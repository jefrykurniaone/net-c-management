import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import { format } from 'date-fns';
import { id as localeId, enUS } from 'date-fns/locale';
import { Mark, StateMark, MarkedValue } from '@/components/ui/mark';
import { ActivityBadge } from '@/components/activity/activity-badge';
import { RSVPButton } from '@/components/sessions/rsvp-button';
import { PlayerList, type PlayerItem } from '@/components/sessions/player-list';
import {
    ArrowLeft,
    MapPin,
    Clock,
    Users,
    CalendarDays,
    CreditCard,
    FileText,
} from 'lucide-react';
import Link from 'next/link';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import {
    resolvePaymentMode,
    singleOfferedMode,
    currentPeriod,
    toPeriodKey,
} from '@/lib/payment-mode';
import { getSessionQuotas } from '@/lib/recurring-sessions';
import { getSettings } from '@/lib/settings';
import { WhatsappButton } from '@/components/sessions/whatsapp-button';
import { ShareSessionCard } from '@/components/sessions/share-session-card';
import { isRsvpClosed, rsvpCloseAt } from '@/lib/rsvp';

const MINUTES_PER_HOUR = 60;

/** "19:00" + "21:00" → "2 hours" (or "1.5 hours"); empty when unparseable. */
function formatDuration(
    start: string,
    end: string,
    hourLabel: string,
    hoursLabel: string,
): string {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const minutes =
        endH * MINUTES_PER_HOUR + endM - (startH * MINUTES_PER_HOUR + startM);
    if (!Number.isFinite(minutes) || minutes <= 0) return '';
    const hours = minutes / MINUTES_PER_HOUR;
    const value = Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
    return `${value} ${hours === 1 ? hourLabel : hoursLabel}`;
}

function mapsUrl(location: string): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        location,
    )}`;
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
                    color: true,
                    allowsMonthly: true,
                    allowsPerSession: true,
                    monthlyFee: true,
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
    const [membership, sessionPayment, monthlyPayment] = await Promise.all([
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

    const myAttendance = activitySession.attendances.find(
        (a) => a.userId === authSession.user.id,
    );
    const rsvpStatus = myAttendance?.status ?? null;
    // "Registered" means holding a seat — a MAYBE row is a tentative RSVP that
    // does not, so it isn't treated as registered for capacity/CTA purposes.
    const isRegistered =
        rsvpStatus === 'REGISTERED' || rsvpStatus === 'PRESENT';
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
    const dateFormat = locale === 'id' ? 'EEEE, d MMMM' : 'EEEE, MMMM d';
    const duration = formatDuration(
        activitySession.startTime,
        activitySession.endTime,
        t.sessions.durationHour,
        t.sessions.durationHours,
    );
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
        <div className='max-w-2xl mx-auto'>
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
                {/* Title */}
                <div className='space-y-2.5'>
                    <div className='flex items-center gap-2 flex-wrap'>
                        <ActivityBadge
                            name={activitySession.activity.name}
                            color={activitySession.activity.color}
                        />
                        <StateMark
                            state={{
                                domain: 'session',
                                status: activitySession.status,
                            }}
                            labels={t.marks}
                        />
                    </div>
                    <h1 className='text-2xl font-bold text-foreground leading-tight'>
                        <MarkedValue
                            state={{
                                domain: 'session',
                                status: activitySession.status,
                            }}>
                            {activitySession.title}
                        </MarkedValue>
                    </h1>
                </div>

                {/* Details card */}
                <div className='bg-card rounded-xl border border-border p-5 text-sm text-secondary-foreground divide-y divide-border'>
                    <div className='flex items-center gap-3 pb-3'>
                        <CalendarDays className='w-[18px] h-[18px] shrink-0 text-primary' />
                        <span className='text-foreground'>
                            {format(new Date(activitySession.date), dateFormat, {
                                locale: dateLocale,
                            })}
                        </span>
                    </div>
                    <div className='flex items-center gap-3 py-3'>
                        <Clock className='w-[18px] h-[18px] shrink-0 text-primary' />
                        <span className='tabular-nums text-foreground'>
                            {activitySession.startTime} –{' '}
                            {activitySession.endTime}
                            {duration && (
                                <span className='ml-1.5 text-muted-foreground'>
                                    ({duration})
                                </span>
                            )}
                        </span>
                    </div>
                    <div className='flex items-center gap-3 py-3'>
                        <MapPin className='w-[18px] h-[18px] shrink-0 text-primary' />
                        <span className='flex-1 text-foreground'>
                            {activitySession.location}
                        </span>
                        {activitySession.location && (
                            <a
                                href={mapsUrl(activitySession.location)}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='shrink-0 font-medium text-primary hover:underline'>
                                {t.sessions.mapLink}
                            </a>
                        )}
                    </div>
                    {activitySession.fee > 0 && (
                        <div className='flex items-center gap-3 py-3'>
                            <CreditCard className='w-[18px] h-[18px] shrink-0 text-primary' />
                            <span className='text-foreground'>
                                <span className='tabular-nums'>
                                    Rp{' '}
                                    {activitySession.fee.toLocaleString('id-ID')}
                                </span>
                                <span className='text-muted-foreground'>
                                    {t.sessions.perPlayer}
                                </span>
                            </span>
                        </div>
                    )}
                    {quota && quota.needed > 0 && (
                        <div className='flex items-center gap-3 py-3'>
                            <Users className='w-[18px] h-[18px] shrink-0 text-primary' />
                            <span className='tabular-nums'>
                                {quota.committed}/{quota.needed}
                            </span>
                            <span className='flex-1'>
                                {t.sessions.quotaLabel}
                            </span>
                            <Mark kind={quota.isMet ? 'ink' : 'tape'}>
                                {quota.isMet
                                    ? t.sessions.quotaMet
                                    : t.sessions.quotaNeedMore.replace(
                                          '{n}',
                                          String(quota.needed - quota.committed),
                                      )}
                            </Mark>
                        </div>
                    )}
                    {activitySession.notes && (
                        <div className='flex items-start gap-3 pt-3'>
                            <FileText className='w-[18px] h-[18px] shrink-0 text-primary mt-0.5' />
                            <span className='whitespace-pre-wrap'>
                                {activitySession.notes}
                            </span>
                        </div>
                    )}
                </div>

                {/* RSVP card */}
                <div className='bg-card rounded-xl border border-border p-5 space-y-3'>
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
                        monthlyFee={activitySession.activity.monthlyFee}
                        hasMonthlyPaid={monthlyPayment !== null}
                        sessionPaymentStatus={sessionPayment?.status ?? null}
                        sessionPaymentNotes={sessionPayment?.notes ?? null}
                        holdExpiresAtISO={
                            myAttendance?.holdExpiresAt?.toISOString() ?? null
                        }
                        adminWhatsapp={whatsapp}
                    />
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
                <div className='bg-card rounded-xl border border-border p-5'>
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
                            markLabels={t.marks}
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
