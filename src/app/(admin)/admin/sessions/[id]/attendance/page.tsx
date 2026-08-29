import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { format } from 'date-fns';
import { auth } from '@/lib/auth';
import { isAttendanceUntaken } from '@/lib/attendance-admin';
import { releaseExpiredHolds } from '@/lib/holds';
import { getDateFnsLocale, getLocale } from '@/lib/i18n/locale';
import { getDictionary, type Dictionary } from '@/lib/i18n/dictionaries';
import type { RawSearchParams } from '@/lib/table-params';
import { isAdminRole } from '@/lib/utils';
import { AttendanceRegister } from './attendance-register';
import { readAttendanceRegister } from './attendance-rows';
import {
    UNTAKEN_NOTICE_ID,
    type AttendanceSessionFacts,
} from './attendance-view';

/**
 * Taking attendance after a game is its own job, so it has its own surface: one
 * Session, every Seat on it, a four-state control per row, and one Save. It used
 * to live inside the Session edit form, which is where a Session's time and
 * venue are changed — a different job at a different moment, and two places to
 * record attendance is how they come to disagree.
 *
 * A Session whose attendance nobody took is an Admin's omission and says so at
 * the top. It is never turned into a No-Show: nobody deciding is precisely what
 * that state means (docs/adr/0001-no-show-attendance-value.md).
 */

const DATE_FORMAT = 'd MMM yyyy';

/** The Session this register is about — enough to be sure it is the right one. */
function SessionHeading({
    session,
    dateLabel,
    hasFee,
    t,
}: Readonly<{
    session: AttendanceSessionFacts;
    dateLabel: string;
    hasFee: boolean;
    t: Dictionary;
}>) {
    return (
        <div>
            <h1 className='type-display text-foreground'>
                {t.admin.attendanceTitle}
            </h1>
            <p className='mt-cell type-caption text-muted-foreground'>
                {session.title} · {session.activityName} · {dateLabel} ·{' '}
                {session.startTime}–{session.endTime} · {session.location}
                {/* Said once, here, rather than down a column of forty rows. */}
                {!hasFee && <> · {t.admin.attMoneyFree}</>}
            </p>
        </div>
    );
}

/**
 * The Session ended and nothing was recorded. Body type in Secondary Ink, tied
 * to the save form with `aria-describedby` — a condition disclosed in the fine
 * print is not disclosed.
 */
function UntakenNotice({ t }: Readonly<{ t: Dictionary }>) {
    return (
        <p
            id={UNTAKEN_NOTICE_ID}
            className='type-body text-secondary-foreground'>
            {t.admin.attendanceUntaken}
        </p>
    );
}

function BackLink({ t }: Readonly<{ t: Dictionary }>) {
    return (
        <Link
            href='/admin/sessions'
            className='inline-flex min-h-11 items-center type-label text-primary underline underline-offset-4'>
            {t.admin.backToSessions}
        </Link>
    );
}

export default async function AdminSessionAttendancePage({
    params,
    searchParams,
}: Readonly<{
    params: Promise<{ id: string }>;
    searchParams: Promise<RawSearchParams>;
}>) {
    const [session, locale] = await Promise.all([auth(), getLocale()]);
    if (!session?.user?.id || !isAdminRole(session.user.role)) {
        redirect('/dashboard');
    }
    const t = getDictionary(locale);
    const [{ id }, sp] = await Promise.all([params, searchParams]);

    await releaseExpiredHolds();
    const data = await readAttendanceRegister(id, session.user.role);
    if (data === null) {
        notFound();
    }

    const isUntaken = isAttendanceUntaken(
        { ...data.session, rows: data.rows },
        new Date(),
    );

    return (
        <div className='space-y-bay'>
            <SessionHeading
                session={data.session}
                dateLabel={format(data.session.date, DATE_FORMAT, {
                    locale: getDateFnsLocale(locale),
                })}
                hasFee={data.hasFee}
                t={t}
            />
            {isUntaken && <UntakenNotice t={t} />}
            <AttendanceRegister
                sessionId={data.session.id}
                rows={data.rows}
                searchParams={sp}
                isUntaken={isUntaken}
                hasFee={data.hasFee}
            />
            <BackLink t={t} />
        </div>
    );
}
