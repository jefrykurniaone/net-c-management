import 'server-only';
import {
    AttendanceStatus,
    PaymentType,
    Role,
    type PaymentMode,
    type PaymentStatus,
} from '@prisma/client';
import { pickPeriodPaymentStatus } from '@/lib/membership-mode-view';
import {
    resolveMembershipStanding,
    type DuesStanding,
} from '@/lib/member-standing';
import { resolveOwnerVisibility } from '@/lib/owner-visibility';
import { currentPeriod, type BillingPeriod } from '@/lib/payment-mode';
import { prisma } from '@/lib/prisma';

/**
 * Everything one member's detail page reads.
 *
 * The page is where a conversation with a member is prepared, which is why the
 * **No-Show** count lives here and not as a column on the register: the register
 * is scanned, this page is read, and a count of times somebody held a Seat and
 * nobody heard from them is a thing you raise with a person rather than sort a
 * table by.
 *
 * Owner contact withholding is applied here for the same reason as on the
 * register: a value the browser never receives cannot be read out of it
 * (docs/owner-role-immutability.md, rule 2).
 */

/**
 * The three states that say what became of a Seat somebody held. Registered and
 * Maybe are not among them — neither is a finished story — and No-Show joins
 * the two historical states rather than replacing either. Explicitly typed
 * because a `readonly` array does not satisfy a Prisma `in` filter.
 */
const HISTORICAL_STATUSES: AttendanceStatus[] = [
    AttendanceStatus.PRESENT,
    AttendanceStatus.ABSENT,
    AttendanceStatus.NO_SHOW,
];

/** How many recent Sessions and Payments the page lists under the counts. */
const RECENT_ATTENDANCE_LIMIT = 20;
const RECENT_DUES_LIMIT = 24;

export type MemberActivityRow = Readonly<{
    /** The Activity's id — this register keys its rows on the Activity. */
    id: string;
    activityName: string;
    mode: PaymentMode | null;
    standing: DuesStanding;
    present: number;
    optedOut: number;
    noShow: number;
}>;

export type MemberDuesRow = Readonly<{
    id: string;
    month: number;
    year: number;
    amount: number;
    status: PaymentStatus;
}>;

export type MemberAttendanceRow = Readonly<{
    id: string;
    title: string;
    date: Date;
    status: AttendanceStatus;
}>;

export type MemberDetail = Readonly<{
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    role: Role;
    isActive: boolean;
    isContactWithheld: boolean;
    isImmutable: boolean;
    joinedAt: Date;
    activities: readonly MemberActivityRow[];
    dues: readonly MemberDuesRow[];
    attendances: readonly MemberAttendanceRow[];
}>;

/** One Activity's tally of finished Seats. */
type SeatTally = { present: number; optedOut: number; noShow: number };

const TALLY_FIELD: Record<AttendanceStatus, keyof SeatTally | null> = {
    [AttendanceStatus.PRESENT]: 'present',
    [AttendanceStatus.ABSENT]: 'optedOut',
    [AttendanceStatus.NO_SHOW]: 'noShow',
    [AttendanceStatus.REGISTERED]: null,
    [AttendanceStatus.MAYBE]: null,
};

/**
 * Present, Opted Out and No-Show per Activity. Attendance hangs off a Session
 * rather than an Activity, so the grouping cannot be pushed into `groupBy` — one
 * query returns the finished rows and they are tallied here.
 */
async function loadSeatTallies(
    userId: string,
): Promise<Map<string, SeatTally>> {
    const rows = await prisma.attendance.findMany({
        where: { userId, status: { in: HISTORICAL_STATUSES } },
        select: { status: true, session: { select: { activityId: true } } },
    });
    const byActivity = new Map<string, SeatTally>();
    for (const row of rows) {
        const field = TALLY_FIELD[row.status];
        if (field === null) {
            continue;
        }
        const tally = byActivity.get(row.session.activityId) ?? {
            present: 0,
            optedOut: 0,
            noShow: 0,
        };
        tally[field] += 1;
        byActivity.set(row.session.activityId, tally);
    }
    return byActivity;
}

const MEMBER_INCLUDE = {
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
    attendances: {
        orderBy: { session: { date: 'desc' } },
        take: RECENT_ATTENDANCE_LIMIT,
        select: {
            id: true,
            status: true,
            session: { select: { title: true, date: true } },
        },
    },
} as const;

/**
 * The Dues history. Its own query rather than a nested one: ordering by two
 * columns needs an array, and a `readonly` array — which is what `as const`
 * would make it — does not satisfy a Prisma `orderBy`.
 */
function findDues(userId: string): Promise<MemberDuesRow[]> {
    return prisma.payment.findMany({
        where: { userId },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take: RECENT_DUES_LIMIT,
        select: {
            id: true,
            month: true,
            year: true,
            amount: true,
            status: true,
        },
    });
}

type MemberRecord = NonNullable<
    Awaited<ReturnType<typeof findMemberRecord>>
>;

function findMemberRecord(id: string) {
    return prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            createdAt: true,
            ...MEMBER_INCLUDE,
        },
    });
}

/** The monthly Payments standing against the current Billing Period. */
async function loadPeriodStatuses(
    userId: string,
    period: BillingPeriod,
): Promise<Map<string, PaymentStatus>> {
    const rows = await prisma.payment.findMany({
        where: {
            userId,
            type: PaymentType.MONTHLY,
            month: period.month,
            year: period.year,
        },
        select: { activityId: true, status: true },
    });
    return pickPeriodPaymentStatus(rows);
}

function toActivityRows(
    member: MemberRecord,
    tallies: Map<string, SeatTally>,
    statusByActivity: Map<string, PaymentStatus>,
    period: BillingPeriod,
): MemberActivityRow[] {
    return member.memberships.map((membership) => {
        const { activity } = membership;
        const tally = tallies.get(activity.id);
        return {
            id: activity.id,
            activityName: activity.name,
            ...resolveMembershipStanding(
                {
                    membership,
                    offered: activity,
                    periodStatus: statusByActivity.get(activity.id) ?? null,
                },
                period,
            ),
            present: tally?.present ?? 0,
            optedOut: tally?.optedOut ?? 0,
            noShow: tally?.noShow ?? 0,
        };
    });
}

function toAttendanceRows(member: MemberRecord): MemberAttendanceRow[] {
    return member.attendances.map((attendance) => ({
        id: attendance.id,
        title: attendance.session.title,
        date: attendance.session.date,
        status: attendance.status,
    }));
}

export async function loadMemberDetail(
    id: string,
    viewerRole: Role,
    now: Date,
): Promise<MemberDetail | null> {
    const member = await findMemberRecord(id);
    if (member === null) {
        return null;
    }

    const period = currentPeriod(now);
    const [tallies, statusByActivity, dues] = await Promise.all([
        loadSeatTallies(id),
        loadPeriodStatuses(id, period),
        findDues(id),
    ]);

    return {
        id: member.id,
        name: member.name,
        role: member.role,
        isActive: member.isActive,
        ...resolveOwnerVisibility(member, viewerRole),
        joinedAt: member.createdAt,
        activities: toActivityRows(member, tallies, statusByActivity, period),
        dues,
        attendances: toAttendanceRows(member),
    };
}
