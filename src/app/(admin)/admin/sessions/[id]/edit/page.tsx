import { notFound, redirect } from 'next/navigation';
import type { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { releaseExpiredHolds } from '@/lib/holds';
import { prisma } from '@/lib/prisma';
import {
    LIVE_PAYMENT_STATUSES,
    resolveDeleteRefusal,
    SEAT_HOLDING_STATUSES,
    toSessionLockFacts,
} from '@/lib/session-lock';
import { isAdminRole } from '@/lib/utils';
import { EditSessionForm } from './edit-form';

/**
 * The lock facts are resolved **here**, on the server, and the form receives
 * booleans and a count rather than rows: a component handed the Attendance and
 * Payment rows could decide for itself what "money behind it" means, which is
 * how two surfaces come to disagree about one rule.
 *
 * The hold sweep runs before the counts are taken, so a lapsed hold does not
 * lock the fee of a Session nobody is actually holding a Seat on.
 *
 * Whether the Session can be deleted at all is resolved here too, by the same
 * `resolveDeleteRefusal` the route decides with, so the form draws a Delete
 * button only where the route would honour one.
 */
const EDIT_SELECT = {
    id: true,
    title: true,
    date: true,
    startTime: true,
    endTime: true,
    location: true,
    maxPlayers: true,
    fee: true,
    notes: true,
    status: true,
    lastReminderAt: true,
    activity: { select: { name: true } },
    _count: {
        select: {
            attendances: { where: { status: { in: SEAT_HOLDING_STATUSES } } },
            payments: { where: { status: { in: LIVE_PAYMENT_STATUSES } } },
        },
    },
} satisfies Prisma.ActivitySessionSelect;

export default async function EditSessionPage({
    params,
}: Readonly<{
    params: Promise<{ id: string }>;
}>) {
    const session = await auth();
    if (!session?.user?.id || !isAdminRole(session.user.role)) {
        redirect('/dashboard');
    }

    const { id } = await params;
    await releaseExpiredHolds();
    const row = await prisma.activitySession.findUnique({
        where: { id },
        select: EDIT_SELECT,
    });

    if (!row) {
        notFound();
    }

    const { _count, activity, ...stored } = row;
    const lock = toSessionLockFacts(_count, stored.status);

    return (
        <div className='max-w-lg mx-auto'>
            <EditSessionForm
                session={{ ...stored, activityName: activity.name }}
                lock={lock}
                canDelete={resolveDeleteRefusal(stored, lock) === null}
            />
        </div>
    );
}
