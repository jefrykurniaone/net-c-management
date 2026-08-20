import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { NamedActivity, ProofUploadCase } from '@/lib/proof-upload-cases';

/** Every case except the one that has something to bill for. */
export type NoMonthlyDuesCase = Exclude<ProofUploadCase, { kind: 'monthly' }>;

/** Where a payment mode is chosen, and where a per-session fee is paid: a session. */
const SESSIONS_PATH = '/sessions';

/** The `activityId` filter the sessions list reads from its query string. */
const ACTIVITY_PARAM = 'activityId';

interface DeadEndCopy {
    title: string;
    body: string;
    /** `null` where the member has no move to make — only an admin does. */
    action: string | null;
}

function copyFor(t: Dictionary, kind: NoMonthlyDuesCase['kind']): DeadEndCopy {
    const c = t.payments;
    switch (kind) {
        case 'modeUnchosen':
            return {
                title: c.modeUnchosenTitle,
                body: c.modeUnchosenBody,
                action: c.modeUnchosenAction,
            };
        case 'perSessionOnly':
            return {
                title: c.perSessionOnlyTitle,
                body: c.perSessionOnlyBody,
                action: c.perSessionOnlyAction,
            };
        case 'noActivity':
            return {
                title: c.noActivityTitle,
                body: c.noActivityBody,
                action: c.noActivityAction,
            };
        default:
            return { title: c.noBillingTitle, body: c.noBillingBody, action: null };
    }
}

function fill(template: string, values: Record<string, string>): string {
    return Object.entries(values).reduce(
        (filled, [key, value]) => filled.split(`{${key}}`).join(value),
        template,
    );
}

/**
 * A single named Activity gets a link straight to its own sessions; several get
 * the unfiltered list, because guessing which one the member meant is the kind
 * of confident wrong answer this screen exists to stop making.
 */
function sessionsHref(activities: readonly NamedActivity[]): string {
    if (activities.length !== 1) return SESSIONS_PATH;
    const query = new URLSearchParams({ [ACTIVITY_PARAM]: activities[0].id });
    return `${SESSIONS_PATH}?${query.toString()}`;
}

function namesOf(activities: readonly NamedActivity[]): string {
    return activities.map((activity) => activity.name).join(', ');
}

/**
 * What the Proof uploader says when no Activity resolves to monthly billing for
 * the current period. Each cause gets its own sentence naming the member's own
 * Activities and its own way out — never an empty select, and never one cause's
 * explanation shown for another's situation.
 */
export function NoMonthlyDues({
    t,
    result,
    periodLabel,
}: Readonly<{
    t: Dictionary;
    result: NoMonthlyDuesCase;
    periodLabel: string;
}>) {
    const copy = copyFor(t, result.kind);
    const activities = result.kind === 'noActivity' ? [] : result.activities;
    const body = fill(copy.body, {
        activities: namesOf(activities),
        period: periodLabel,
    });

    return (
        <section className='border border-rule bg-tile p-block'>
            <h1 className='type-display text-card-foreground'>{copy.title}</h1>
            <p className='mt-cell type-body text-secondary-foreground'>{body}</p>
            {copy.action && (
                <Button asChild className='mt-block type-label'>
                    <Link href={sessionsHref(activities)}>{copy.action}</Link>
                </Button>
            )}
        </section>
    );
}
