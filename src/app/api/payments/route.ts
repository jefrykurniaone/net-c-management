import { auth } from '@/lib/auth';
import { admissionDenied, isAdmittedSession } from '@/lib/admission';
import { prisma } from '@/lib/prisma';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { buildCreatePaymentSchema } from '@/lib/validations/payment';
import { visibleContact } from '@/lib/owner-visibility';
import { isAdminRole } from '@/lib/utils';
import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';

const MAX_PAYMENT_LIMIT = 100;
const DEFAULT_PAYMENT_LIMIT = 20;

/** The user fields one row's `visibleContact` decision needs. `phone` is not
 * selected here — this route has never sent it — so a placeholder stands in;
 * the rule only reads it to answer for `email`. */
type PaymentUserContact = Readonly<{
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    role: Role;
}>;

/**
 * The row's `user`, reshaped so an Owner's withheld email never reaches the
 * response. Same key set and order the route has always sent — `id`, `name`,
 * `email`, `image` — so an Owner caller (never withheld from) sees
 * byte-identical output (docs/owner-role-immutability.md).
 */
function toVisibleUser(user: PaymentUserContact, viewerRole: Role) {
    return {
        id: user.id,
        name: user.name,
        email: visibleContact({ ...user, phone: null }, viewerRole).email,
        image: user.image,
    };
}

export async function GET(req: Request) {
    const session = await auth();
    if (!isAdmittedSession(session)) {
        return admissionDenied(session);
    }

    const { searchParams } = new URL(req.url);
    const isAdmin = isAdminRole(session.user.role);
    const targetUserId = isAdmin
        ? (searchParams.get('userId') ?? undefined)
        : session.user.id;
    const month = searchParams.get('month')
        ? Number.parseInt(searchParams.get('month')!)
        : undefined;
    const year = searchParams.get('year')
        ? Number.parseInt(searchParams.get('year')!)
        : undefined;
    const status = searchParams.get('status') as
        | 'PENDING'
        | 'CONFIRMED'
        | 'REJECTED'
        | null;
    const activityId = searchParams.get('activityId') ?? undefined;
    const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(
        MAX_PAYMENT_LIMIT,
        Math.max(1, Number.parseInt(searchParams.get('limit') ?? String(DEFAULT_PAYMENT_LIMIT))),
    );
    const skip = (page - 1) * limit;

    const where = {
        ...(targetUserId ? { userId: targetUserId } : {}),
        ...(month ? { month } : {}),
        ...(year ? { year } : {}),
        ...(status ? { status } : {}),
        ...(activityId ? { activityId } : {}),
    };

    const [payments, total] = await Promise.all([
        prisma.payment.findMany({
            where,
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
            skip,
            take: limit,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                        role: true,
                    },
                },
                activity: { select: { id: true, name: true } },
            },
        }),
        prisma.payment.count({ where }),
    ]);

    const visiblePayments = payments.map((payment) => ({
        ...payment,
        user: toVisibleUser(payment.user, session.user.role),
    }));

    return NextResponse.json({ payments: visiblePayments, total, page, limit });
}

export async function POST(req: Request) {
    const session = await auth();
    if (!isAdmittedSession(session)) {
        return admissionDenied(session);
    }
    if (!isAdminRole(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const locale = await getLocale();
    const t = getDictionary(locale);

    const body = await req.json();
    const parsed = buildCreatePaymentSchema(t).safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: t.common.error, details: parsed.error.issues },
            { status: 400 },
        );
    }

    const payment = await prisma.payment.create({ data: parsed.data });
    return NextResponse.json(payment, { status: 201 });
}
