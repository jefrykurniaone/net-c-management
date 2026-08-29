import 'server-only';
import {
    PaymentType,
    Role,
    type PaymentMode,
    type PaymentStatus,
    type Prisma,
} from '@prisma/client';
import { ADMITTED_MEMBER_WHERE } from '@/lib/admission';
import { pickPeriodPaymentStatus } from '@/lib/membership-mode-view';
import {
    resolveMembershipStanding,
    type DuesStanding,
} from '@/lib/member-standing';
import { resolveOwnerVisibility } from '@/lib/owner-visibility';
import { currentPeriod, type BillingPeriod } from '@/lib/payment-mode';
import { prisma } from '@/lib/prisma';

/**
 * Everything the Members register reads, and the one place the Owner contact
 * rule is applied.
 *
 * Withholding happens **here**, on the server, not in the cell that draws it: a
 * component that received the Owner's number and chose not to render it would
 * still have shipped the number to the browser, where the rule is one devtools
 * panel away from being broken. The row an Admin receives has no Owner contact
 * value in it at all (docs/owner-role-immutability.md, rule 2).
 */

/** One Membership as the register draws it: the Activity, its mode, its standing. */
export type MembershipCell = Readonly<{
    activityId: string;
    activityName: string;
    mode: PaymentMode | null;
    standing: DuesStanding;
}>;

export type MemberRow = Readonly<{
    id: string;
    name: string | null;
    /** Null where withheld — see the note above; never merely unrendered. */
    email: string | null;
    phone: string | null;
    role: Role;
    isActive: boolean;
    /** Whether this row's contact details were withheld from this viewer. */
    isContactWithheld: boolean;
    /** An Owner account: refused every modification, by anyone. */
    isImmutable: boolean;
    memberships: readonly MembershipCell[];
}>;

const MEMBER_SELECT = {
    id: true,
    name: true,
    email: true,
    phone: true,
    role: true,
    isActive: true,
    memberships: {
        where: { isActive: true, activity: { isActive: true } },
        orderBy: { joinedAt: 'asc' },
        select: {
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
                },
            },
        },
    },
} as const;

type MemberRecord = Prisma.UserGetPayload<{ select: typeof MEMBER_SELECT }>;

type PeriodPayment = Readonly<{
    activityId: string;
    status: PaymentStatus;
}>;

/** What the page parsed out of the query string, already sanitised. */
export type MemberQuery = Readonly<{
    search: string;
    activityId: string;
    orderBy: Prisma.UserOrderByWithRelationInput;
    skip: number | undefined;
    take: number | undefined;
}>;

/**
 * Search by name always; by email only where the email is not being withheld
 * from this viewer.
 *
 * A filter that matches on a value the row refuses to show is an oracle for it:
 * an Admin types one character at a time and watches the Owner row appear or
 * vanish, and recovers the address the cell would not print. So the email arm
 * skips Owner rows for anybody but an Owner — the Owner is still findable by
 * name, which is the one identifier this surface does show.
 */
function searchWhere(search: string, viewerRole: Role): Prisma.UserWhereInput {
    if (!search) {
        return {};
    }
    const like = { contains: search, mode: 'insensitive' as const };
    const byEmail: Prisma.UserWhereInput =
        viewerRole === Role.OWNER
            ? { email: like }
            : { email: like, role: { not: Role.OWNER } };
    return { OR: [{ name: like }, byEmail] };
}

/**
 * Admitted people only. An Applicant is not a Member — they hold Memberships
 * picked while completing their profile, and none of them mean anything until
 * an Admin lets them in, so the roster selects on `admittedAt` and the
 * admission queue keeps its own surface.
 */
function buildWhere(query: MemberQuery, viewerRole: Role): Prisma.UserWhereInput {
    const activity = query.activityId
        ? {
              memberships: {
                  some: { activityId: query.activityId, isActive: true },
              },
          }
        : {};
    return {
        ...ADMITTED_MEMBER_WHERE,
        ...searchWhere(query.search, viewerRole),
        ...activity,
    };
}

/**
 * The monthly Payments standing against the current Billing Period for
 * everybody on this page, in one query rather than one per row. Prisma's `in`
 * filter takes an explicitly typed array; a `readonly` one does not satisfy it.
 */
async function loadPeriodPayments(
    userIds: string[],
    period: BillingPeriod,
): Promise<Map<string, PeriodPayment[]>> {
    if (userIds.length === 0) {
        return new Map();
    }
    const rows = await prisma.payment.findMany({
        where: {
            userId: { in: userIds },
            type: PaymentType.MONTHLY,
            month: period.month,
            year: period.year,
        },
        select: { userId: true, activityId: true, status: true },
    });
    const byUser = new Map<string, PeriodPayment[]>();
    for (const row of rows) {
        const held = byUser.get(row.userId) ?? [];
        held.push({ activityId: row.activityId, status: row.status });
        byUser.set(row.userId, held);
    }
    return byUser;
}

function toMembershipCells(
    user: MemberRecord,
    payments: readonly PeriodPayment[],
    period: BillingPeriod,
): MembershipCell[] {
    const statusByActivity = pickPeriodPaymentStatus(payments);
    return user.memberships.map((membership) => ({
        activityId: membership.activity.id,
        activityName: membership.activity.name,
        ...resolveMembershipStanding(
            {
                membership,
                offered: membership.activity,
                periodStatus:
                    statusByActivity.get(membership.activity.id) ?? null,
            },
            period,
        ),
    }));
}

function toRow(
    user: MemberRecord,
    payments: readonly PeriodPayment[],
    period: BillingPeriod,
    viewerRole: Role,
): MemberRow {
    return {
        id: user.id,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        ...resolveOwnerVisibility(user, viewerRole),
        memberships: toMembershipCells(user, payments, period),
    };
}

/** The page's whole read: the rows it draws and the count it pages against. */
export async function loadMembers(
    query: MemberQuery,
    viewerRole: Role,
    now: Date,
): Promise<{ rows: MemberRow[]; total: number }> {
    const where = buildWhere(query, viewerRole);
    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            orderBy: query.orderBy,
            skip: query.skip,
            take: query.take,
            select: MEMBER_SELECT,
        }),
        prisma.user.count({ where }),
    ]);

    const period = currentPeriod(now);
    const userIds: string[] = users.map((user) => user.id);
    const paymentsByUser = await loadPeriodPayments(userIds, period);

    return {
        rows: users.map((user) =>
            toRow(user, paymentsByUser.get(user.id) ?? [], period, viewerRole),
        ),
        total,
    };
}
