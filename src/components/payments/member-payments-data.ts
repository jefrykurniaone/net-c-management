import 'server-only';
import { prisma } from '@/lib/prisma';
import { getOutstandingSessionBills } from '@/lib/payments';
import type { BillingPeriod } from '@/lib/payment-mode';
import type { PaymentHistoryQuery } from '@/components/payments/payment-history-query';

/**
 * Every read the member Payments page makes, in one batch.
 *
 * **The batch is one unit and is never split.** Production caps the pool at
 * one connection per serverless function (`src/lib/prisma.ts`), so moving any
 * of these seven queries down into the section that draws it would turn one
 * batched round trip into several against a pool of one. The page composes
 * sections; this module owns the reads those sections are drawn from.
 *
 * The hold sweep (`releaseExpiredHolds`) stays in the page: it is a write, it
 * must run before these reads, and that ordering is worth seeing.
 */

export interface MemberPaymentsParams {
    readonly userId: string;
    /** The Billing Period the Dues cards are drawn for. */
    readonly period: BillingPeriod;
    readonly history: PaymentHistoryQuery;
}

export type MemberPaymentsData = Awaited<ReturnType<typeof loadMemberPayments>>;

export async function loadMemberPayments(params: MemberPaymentsParams) {
    const { userId, period, history } = params;

    const [
        historyPayments,
        historyTotal,
        memberships,
        monthPayments,
        outstandingBills,
        liveHolds,
        userActivities,
    ] = await Promise.all([
        prisma.payment.findMany({
            where: history.where,
            orderBy: { createdAt: 'desc' },
            skip: history.skip,
            take: history.take,
            include: {
                activity: {
                    select: { id: true, name: true, adminWhatsapp: true },
                },
            },
        }),
        prisma.payment.count({ where: history.where }),
        prisma.membership.findMany({
            where: { userId, isActive: true, activity: { isActive: true } },
            select: {
                paymentMode: true,
                effectiveFrom: true,
                pendingMode: true,
                pendingEffectiveFrom: true,
                activity: {
                    select: {
                        id: true,
                        name: true,
                        duesRates: { select: { amount: true, effectiveFrom: true } },
                        allowsMonthly: true,
                        allowsPerSession: true,
                    },
                },
            },
        }),
        prisma.payment.findMany({
            where: {
                userId,
                month: period.month,
                year: period.year,
                type: 'MONTHLY',
            },
            select: { activityId: true, status: true },
        }),
        getOutstandingSessionBills({ userId }),
        prisma.attendance.findMany({
            where: {
                userId,
                holdExpiresAt: { not: null },
                session: { status: { in: ['SCHEDULED', 'ONGOING'] } },
            },
            select: {
                holdExpiresAt: true,
                session: { select: { activityId: true } },
            },
        }),
        prisma.activity.findMany({
            where: {
                isActive: true,
                memberships: { some: { userId, isActive: true } },
            },
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
        }),
    ]);

    return {
        historyPayments,
        historyTotal,
        memberships,
        monthPayments,
        outstandingBills,
        liveHolds,
        userActivities,
    };
}
