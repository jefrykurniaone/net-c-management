import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureMembership } from '@/lib/activity';
import {
    currentPeriod,
    resolvePaymentMode,
    type MembershipMode,
} from '@/lib/payment-mode';
import { NextResponse } from 'next/server';

type ActivityRow = {
    id: string;
    name: string;
    color: string;
    slug: string;
    monthlyFee: number;
    sessionFee: number;
    allowsMonthly: boolean;
    allowsPerSession: boolean;
    adminWhatsapp: string;
    bankName: string;
    bankAccountNumber: string;
    bankAccountHolder: string;
};

// Shape each Activity for the profile "Your activities" card: identity + fees +
// offered modes, plus this member's mode fields and the server-resolved
// effective mode for the current period (null when not joined). resolvePaymentMode
// is server-only, so the effective mode is computed here, never on the client.
function toActivityView(
    activity: ActivityRow,
    membership: (MembershipMode & { activityId: string }) | undefined,
    month: number,
    year: number,
) {
    const offered = {
        allowsMonthly: activity.allowsMonthly,
        allowsPerSession: activity.allowsPerSession,
    };
    return {
        ...activity,
        joined: membership !== undefined,
        paymentMode: membership?.paymentMode ?? null,
        effectiveFrom: membership?.effectiveFrom ?? null,
        pendingMode: membership?.pendingMode ?? null,
        pendingEffectiveFrom: membership?.pendingEffectiveFrom ?? null,
        effectiveMode: membership
            ? resolvePaymentMode(membership, offered, month, year)
            : null,
    };
}

// GET /api/users/memberships — all active activity with a `joined` flag plus the
// current user's payment-mode state per Activity. Scoped to the caller (AD-3):
// only this member's membership rows are read, never another member's.
export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [activities, memberships] = await Promise.all([
        prisma.activity.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                color: true,
                slug: true,
                monthlyFee: true,
                sessionFee: true,
                allowsMonthly: true,
                allowsPerSession: true,
                adminWhatsapp: true,
                bankName: true,
                bankAccountNumber: true,
                bankAccountHolder: true,
            },
        }),
        prisma.membership.findMany({
            where: { userId: session.user.id, isActive: true },
            select: {
                activityId: true,
                paymentMode: true,
                effectiveFrom: true,
                pendingMode: true,
                pendingEffectiveFrom: true,
            },
        }),
    ]);

    const byActivity = new Map(memberships.map((m) => [m.activityId, m]));
    const { month, year } = currentPeriod(new Date());

    return NextResponse.json({
        activities: activities.map((e) => toActivityView(e, byActivity.get(e.id), month, year)),
    });
}

// POST /api/users/memberships — join or leave an activity.
// body: { activityId: string, action: "join" | "leave" }
export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const activityId = typeof body.activityId === 'string' ? body.activityId : '';
    const action = body.action === 'leave' ? 'leave' : 'join';
    if (!activityId) {
        return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
    }

    const userId = session.user.id;

    if (action === 'join') {
        // Shared join path: (re)activates the membership and resets a stale
        // payment-mode selection when re-joining after a leave.
        const joined = await ensureMembership(userId, activityId);
        if (!joined) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
    } else {
        await prisma.membership.updateMany({
            where: { userId, activityId },
            data: { isActive: false },
        });
    }

    return NextResponse.json({ success: true });
}
