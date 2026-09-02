import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { format, type Locale as DateFnsLocale } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { Register } from '@/components/admin/register';
import { auth } from '@/lib/auth';
import { getDictionary, type Dictionary } from '@/lib/i18n/dictionaries';
import { getDateFnsLocale, getLocale } from '@/lib/i18n/locale';
import { isAdminRole } from '@/lib/utils';
import { MemberContact, MemberRole } from '../member-cells';
import {
    activityColumns,
    attendanceColumns,
    duesColumns,
} from './member-detail-cells';
import { loadMemberDetail, type MemberDetail } from './member-detail';

/**
 * One member, read at a desk — the same ruled idiom as the roster it is reached
 * from, and the place a conversation with a member is prepared.
 *
 * The per-Activity register is why this page exists in this spec: Present,
 * Opted Out and **No-Show** counted separately, per Activity, beside how that
 * Membership bills and where it stands this Billing Period. The counts are a
 * conversation aid, which is why they live here rather than on the register,
 * where they would be one more thing to scan past.
 */

const JOINED_DATE_FORMAT = 'd MMMM yyyy';

function BackLink({ t }: Readonly<{ t: Dictionary }>) {
    return (
        <Link
            href='/admin/members'
            className='inline-flex min-h-11 items-center gap-hair type-label text-primary underline underline-offset-4'>
            <ArrowLeft className='size-4' aria-hidden />
            {t.admin.memberDetailBack}
        </Link>
    );
}

function MemberHeader({
    member,
    t,
    dateLocale,
}: Readonly<{
    member: MemberDetail;
    t: Dictionary;
    dateLocale: DateFnsLocale;
}>) {
    return (
        <section className='flex flex-col gap-cell border border-border bg-card p-block'>
            <h1 className='type-display text-foreground'>
                {member.name ?? t.admin.memberNameEmpty}
            </h1>
            <MemberRole member={member} t={t} />
            <MemberContact member={member} t={t} />
            <p className='type-caption text-muted-foreground'>
                {t.admin.memberJoined}{' '}
                {format(member.joinedAt, JOINED_DATE_FORMAT, {
                    locale: dateLocale,
                })}
            </p>
            {member.isImmutable && (
                <p className='type-caption text-muted-foreground'>
                    {t.admin.ownerImmutable}
                </p>
            )}
        </section>
    );
}

/**
 * The three registers each carry their own name in their card header (#166), so
 * the standalone `<h2>` that used to sit above them is gone — one heading per
 * register, inside the card it names.
 */
function ActivitiesSection({
    member,
    t,
}: Readonly<{ member: MemberDetail; t: Dictionary }>) {
    return (
        <Register
            columns={activityColumns(t)}
            rows={member.activities}
            caption={t.admin.memberDetailCaption}
            searchParams={{}}
            header={{
                title: t.admin.colMemberships,
                count: t.admin.registerCountActivities.replace(
                    '{n}',
                    String(member.activities.length),
                ),
            }}
            empty={{
                mark: t.admin.membersEmptyMark,
                text: t.admin.memberNoActivities,
            }}
        />
    );
}

function DuesSection({
    member,
    t,
}: Readonly<{ member: MemberDetail; t: Dictionary }>) {
    return (
        <Register
            columns={duesColumns(t)}
            rows={member.dues}
            caption={t.admin.memberDuesCaption}
            searchParams={{}}
            header={{
                title: t.admin.duesHistory,
                count: t.admin.registerCountPayments.replace(
                    '{n}',
                    String(member.dues.length),
                ),
            }}
            empty={{
                mark: t.admin.membersEmptyMark,
                text: t.admin.noDuesData,
            }}
        />
    );
}

function AttendanceSection({
    member,
    t,
    dateLocale,
}: Readonly<{
    member: MemberDetail;
    t: Dictionary;
    dateLocale: DateFnsLocale;
}>) {
    return (
        <Register
            columns={attendanceColumns(t, dateLocale)}
            rows={member.attendances}
            caption={t.admin.memberAttendanceCaption}
            searchParams={{}}
            header={{
                title: t.admin.attendanceHistory,
                count: t.admin.registerCountSessions.replace(
                    '{n}',
                    String(member.attendances.length),
                ),
            }}
            empty={{
                mark: t.admin.membersEmptyMark,
                text: t.admin.noAttendanceData,
            }}
        />
    );
}

export default async function MemberDetailPage({
    params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
    const [session, locale] = await Promise.all([auth(), getLocale()]);
    if (!session?.user?.id || !isAdminRole(session.user.role)) {
        redirect('/dashboard');
    }
    const t = getDictionary(locale);
    const dateLocale = getDateFnsLocale(locale);

    const { id } = await params;
    const member = await loadMemberDetail(id, session.user.role, new Date());
    if (member === null) {
        notFound();
    }

    return (
        <div className='space-y-bay'>
            <BackLink t={t} />
            <MemberHeader member={member} t={t} dateLocale={dateLocale} />
            <ActivitiesSection member={member} t={t} />
            <DuesSection member={member} t={t} />
            <AttendanceSection member={member} t={t} dateLocale={dateLocale} />
        </div>
    );
}
