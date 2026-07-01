import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
    currentPeriod,
    resolvePaymentMode,
    type MembershipMode,
} from '@/lib/payment-mode';
import { NextResponse } from 'next/server';

type EkskulRow = {
    id: string;
    name: string;
    color: string;
    slug: string;
    monthlyFee: number;
    sessionFee: number;
    allowsMonthly: boolean;
    allowsPerSession: boolean;
};

// Shape each Activity for the profile "Your activities" card: identity + fees +
// offered modes, plus this member's mode fields and the server-resolved
// effective mode for the current period (null when not joined). resolvePaymentMode
// is server-only, so the effective mode is computed here, never on the client.
function toEkskulView(
    ekskul: EkskulRow,
    membership: (MembershipMode & { ekskulId: string }) | undefined,
    month: number,
    year: number,
) {
    const offered = {
        allowsMonthly: ekskul.allowsMonthly,
        allowsPerSession: ekskul.allowsPerSession,
    };
    return {
        ...ekskul,
        joined: membership !== undefined,
        pendingMode: membership?.pendingMode ?? null,
        pendingEffectiveFrom: membership?.pendingEffectiveFrom ?? null,
        effectiveMode: membership
            ? resolvePaymentMode(membership, offered, month, year)
            : null,
    };
}

// GET /api/users/memberships — all active ekskul with a `joined` flag plus the
// current user's payment-mode state per Activity. Scoped to the caller (AD-3):
// only this member's membership rows are read, never another member's.
export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [ekskuls, memberships] = await Promise.all([
        prisma.ekskul.findMany({
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
            },
        }),
        prisma.membership.findMany({
            where: { userId: session.user.id, isActive: true },
            select: {
                ekskulId: true,
                paymentMode: true,
                effectiveFrom: true,
                pendingMode: true,
                pendingEffectiveFrom: true,
            },
        }),
    ]);

    const byEkskul = new Map(memberships.map((m) => [m.ekskulId, m]));
    const { month, year } = currentPeriod(new Date());

    return NextResponse.json({
        ekskuls: ekskuls.map((e) => toEkskulView(e, byEkskul.get(e.id), month, year)),
    });
}

// POST /api/users/memberships — join or leave an ekskul.
// body: { ekskulId: string, action: "join" | "leave" }
export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const ekskulId = typeof body.ekskulId === 'string' ? body.ekskulId : '';
    const action = body.action === 'leave' ? 'leave' : 'join';
    if (!ekskulId) {
        return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
    }

    const userId = session.user.id;

    if (action === 'join') {
        const ekskul = await prisma.ekskul.findFirst({
            where: { id: ekskulId, isActive: true },
            select: { id: true },
        });
        if (!ekskul) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
        await prisma.membership.upsert({
            where: { userId_ekskulId: { userId, ekskulId } },
            create: { userId, ekskulId, isActive: true },
            update: { isActive: true },
        });
    } else {
        await prisma.membership.updateMany({
            where: { userId, ekskulId },
            data: { isActive: false },
        });
    }

    return NextResponse.json({ success: true });
}
