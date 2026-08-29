import 'server-only';
import type { PaymentMode, PaymentStatus, Role } from '@prisma/client';
import { ADMIN_SETTABLE_STATUSES } from '@/lib/attendance-admin';
import { resolveOwnerVisibility } from '@/lib/owner-visibility';
import { currentPeriod, resolvePaymentMode } from '@/lib/payment-mode';
import { prisma } from '@/lib/prisma';
import type {
    AttendanceRegisterData,
    AttendanceRegisterRow,
    MoneyStanding,
} from './attendance-view';

/**
 * What one attendance register is built from: who holds or held a Seat on this
 * Session, how they pay for the Activity, and whether their money for this
 * Session is actually behind them.
 *
 * The read only. Nothing here decides a payment mode or a period — both come
 * from `src/lib/payment-mode.ts`, the one resolver — and nothing here writes.
 * The shapes it returns are `attendance-view.ts`, which the client component
 * reads too; nothing importable from here may ever reach the browser bundle.
 */

/** A member with no Membership row still resolves through the offered set. */
const NO_MEMBERSHIP = {
    paymentMode: null,
    effectiveFrom: 0,
    pendingMode: null,
    pendingEffectiveFrom: null,
};

/**
 * The Session and its seat-holding rows. `MAYBE` is filtered out here: a
 * tentative RSVP holds no Seat, so there is nothing on it to record.
 */
function loadSession(sessionId: string) {
    return prisma.activitySession.findUnique({
        where: { id: sessionId },
        select: {
            id: true,
            title: true,
            date: true,
            startTime: true,
            endTime: true,
            location: true,
            status: true,
            fee: true,
            activityId: true,
            activity: {
                select: {
                    name: true,
                    allowsMonthly: true,
                    allowsPerSession: true,
                },
            },
            attendances: {
                where: { status: { in: ADMIN_SETTABLE_STATUSES } },
                orderBy: [{ user: { name: 'asc' } }, { createdAt: 'asc' }],
                select: {
                    id: true,
                    userId: true,
                    status: true,
                    user: { select: { name: true, email: true, role: true } },
                },
            },
        },
    });
}

type LoadedSession = NonNullable<Awaited<ReturnType<typeof loadSession>>>;

type MembershipRow = Readonly<{
    paymentMode: PaymentMode | null;
    effectiveFrom: number;
    pendingMode: PaymentMode | null;
    pendingEffectiveFrom: number | null;
}>;

type MoneyIndex = Readonly<{
    byUser: ReadonlyMap<string, MembershipRow>;
    bySession: ReadonlyMap<string, PaymentStatus>;
    byMonth: ReadonlyMap<string, PaymentStatus>;
}>;

function toStatusMap(
    rows: readonly { userId: string; status: PaymentStatus }[],
): Map<string, PaymentStatus> {
    return new Map(rows.map((row) => [row.userId, row.status]));
}

/** Memberships, this Session's Payments, and this period's Dues, in one trip. */
async function loadMoney(
    session: LoadedSession,
    month: number,
    year: number,
): Promise<MoneyIndex> {
    const userIds = session.attendances.map((row) => row.userId);
    const [memberships, sessionPayments, monthlyPayments] = await Promise.all([
        prisma.membership.findMany({
            where: { activityId: session.activityId, userId: { in: userIds } },
            select: {
                userId: true,
                paymentMode: true,
                effectiveFrom: true,
                pendingMode: true,
                pendingEffectiveFrom: true,
            },
        }),
        prisma.payment.findMany({
            where: { sessionId: session.id },
            select: { userId: true, status: true },
        }),
        prisma.payment.findMany({
            where: {
                activityId: session.activityId,
                type: 'MONTHLY',
                month,
                year,
                userId: { in: userIds },
            },
            select: { userId: true, status: true },
        }),
    ]);
    return {
        byUser: new Map(memberships.map((m) => [m.userId, m])),
        bySession: toStatusMap(sessionPayments),
        byMonth: toStatusMap(monthlyPayments),
    };
}

/** Which money speaks for this member: the kind their mode bills them by. */
function paymentStatusFor(
    userId: string,
    mode: PaymentMode | null,
    money: MoneyIndex,
): PaymentStatus | undefined {
    if (mode === 'MONTHLY') {
        return money.byMonth.get(userId);
    }
    if (mode === 'PER_SESSION') {
        return money.bySession.get(userId);
    }
    // The Activity offers both and the member has not chosen for this period:
    // whichever money is actually in speaks for them, per-Session first because
    // it names this Session rather than the whole month.
    return money.bySession.get(userId) ?? money.byMonth.get(userId);
}

function moneyStandingOf(status: PaymentStatus | undefined): MoneyStanding {
    return status === undefined ? { kind: 'none' } : { kind: 'sent', status };
}

function buildRows(
    session: LoadedSession,
    money: MoneyIndex,
    month: number,
    year: number,
    viewerRole: Role,
): AttendanceRegisterRow[] {
    const offered = {
        allowsMonthly: session.activity.allowsMonthly,
        allowsPerSession: session.activity.allowsPerSession,
    };
    return session.attendances.map((row) => {
        const membership = money.byUser.get(row.userId) ?? NO_MEMBERSHIP;
        const mode = resolvePaymentMode(membership, offered, month, year);
        const { email, isContactWithheld } = resolveOwnerVisibility(
            { role: row.user.role, email: row.user.email, phone: null },
            viewerRole,
        );
        return {
            id: row.id,
            userId: row.userId,
            name: row.user.name,
            email,
            isContactWithheld,
            status: row.status,
            mode,
            money: moneyStandingOf(paymentStatusFor(row.userId, mode, money)),
        };
    });
}

/** The whole register for one Session, or `null` where no such Session exists. */
export async function readAttendanceRegister(
    sessionId: string,
    viewerRole: Role,
): Promise<AttendanceRegisterData | null> {
    const session = await loadSession(sessionId);
    if (session === null) {
        return null;
    }
    const { month, year } = currentPeriod(session.date);
    const money = await loadMoney(session, month, year);
    return {
        session: {
            id: session.id,
            title: session.title,
            date: session.date,
            startTime: session.startTime,
            endTime: session.endTime,
            location: session.location,
            status: session.status,
            activityName: session.activity.name,
        },
        rows: buildRows(session, money, month, year, viewerRole),
        hasFee: session.fee > 0,
    };
}
