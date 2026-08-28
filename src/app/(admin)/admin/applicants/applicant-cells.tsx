import { format } from 'date-fns';
import type { Locale as DateFnsLocale } from 'date-fns';
import { ActivityBadge } from '@/components/activity/activity-badge';
import type { Dictionary } from '@/lib/i18n/dictionaries';

/**
 * The values one Applicant row holds. The register owns where each of these
 * lands and how it rules; these components own only what a single value looks
 * like — which is the whole of what a caller gets to say.
 */

export type ApplicantRow = Readonly<{
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    createdAt: Date;
    memberships: readonly Readonly<{
        activity: Readonly<{ id: string; name: string }>;
    }>[];
}>;

/** Nothing picked, nothing to draw. */
const EM_DASH = '—';

const ASKED_DATE_FORMAT = 'd MMM yyyy';

const MS_PER_DAY = 86_400_000;

/**
 * What to call this Applicant in a confirmation and in a toast. A profile can
 * be complete without a name having reached us, so the email stands in.
 */
export function applicantLabel(applicant: ApplicantRow): string {
    return applicant.name ?? applicant.email ?? EM_DASH;
}

/** How long they have waited, in whole days. Same day reads as "today". */
export function waitedLabel(since: Date, t: Dictionary): string {
    const days = Math.floor((Date.now() - since.getTime()) / MS_PER_DAY);
    if (days <= 0) {
        return t.admin.waitedToday;
    }
    return t.admin.waitedDays.replace('{n}', String(days));
}

/**
 * A phone number *is* the identity check in a WhatsApp-run community, so it
 * sits with the name rather than a screen away. Nobody has to have one: an
 * Applicant with no number simply has one line fewer.
 */
function WhatsappLink({
    phone,
    label,
}: Readonly<{ phone: string | null; label: string }>) {
    const digits = phone?.replace(/\D/g, '') ?? '';
    if (!digits) {
        return null;
    }
    return (
        <a
            href={`https://wa.me/${digits}`}
            target='_blank'
            rel='noopener noreferrer'
            aria-label={`${label} ${phone}`}
            className='type-caption w-fit tabular-nums text-foreground underline underline-offset-4 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
            {phone}
        </a>
    );
}

/** Who they are and how to reach them, in decision order. */
export function ApplicantIdentity({
    applicant,
    t,
}: Readonly<{ applicant: ApplicantRow; t: Dictionary }>) {
    const shownName = applicant.name ?? `(${t.admin.profileIncomplete})`;
    return (
        <span className='flex min-w-0 flex-col gap-hair'>
            <span className='type-title text-foreground'>{shownName}</span>
            <span className='type-caption break-all text-muted-foreground'>
                {applicant.email}
            </span>
            <WhatsappLink
                phone={applicant.phone}
                label={t.admin.applicantPhone}
            />
        </span>
    );
}

/** When they asked, and how long that has been. */
export function ApplicantAsked({
    applicant,
    t,
    dateLocale,
}: Readonly<{
    applicant: ApplicantRow;
    t: Dictionary;
    dateLocale: DateFnsLocale;
}>) {
    return (
        <span className='flex flex-col items-start gap-hair md:items-end'>
            <time
                dateTime={applicant.createdAt.toISOString()}
                className='type-figure text-foreground'>
                {format(applicant.createdAt, ASKED_DATE_FORMAT, {
                    locale: dateLocale,
                })}
            </time>
            <span className='type-caption text-muted-foreground'>
                {waitedLabel(applicant.createdAt, t)}
            </span>
        </span>
    );
}

/**
 * The Memberships they picked while completing their profile. None of them
 * means anything until they are Admitted, so this is what they asked for and
 * not yet what they have.
 */
export function ApplicantMemberships({
    applicant,
}: Readonly<{ applicant: ApplicantRow }>) {
    if (applicant.memberships.length === 0) {
        return (
            <span className='type-caption text-muted-foreground'>
                {EM_DASH}
            </span>
        );
    }
    return (
        <span className='flex flex-wrap items-center gap-hair'>
            {applicant.memberships.map((m) => (
                <ActivityBadge key={m.activity.id} name={m.activity.name} />
            ))}
        </span>
    );
}
