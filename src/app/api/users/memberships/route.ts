import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/users/memberships — all active ekskul with a `joined` flag for the
// current user. Used by the profile "Your activities" section.
export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [ekskuls, memberships] = await Promise.all([
        prisma.ekskul.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
            select: { id: true, name: true, color: true, slug: true },
        }),
        prisma.membership.findMany({
            where: { userId: session.user.id, isActive: true },
            select: { ekskulId: true },
        }),
    ]);

    const joined = new Set(memberships.map((m) => m.ekskulId));
    return NextResponse.json({
        ekskuls: ekskuls.map((e) => ({ ...e, joined: joined.has(e.id) })),
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
