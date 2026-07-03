import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import { format } from 'date-fns';
import { id as localeId, enUS } from 'date-fns/locale';
import { sessionStatusVariant } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ActivityBadge } from '@/components/activity/activity-badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { RSVPButton } from '@/components/sessions/rsvp-button';
import {
    ArrowLeft,
    MapPin,
    Clock,
    Users,
    Banknote,
    FileText,
} from 'lucide-react';
import Link from 'next/link';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import {
    resolvePaymentMode,
    singleOfferedMode,
    currentPeriod,
} from '@/lib/payment-mode';
import { getSessionQuotas } from '@/lib/recurring-sessions';
import { getSettings } from '@/lib/settings';
import { WhatsappButton } from '@/components/sessions/whatsapp-button';

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
                // markers, not participants — hide them from the list.
                where: { status: { in: ['REGISTERED', 'PRESENT'] } },
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
    const isRegistered = !!myAttendance;
    const isFull =
        activitySession._count.attendances >= activitySession.maxPlayers;
    return (
        <div className='max-w-2xl mx-auto space-y-6'>
            {/* Back */}
            <Link
                href='/sessions'
                className='inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground'>
                <ArrowLeft className='w-4 h-4' />
                {t.sessions.backToList}
            </Link>

            {/* Header */}
            <div className='bg-card rounded-xl border border-border p-6 space-y-4'>
                <div className='flex items-start justify-between gap-3'>
                    <div className='space-y-2'>
                        <h1 className='text-xl font-bold text-foreground'>
                            {activitySession.title}
                        </h1>
                        <ActivityBadge
                            name={activitySession.activity.name}
                            color={activitySession.activity.color}
                        />
                    </div>
                    <Badge
                        variant={sessionStatusVariant(activitySession.status)}
                    >
                        {t.sessionStatus[activitySession.status]}
                    </Badge>
                </div>

                <div className='space-y-2 text-sm text-muted-foreground'>
                    <div className='flex items-center gap-2'>
                        <Clock className='w-4 h-4 shrink-0 text-muted-foreground' />
                        <span>
                            {format(
                                new Date(activitySession.date),
                                'EEEE, d MMMM yyyy',
                                {
                                    locale: dateLocale,
                                },
                            )}{' '}
                            · {activitySession.startTime} –{' '}
                            {activitySession.endTime}
                        </span>
                    </div>
                    <div className='flex items-center gap-2'>
                        <MapPin className='w-4 h-4 shrink-0 text-muted-foreground' />
                        <span>{activitySession.location}</span>
                    </div>
                    <div className='flex items-center gap-2'>
                        <Users className='w-4 h-4 shrink-0 text-muted-foreground' />
                        <span className='tabular-nums'>
                            {activitySession._count.attendances}/
                            {activitySession.maxPlayers}
                        </span>
                        <span>{t.sessions.participants}</span>
                        {isFull && (
                            <Badge variant='secondary' className='text-xs ml-1'>
                                {t.sessions.full}
                            </Badge>
                        )}
                    </div>
                    {quota && quota.needed > 0 && (
                        <div className='flex items-center gap-2'>
                            <Users className='w-4 h-4 shrink-0 text-muted-foreground' />
                            <span className='tabular-nums'>
                                {quota.committed}/{quota.needed}
                            </span>
                            <span>{t.sessions.quotaLabel}</span>
                            <Badge
                                variant='outline'
                                className={
                                    quota.isMet
                                        ? 'text-success border-success/40 text-xs'
                                        : 'text-warning border-warning/40 text-xs'
                                }>
                                {quota.isMet
                                    ? t.sessions.quotaMet
                                    : t.sessions.quotaNeedMore.replace(
                                          '{n}',
                                          String(quota.needed - quota.committed),
                                      )}
                            </Badge>
                        </div>
                    )}
                    {activitySession.fee > 0 && (
                        <div className='flex items-center gap-2'>
                            <Banknote className='w-4 h-4 shrink-0 text-muted-foreground' />
                            <span>
                                <span className='tabular-nums'>
                                    Rp{' '}
                                    {activitySession.fee.toLocaleString('id-ID')}
                                </span>
                                {t.sessions.feePerPerson}
                            </span>
                        </div>
                    )}
                    {activitySession.notes && (
                        <div className='flex items-start gap-2'>
                            <FileText className='w-4 h-4 shrink-0 text-muted-foreground mt-0.5' />
                            <span className='whitespace-pre-wrap'>
                                {activitySession.notes}
                            </span>
                        </div>
                    )}
                </div>

                <RSVPButton
                    sessionId={activitySession.id}
                    activityId={activitySession.activityId}
                    isRegistered={isRegistered}
                    isFull={isFull && !isRegistered}
                    isCancelled={activitySession.status === 'CANCELLED'}
                    isCompleted={activitySession.status === 'COMPLETED'}
                    paymentMode={effectiveMode}
                    allowsBothModes={
                        offered.allowsMonthly && offered.allowsPerSession
                    }
                    sessionFee={activitySession.fee}
                    monthlyFee={activitySession.activity.monthlyFee}
                    hasMonthlyPaid={monthlyPayment !== null}
                    sessionPaymentStatus={sessionPayment?.status ?? null}
                    sessionPaymentNotes={sessionPayment?.notes ?? null}
                    adminWhatsapp={whatsapp}
                />

                {whatsapp && (
                    <WhatsappButton
                        phone={whatsapp}
                        label={t.sessions.contactAdmin}
                    />
                )}
            </div>

            {/* Participants list */}
            <div className='bg-card rounded-xl border border-border p-6'>
                <h2 className='font-semibold text-foreground mb-4'>
                    {t.sessions.attendeeList} ({activitySession._count.attendances})
                </h2>
                {activitySession.attendances.length === 0 ? (
                    <p className='text-sm text-muted-foreground text-center py-4'>
                        {t.sessions.noAttendees}
                    </p>
                ) : (
                    <div className='space-y-3'>
                        {activitySession.attendances.map((attendance, i) => {
                            const initials =
                                attendance.user.name
                                    ?.split(' ')
                                    .slice(0, 2)
                                    .map((n) => n[0])
                                    .join('')
                                    .toUpperCase() ?? '?';
                            return (
                                <div key={attendance.id}>
                                    <div className='flex items-center gap-3'>
                                        <span className='text-xs text-muted-foreground w-5 text-right tabular-nums'>
                                            {i + 1}
                                        </span>
                                        <Avatar className='w-8 h-8'>
                                            <AvatarImage
                                                src={
                                                    attendance.user.image ?? ''
                                                }
                                                alt=''
                                            />
                                            <AvatarFallback className='text-xs bg-primary/10 text-primary'>
                                                {initials}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className='flex-1 min-w-0'>
                                            <p className='text-sm font-medium text-foreground truncate'>
                                                {attendance.user.name ?? '—'}
                                                {attendance.userId ===
                                                    authSession.user.id && (
                                                    <span className='text-xs text-primary ml-1'>
                                                        ({locale === 'id' ? 'Kamu' : 'you'})
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        <Badge
                                            variant={(() => {
                                                if (
                                                    attendance.status ===
                                                    'PRESENT'
                                                )
                                                    return 'default';
                                                if (
                                                    attendance.status ===
                                                    'ABSENT'
                                                )
                                                    return 'destructive';
                                                return 'secondary';
                                            })()}
                                            className='text-xs'>
                                            {
                                                t.attendanceStatus[attendance.status]
                                            }
                                        </Badge>
                                    </div>
                                    {i <
                                        activitySession.attendances.length -
                                            1 && <Separator className='mt-3' />}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
