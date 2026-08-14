import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { id as localeId, enUS } from 'date-fns/locale';
import { getSettings } from '@/lib/settings';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { ActivityBadge } from '@/components/activity/activity-badge';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Users, CalendarDays } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';
import Image from 'next/image';

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    const session = await prisma.activitySession.findUnique({
        where: { id },
        select: {
            title: true,
            date: true,
            startTime: true,
            location: true,
            maxPlayers: true,
            activity: { select: { name: true } },
            _count: {
                select: {
                    attendances: {
                        where: { status: { in: ['REGISTERED', 'PRESENT'] } },
                    },
                },
            },
        },
    });

    if (!session) return { title: 'Session not found' };

    const dateStr = format(new Date(session.date), 'EEE, d MMM yyyy');
    const spotsLeft = session.maxPlayers - session._count.attendances;

    return {
        title: `${session.title} — ${session.activity.name}`,
        description: `${dateStr} · ${session.startTime} · ${session.location} · ${spotsLeft} spots left`,
        openGraph: {
            title: `${session.title} — ${session.activity.name}`,
            description: `${dateStr} · ${session.startTime} · ${session.location} · ${spotsLeft} spots left`,
            type: 'website',
        },
        twitter: {
            card: 'summary',
            title: `${session.title} — ${session.activity.name}`,
            description: `${dateStr} · ${session.startTime} · ${session.location}`,
        },
    };
}

export default async function PublicSessionPage({
    params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
    const { id } = await params;
    const [locale, settings] = await Promise.all([getLocale(), getSettings()]);
    const t = getDictionary(locale);
    const dateLocale = locale === 'id' ? localeId : enUS;

    const activitySession = await prisma.activitySession.findUnique({
        where: { id },
        select: {
            id: true,
            title: true,
            date: true,
            startTime: true,
            endTime: true,
            location: true,
            maxPlayers: true,
            notes: true,
            status: true,
            activity: {
                select: { name: true, color: true },
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

    const registered = activitySession._count.attendances;
    const max = activitySession.maxPlayers;
    const isFull = registered >= max;
    const fillPct = Math.min(100, Math.round((registered / max) * 100));

    const dateStr = format(new Date(activitySession.date), 'EEEE, d MMMM yyyy', {
        locale: dateLocale,
    });

    const callbackUrl = encodeURIComponent(`/sessions/${id}`);

    return (
        <div className='min-h-screen bg-background flex flex-col'>
            {/* Top bar */}
            <header className='border-b border-border px-5 py-3.5 flex items-center justify-between'>
                <span className='text-[15px] font-bold text-foreground'>
                    {settings.communityName}
                </span>
                {settings.logoUrl && (
                    <Image
                        src={settings.logoUrl}
                        alt={settings.communityName}
                        width={32}
                        height={32}
                        className='rounded-md object-contain'
                    />
                )}
            </header>

            {/* Card */}
            <main className='flex-1 flex items-start justify-center px-4 py-12'>
                <div className='w-full max-w-md bg-card border border-border rounded-2xl overflow-hidden shadow-sm'>
                    <div className='px-6 pt-6 pb-4 space-y-4'>
                        <ActivityBadge
                            name={activitySession.activity.name}
                            color={activitySession.activity.color}
                        />
                        <h1 className='text-2xl font-bold text-foreground leading-tight'>
                            {activitySession.title}
                        </h1>

                        <div className='space-y-2.5 text-sm text-muted-foreground'>
                            <div className='flex items-center gap-2.5'>
                                <CalendarDays className='w-4 h-4 shrink-0' />
                                <span>{dateStr}</span>
                            </div>
                            <div className='flex items-center gap-2.5'>
                                <Clock className='w-4 h-4 shrink-0' />
                                <span>
                                    {activitySession.startTime}
                                    {activitySession.endTime
                                        ? ` – ${activitySession.endTime}`
                                        : ''}
                                </span>
                            </div>
                            <div className='flex items-center gap-2.5'>
                                <MapPin className='w-4 h-4 shrink-0' />
                                <span>{activitySession.location}</span>
                            </div>
                            <div className='flex items-center gap-2.5'>
                                <Users className='w-4 h-4 shrink-0' />
                                <span>
                                    {isFull
                                        ? t.sessions.publicPageFull
                                        : (t.sessions.publicPageSpots
                                              .replace('{n}', String(registered))
                                              .replace('{max}', String(max)))}
                                </span>
                            </div>
                        </div>

                        {/* Spots progress bar */}
                        <div className='space-y-1.5'>
                            <div className='h-2 w-full rounded-full bg-muted overflow-hidden'>
                                <div
                                    className='h-full rounded-full transition-all'
                                    style={{
                                        width: `${fillPct}%`,
                                        backgroundColor: activitySession.activity.color,
                                    }}
                                />
                            </div>
                            <p className='text-xs text-muted-foreground text-right'>
                                {registered} / {max}
                            </p>
                        </div>
                    </div>

                    <div className='px-6 pb-6'>
                        <Link href={`/auth/signin?callbackUrl=${callbackUrl}`}>
                            <Button className='w-full' size='lg'>
                                {t.sessions.publicPageRsvpCta}
                            </Button>
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
