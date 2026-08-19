import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary, type Dictionary } from '@/lib/i18n/dictionaries';
import { WAITING_APPLICANT_WHERE } from '@/lib/admission';
import { isAdminRole } from '@/lib/utils';
import { Mark } from '@/components/ui/mark';
import { ActivityBadge } from '@/components/activity/activity-badge';
import { ApplicantActions } from './applicant-actions';

/**
 * The admission queue — its own surface, not a band on `/admin/members`.
 *
 * This is where new people are let into the community; it should not be
 * something you find by scrolling past a roster, and it is what gives the nav
 * badge somewhere to point. The cost is that on most days it is **empty**, so
 * the empty state is part of the design: a **Blank** mark — *expected but not
 * yet placed* — and one line.
 *
 * The row is its own row, and `/admin/members` is left alone. That roster leads
 * with attendance and payment counts, which are always `0` for an Applicant, and
 * omits `phone` — the one field the Admin actually judges on, since a phone
 * number *is* the identity check in a WhatsApp-run community. Reusing it would
 * have meant changing its columns for everyone to suit a surface that shows a
 * handful of rows.
 */

/** Oldest first: a queue is fair when the longest wait is decided first. */
const QUEUE_ORDER = { createdAt: 'asc' } as const;

/**
 * A public landing page can point more people at this queue than one screen
 * should hold. The cap is disclosed on screen rather than silently truncating —
 * the subtitle always counts every waiting Applicant.
 */
const MAX_QUEUE_ROWS = 100;

const MS_PER_DAY = 86_400_000;

/** How long they have waited, in whole days. Same day reads as "today". */
function waitedLabel(since: Date, t: Dictionary): string {
    const days = Math.floor((Date.now() - since.getTime()) / MS_PER_DAY);
    if (days <= 0) return t.admin.waitedToday;
    return t.admin.waitedDays.replace('{n}', String(days));
}

function WhatsappLink({
    phone,
    label,
}: Readonly<{ phone: string | null; label: string }>) {
    const digits = phone?.replace(/\D/g, '') ?? '';
    if (!digits) return <span className='type-caption text-muted-foreground'>—</span>;
    return (
        <a
            href={`https://wa.me/${digits}`}
            target='_blank'
            rel='noopener noreferrer'
            aria-label={`${label} ${phone}`}
            className='type-figure text-foreground underline underline-offset-4 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
            {phone}
        </a>
    );
}

type QueueRow = Readonly<{
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    createdAt: Date;
    memberships: readonly Readonly<{
        activity: Readonly<{ id: string; name: string; color: string }>;
    }>[];
}>;

/**
 * One glance, five fields, in decision order: who they are, how to reach them,
 * what they asked to join, how long they have waited, then the decision. It
 * wraps rather than scrolling — the organizer may be on a phone.
 */
function ApplicantRow({
    applicant,
    t,
}: Readonly<{ applicant: QueueRow; t: Dictionary }>) {
    const shownName = applicant.name ?? `(${t.admin.profileIncomplete})`;
    return (
        <li className='flex flex-wrap items-center justify-between gap-x-block gap-y-cell px-block py-cell'>
            <span className='flex min-w-0 flex-col'>
                <span className='type-title text-foreground'>{shownName}</span>
                <span className='type-caption break-all text-muted-foreground'>
                    {applicant.email}
                </span>
            </span>
            <WhatsappLink
                phone={applicant.phone}
                label={t.admin.applicantPhone}
            />
            <span className='flex flex-wrap items-center gap-hair'>
                {applicant.memberships.length === 0 ? (
                    <span className='type-caption text-muted-foreground'>—</span>
                ) : (
                    applicant.memberships.map((m) => (
                        <ActivityBadge
                            key={m.activity.id}
                            name={m.activity.name}
                            color={m.activity.color}
                        />
                    ))
                )}
            </span>
            <span className='flex items-baseline gap-hair'>
                <span className='type-label text-muted-foreground'>
                    {t.admin.applicantWaited}
                </span>
                <span className='type-figure text-foreground'>
                    {waitedLabel(applicant.createdAt, t)}
                </span>
            </span>
            <ApplicantActions
                id={applicant.id}
                name={applicant.name ?? applicant.email ?? '—'}
            />
        </li>
    );
}

function EmptyQueue({ t }: Readonly<{ t: Dictionary }>) {
    return (
        <div className='flex flex-wrap items-center gap-cell border border-rule bg-tile px-block py-bay'>
            <Mark kind='blank'>{t.admin.applicantsEmptyMark}</Mark>
            <p className='type-caption text-muted-foreground'>
                {t.admin.applicantsEmpty}
            </p>
        </div>
    );
}

export default async function AdminApplicantsPage() {
    const [session, locale] = await Promise.all([auth(), getLocale()]);
    if (!session?.user?.id || !isAdminRole(session.user.role)) {
        redirect('/dashboard');
    }
    const t = getDictionary(locale);

    const [applicants, total] = await Promise.all([
        prisma.user.findMany({
            where: WAITING_APPLICANT_WHERE,
            orderBy: QUEUE_ORDER,
            take: MAX_QUEUE_ROWS,
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                createdAt: true,
                memberships: {
                    where: { isActive: true, activity: { isActive: true } },
                    select: {
                        activity: { select: { id: true, name: true, color: true } },
                    },
                },
            },
        }),
        prisma.user.count({ where: WAITING_APPLICANT_WHERE }),
    ]);

    return (
        <div className='space-y-6'>
            <div>
                <h1 className='type-display text-foreground'>
                    {t.admin.applicantsTitle}
                </h1>
                <p className='mt-cell type-caption text-muted-foreground'>
                    {t.admin.applicantsSubtitle.replace('{n}', String(total))} ·{' '}
                    {t.admin.applicantsHint}
                </p>
            </div>

            {applicants.length === 0 ? (
                <EmptyQueue t={t} />
            ) : (
                <ul className='divide-y divide-rule border border-rule bg-tile'>
                    {applicants.map((a) => (
                        <ApplicantRow key={a.id} applicant={a} t={t} />
                    ))}
                </ul>
            )}

            {total > applicants.length && (
                <p className='type-caption text-muted-foreground'>
                    {t.admin.applicantsCapped.replace(
                        '{n}',
                        String(applicants.length),
                    )}
                </p>
            )}

            <Link
                href='/admin/members'
                className='inline-flex min-h-11 items-center type-label text-primary underline underline-offset-4'>
                {t.admin.applicantsToRoster}
            </Link>
        </div>
    );
}
