import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { id as localeId, enUS } from 'date-fns/locale';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { ProfilePanel } from './profile-panel';

// Month-year is formatted server-side so the client never ships a date-fns
// locale bundle; a language switch re-renders this Server Component via
// router.refresh(), which re-derives the labels in the new locale.
const MONTH_YEAR = 'MMM yyyy';

export default async function ProfilePage() {
    const [session, locale] = await Promise.all([auth(), getLocale()]);
    if (!session?.user?.id) redirect('/auth/signin');

    const t = getDictionary(locale);
    const dateLocale = locale === 'id' ? localeId : enUS;

    const [user, memberships] = await Promise.all([
        prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                name: true,
                email: true,
                image: true,
                phone: true,
                createdAt: true,
            },
        }),
        prisma.membership.findMany({
            where: { userId: session.user.id, isActive: true },
            orderBy: { joinedAt: 'asc' },
            select: {
                joinedAt: true,
                activity: { select: { id: true, name: true, color: true } },
            },
        }),
    ]);

    if (!user) redirect('/auth/signin');

    return (
        <div className='max-w-lg space-y-6'>
            <h1 className='text-2xl font-bold text-foreground'>
                {t.profile.title}
            </h1>
            <ProfilePanel
                user={{
                    name: user.name,
                    email: user.email,
                    image: user.image,
                    phone: user.phone,
                }}
                memberSinceDate={format(user.createdAt, MONTH_YEAR, {
                    locale: dateLocale,
                })}
                memberships={memberships.map((m) => ({
                    activityId: m.activity.id,
                    name: m.activity.name,
                    color: m.activity.color,
                    joinedDate: format(m.joinedAt, MONTH_YEAR, {
                        locale: dateLocale,
                    }),
                }))}
            />
        </div>
    );
}
