import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

const MAX_USER_LIMIT = 100;
const DEFAULT_USER_LIMIT = 50;

// GET /api/users — list all members (admin only)
export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(
        MAX_USER_LIMIT,
        Math.max(1, Number.parseInt(searchParams.get('limit') ?? String(DEFAULT_USER_LIMIT))),
    );
    const search = searchParams.get('search') ?? '';
    const skip = (page - 1) * limit;

    const where = search
        ? {
              OR: [
                  { name: { contains: search, mode: 'insensitive' as const } },
                  { email: { contains: search, mode: 'insensitive' as const } },
              ],
          }
        : {};

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                phone: true,
                role: true,
                isActive: true,
                isProfileComplete: true,
                playPosition: true,
                playerLevel: true,
                createdAt: true,
                _count: { select: { attendances: true, payments: true } },
            },
        }),
        prisma.user.count({ where }),
    ]);

    return NextResponse.json({ users, total, page, limit });
}

// PATCH /api/users — update role or isActive for a user (admin only)
export async function PATCH(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await req.json()) as {
        id: string;
        role?: 'ADMIN' | 'MEMBER';
        isActive?: boolean;
    };
    if (!body.id) {
        return NextResponse.json(
            { error: 'User ID required' },
            { status: 400 },
        );
    }

    // Prevent admin from demoting themselves
    if (body.id === session.user.id && body.role === 'MEMBER') {
        return NextResponse.json(
            { error: 'Cannot demote yourself' },
            { status: 400 },
        );
    }

    const updated = await prisma.user.update({
        where: { id: body.id },
        data: {
            ...(body.role === undefined ? {} : { role: body.role }),
            ...(body.isActive === undefined ? {} : { isActive: body.isActive }),
        },
        select: {
            id: true,
            name: true,
            role: true,
            isActive: true,
        },
    });

    return NextResponse.json(updated);
}
