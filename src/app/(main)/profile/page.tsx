import { auth } from '@/lib/auth';
import { COLUMN_MEASURE } from '@/components/layout/measure';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { id as localeId, enUS } from 'date-fns/locale';
import type { PaymentMode, PaymentStatus } from '@prisma/client';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary, type Dictionary } from '@/lib/i18n/dictionaries';
import { currentPeriod, type BillingPeriod } from '@/lib/payment-mode';
import {
    buildMembershipModeView,
    isLivePaymentStatus,
    pickPeriodPaymentStatus,
    type MembershipRowView,
} from '@/lib/membership-mode-view';
import { ProfilePanel } from './profile-panel';

// Month-year is formatted server-side so the client never ships a date-fns
// locale bundle; a language switch re-renders this Server Component via
// router.refresh(), which re-derives the labels in the new locale. The Billing
// Period sentences ride the same refresh, which is why they are built here
// rather than assembled on the client.
const MONTH_YEAR = 'MMM yyyy';

/** The Membership fields the mode resolver reads, plus what the row shows. */
const MEMBERSHIP_SELECT = {
    joinedAt: true,
    paymentMode: true,
    effectiveFrom: true,
    pendingMode: true,
    pendingEffectiveFrom: true,
    activity: {
        select: {
            id: true,
            name: true,
            allowsMonthly: true,
            allowsPerSession: true,
            monthlyFee: true,
            sessionFee: true,
        },
    },
} as const;

interface MembershipRecord {
    joinedAt: Date;
    paymentMode: PaymentMode | null;
    effectiveFrom: number;
    pendingMode: PaymentMode | null;
    pendingEffectiveFrom: number | null;
    activity: {
        id: string;
        name: string;
        allowsMonthly: boolean;
        allowsPerSession: boolean;
        monthlyFee: number;
        sessionFee: number;
    };
}

interface PeriodPaymentRecord {
    activityId: string;
    status: PaymentStatus;
}

/** Everything this surface reads, in one round trip. */
async function loadProfile(userId: string, period: BillingPeriod) {
    const [user, memberships, periodPayments] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId },
            select: {
                name: true,
                email: true,
                image: true,
                phone: true,
                createdAt: true,
            },
        }),
        prisma.membership.findMany({
            where: { userId, isActive: true },
            orderBy: { joinedAt: 'asc' },
            select: MEMBERSHIP_SELECT,
        }),
        // The Payments standing against the current Billing Period. This is the
        // same fact the write path gates a mode switch on, so the mark on a row
        // and the sentence beside its control can never disagree.
        prisma.payment.findMany({
            where: { userId, month: period.month, year: period.year },
            select: { activityId: true, status: true },
        }),
    ]);

    return { user, memberships, periodPayments };
}

/**
 * One Membership as the surface renders it. The Billing Period sentences are
 * derived here, on the server, from the resolver's own output — the page reads
 * that logic and never restates it, and no API response grows a field for it.
 */
function toRow(
    membership: MembershipRecord,
    periodStatus: PaymentStatus | null,
    now: Date,
    t: Dictionary,
    dateLocale: typeof enUS,
): MembershipRowView {
    const { activity } = membership;
    return {
        activityId: activity.id,
        name: activity.name,
        joinedDate: format(membership.joinedAt, MONTH_YEAR, {
            locale: dateLocale,
        }),
        periodPaymentStatus: periodStatus,
        mode: buildMembershipModeView(
            {
                membership,
                offered: activity,
                monthlyFee: activity.monthlyFee,
                sessionFee: activity.sessionFee,
                hasLivePaymentThisPeriod: isLivePaymentStatus(periodStatus),
            },
            now,
            t,
        ),
    };
}

/** Every Membership, each carrying the Payment that speaks for its period. */
function toRows(
    memberships: readonly MembershipRecord[],
    periodPayments: readonly PeriodPaymentRecord[],
    now: Date,
    t: Dictionary,
    dateLocale: typeof enUS,
): MembershipRowView[] {
    const statusByActivity = pickPeriodPaymentStatus(periodPayments);
    return memberships.map((membership) =>
        toRow(
            membership,
            statusByActivity.get(membership.activity.id) ?? null,
            now,
            t,
            dateLocale,
        ),
    );
}

export default async function ProfilePage() {
    const [session, locale] = await Promise.all([auth(), getLocale()]);
    if (!session?.user?.id) redirect('/auth/signin');

    const t = getDictionary(locale);
    const dateLocale = locale === 'id' ? localeId : enUS;
    const now = new Date();
    const { user, memberships, periodPayments } = await loadProfile(
        session.user.id,
        currentPeriod(now),
    );
    if (!user) redirect('/auth/signin');

    return (
        <div className={`${COLUMN_MEASURE} flex flex-col gap-bay`}>
            <h1 className='type-display text-foreground'>{t.profile.title}</h1>
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
                memberships={toRows(
                    memberships,
                    periodPayments,
                    now,
                    t,
                    dateLocale,
                )}
            />
        </div>
    );
}
