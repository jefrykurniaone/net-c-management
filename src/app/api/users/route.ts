import { auth } from '@/lib/auth';
import { admissionDenied, isAdmittedSession } from '@/lib/admission';
import { searchByNameOrEmail, visibleContact } from '@/lib/owner-visibility';
import { prisma } from '@/lib/prisma';
import { isAdminRole } from '@/lib/utils';
import { NextResponse } from 'next/server';

const MAX_USER_LIMIT = 100;
const DEFAULT_USER_LIMIT = 50;

const USER_SELECT = {
    id: true,
    name: true,
    email: true,
    image: true,
    phone: true,
    role: true,
    isActive: true,
    isProfileComplete: true,
    createdAt: true,
    _count: { select: { attendances: true, payments: true } },
} as const;

/** Page, page size and search term, already clamped. */
function readQuery(searchParams: URLSearchParams) {
    const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(
        MAX_USER_LIMIT,
        Math.max(
            1,
            Number.parseInt(
                searchParams.get('limit') ?? String(DEFAULT_USER_LIMIT),
            ),
        ),
    );
    return { page, limit, search: searchParams.get('search') ?? '' };
}

export async function GET(req: Request) {
    const session = await auth();
    if (!isAdmittedSession(session)) {
        return admissionDenied(session);
    }
    if (!isAdminRole(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const viewerRole = session.user.role;
    const { page, limit, search } = readQuery(new URL(req.url).searchParams);
    // Searching by email would otherwise be an oracle for the address the rows
    // below refuse to carry (docs/owner-role-immutability.md, rule 2).
    const where = searchByNameOrEmail(search, viewerRole);

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            select: USER_SELECT,
        }),
        prisma.user.count({ where }),
    ]);

    // The Owner's row stays; its two contact values do not travel to an Admin.
    return NextResponse.json({
        users: users.map((user) => ({
            ...user,
            ...visibleContact(user, viewerRole),
        })),
        total,
        page,
        limit,
    });
}

export async function PATCH(req: Request) {
    const session = await auth();
    if (!isAdmittedSession(session)) {
        return admissionDenied(session);
    }
    if (!isAdminRole(session.user.role)) {
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

    // OWNER accounts are immutable — nobody can change them
    const target = await prisma.user.findUnique({
        where: { id: body.id },
        select: { role: true },
    });
    if (!target) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (target.role === 'OWNER') {
        return NextResponse.json(
            { error: 'Cannot modify an OWNER account' },
            { status: 403 },
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
