import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import { format } from 'date-fns';
import { id as localeId, enUS } from 'date-fns/locale';
import { sessionStatusVariant } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { EkskulBadge } from '@/components/ekskul/ekskul-badge';
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
import { resolvePaymentMode, currentPeriod } from '@/lib/payment-mode';

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
            ekskul: {
                select: {
                    id: true,
                    name: true,
                    color: true,
                    allowsMonthly: true,
                    allowsPerSession: true,
                },
            },
            attendances: {
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
            _count: { select: { attendances: true } },
        },
    });

    if (!activitySession) notFound();

    // Resolve the member's effective payment mode for THIS session's period and
    // their per-session payment status, so the CTA can switch to register-&-pay.
    const [membership, sessionPayment] = await Promise.all([
        prisma.membership.findUnique({
            where: {
                userId_ekskulId: {
                    userId: authSession.user.id,
                    ekskulId: activitySession.ekskulId,
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
            select: { status: true },
        }),
    ]);

    const period = currentPeriod(activitySession.date);
    const effectiveMode =
        membership?.isActive
            ? resolvePaymentMode(
                  membership,
                  {
                      allowsMonthly: activitySession.ekskul.allowsMonthly,
                      allowsPerSession: activitySession.ekskul.allowsPerSession,
                  },
                  period.month,
                  period.year,
              )
            : null;

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
                        <EkskulBadge
                            name={activitySession.ekskul.name}
                            color={activitySession.ekskul.color}
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
                    isRegistered={isRegistered}
                    isFull={isFull && !isRegistered}
                    isCancelled={activitySession.status === 'CANCELLED'}
                    isCompleted={activitySession.status === 'COMPLETED'}
                    paymentMode={effectiveMode}
                    sessionFee={activitySession.fee}
                    sessionPaymentStatus={sessionPayment?.status ?? null}
                />
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
