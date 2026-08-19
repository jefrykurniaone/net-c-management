import { auth } from '@/lib/auth';
import { admissionDenied, isAdmittedSession } from '@/lib/admission';
import { prisma } from '@/lib/prisma';
import { isAdminRole } from '@/lib/utils';
import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';

// GET /api/users/admin-contacts — admin/owner phone numbers the caller may
// reuse when filling a WhatsApp field (settings, Activity form).
// Visibility rules: an ADMIN sees admins (self included) but never the OWNER's
// number; the OWNER sees both admins and themselves.
export async function GET() {
    const session = await auth();
    if (!isAdmittedSession(session)) {
        return admissionDenied(session);
    }
    if (!isAdminRole(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const visibleRoles: Role[] =
        session.user.role === Role.OWNER
            ? [Role.ADMIN, Role.OWNER]
            : [Role.ADMIN];

    const contacts = await prisma.user.findMany({
        where: {
            role: { in: visibleRoles },
            isActive: true,
            phone: { not: null },
            NOT: { phone: '' },
        },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, phone: true, role: true },
    });

    return NextResponse.json({
        contacts: contacts.map((c) => ({
            ...c,
            isSelf: c.id === session.user.id,
        })),
    });
}
