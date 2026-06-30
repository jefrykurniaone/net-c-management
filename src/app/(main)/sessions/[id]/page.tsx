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
            ekskul: { select: { id: true, name: true, color: true } },
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
                className='inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700'>
                <ArrowLeft className='w-4 h-4' />
                {t.sessions.backToList}
            </Link>

            {/* Header */}
            <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6 space-y-4'>
                <div className='flex items-start justify-between gap-3'>
                    <div className='space-y-2'>
                        <h1 className='text-xl font-bold text-gray-900 dark:text-white'>
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

                <div className='space-y-2 text-sm text-gray-600 dark:text-gray-400'>
                    <div className='flex items-center gap-2'>
                        <Clock className='w-4 h-4 shrink-0 text-gray-400' />
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
                        <MapPin className='w-4 h-4 shrink-0 text-gray-400' />
                        <span>{activitySession.location}</span>
                    </div>
                    <div className='flex items-center gap-2'>
                        <Users className='w-4 h-4 shrink-0 text-gray-400' />
                        <span>
                            {activitySession._count.attendances}/
                            {activitySession.maxPlayers} {t.sessions.participants}
                        </span>
                        {isFull && (
                            <Badge variant='secondary' className='text-xs ml-1'>
                                {t.sessions.full}
                            </Badge>
                        )}
                    </div>
                    {activitySession.fee > 0 && (
                        <div className='flex items-center gap-2'>
                            <Banknote className='w-4 h-4 shrink-0 text-gray-400' />
                            <span>
                                Rp{' '}
                                {activitySession.fee.toLocaleString('id-ID')}
                                {t.sessions.feePerPerson}
                            </span>
                        </div>
                    )}
                    {activitySession.notes && (
                        <div className='flex items-start gap-2'>
                            <FileText className='w-4 h-4 shrink-0 text-gray-400 mt-0.5' />
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
                />
            </div>

            {/* Participants list */}
            <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6'>
                <h2 className='font-semibold text-gray-900 dark:text-white mb-4'>
                    {t.sessions.attendeeList} ({activitySession._count.attendances})
                </h2>
                {activitySession.attendances.length === 0 ? (
                    <p className='text-sm text-gray-400 text-center py-4'>
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
                                        <span className='text-xs text-gray-400 w-5 text-right'>
                                            {i + 1}
                                        </span>
                                        <Avatar className='w-8 h-8'>
                                            <AvatarImage
                                                src={
                                                    attendance.user.image ?? ''
                                                }
                                                alt=''
                                            />
                                            <AvatarFallback className='text-xs bg-green-100 text-green-700'>
                                                {initials}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className='flex-1 min-w-0'>
                                            <p className='text-sm font-medium text-gray-900 dark:text-white truncate'>
                                                {attendance.user.name ?? '—'}
                                                {attendance.userId ===
                                                    authSession.user.id && (
                                                    <span className='text-xs text-green-600 ml-1'>
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
