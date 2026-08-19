/**
 * PROTOTYPE — throwaway (wayfinder ticket 11). Three structurally different
 * answers to "what does the Applicant's waiting room do", each rendering both
 * states 05 put on this route: waiting (`admittedAt` null, `isActive`) and
 * declined (`admittedAt` null, `isActive` false).
 *
 * A — Receipt tile: a dense 40rem single-task column that echoes what they
 *     handed over. Argues the cure for a dead end is *evidence*.
 * B — Interstitial: vertical-centred, one statement, one action, no data.
 *     Argues the cure is brevity, and that echoing a form back is filler.
 * C — Waiting room with the board: status strip plus the community's real
 *     schedule, read-only. Argues the cure is showing what they are waiting
 *     for — and puts the tease question on screen where it can be judged.
 */

import { Mark } from '@/components/ui/mark';
import { ActivityBadge } from '@/components/activity/activity-badge';
import { SignOutAction } from './sign-out-link';
import type { PendingCopy } from './proto-copy';

export type ProtoState = 'waiting' | 'declined';

export type ProtoApplicant = Readonly<{
    name: string;
    phone: string;
    email: string;
    askedAt: string;
    activities: readonly Readonly<{ id: string; name: string; color: string }>[];
}>;

export type ProtoSession = Readonly<{
    id: string;
    activityName: string;
    activityColor: string;
    dateLabel: string;
    timeLabel: string;
    location: string;
}>;

export type VariantProps = Readonly<{
    state: ProtoState;
    copy: PendingCopy;
    communityName: string;
    adminWhatsapp: string;
    applicant: ProtoApplicant;
    sessions: readonly ProtoSession[];
}>;

/* ── shared scraps (a header rail and two actions; deliberately not a layout) ── */

function StatusMark({ state, copy }: Readonly<{ state: ProtoState; copy: PendingCopy }>) {
    if (state === 'declined') return <Mark kind='strike'>{copy.declinedMark}</Mark>;
    return <Mark kind='tape'>{copy.waitingMark}</Mark>;
}

function title(state: ProtoState, copy: PendingCopy): string {
    return state === 'declined' ? copy.declinedTitle : copy.waitingTitle;
}

function lead(state: ProtoState, copy: PendingCopy): string {
    return state === 'declined' ? copy.declinedLead : copy.waitingLead;
}

function WhatsappAction({
    phone,
    label,
    tone,
}: Readonly<{ phone: string; label: string; tone: 'primary' | 'quiet' }>) {
    const digits = phone.replace(/\D/g, '');
    if (!digits) return null;
    const cls =
        tone === 'primary'
            ? 'bg-primary text-primary-foreground'
            : 'border border-rule bg-tile text-foreground';
    return (
        <a
            href={`https://wa.me/${digits}`}
            target='_blank'
            rel='noopener noreferrer'
            className={`inline-flex min-h-11 items-center justify-center rounded-[2px] px-5 type-label ${cls}`}>
            {label}
        </a>
    );
}

function IdentityRail({ communityName }: Readonly<{ communityName: string }>) {
    return (
        <div className='flex items-center justify-between border-b border-rule px-4 py-3'>
            <span className='type-mark text-foreground'>{communityName}</span>
        </div>
    );
}

function Row({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
    return (
        <div className='flex items-baseline justify-between gap-4 border-b border-rule px-4 py-2.5 last:border-b-0'>
            <span className='type-label text-muted-foreground'>{label}</span>
            <span className='min-w-0 text-right'>{children}</span>
        </div>
    );
}

function SessionRows({
    sessions,
    copy,
}: Readonly<{ sessions: readonly ProtoSession[]; copy: PendingCopy }>) {
    if (sessions.length === 0) {
        return (
            <p className='px-4 py-6 type-caption text-muted-foreground'>{copy.noSessions}</p>
        );
    }
    return (
        <ul className='divide-y divide-rule'>
            {sessions.map((s) => (
                <li
                    key={s.id}
                    className='flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3'>
                    <span className='flex min-w-0 items-center gap-2'>
                        <ActivityBadge name={s.activityName} color={s.activityColor} />
                        <span className='type-figure text-foreground'>{s.dateLabel}</span>
                        <span className='type-caption text-muted-foreground'>{s.timeLabel}</span>
                    </span>
                    <span className='flex items-center gap-2'>
                        <span className='type-caption text-muted-foreground'>{s.location}</span>
                        <Mark kind='blank'>{copy.cannotJoinYet}</Mark>
                    </span>
                </li>
            ))}
        </ul>
    );
}

/* ── A — the receipt tile ───────────────────────────────────────────────── */

export function VariantA({
    state,
    copy,
    communityName,
    adminWhatsapp,
    applicant,
}: VariantProps) {
    const dim = state === 'declined' ? 'text-muted-foreground' : 'text-foreground';
    return (
        <main className='mx-auto w-full max-w-[40rem] px-4 py-7'>
            <div className='border border-rule bg-tile'>
                <IdentityRail communityName={communityName} />

                <div className='space-y-2.5 px-4 py-4'>
                    <StatusMark state={state} copy={copy} />
                    <h1 className='type-display text-foreground'>{title(state, copy)}</h1>
                    <p className='type-body max-w-[65ch] text-secondary-foreground'>
                        {lead(state, copy)}
                    </p>
                </div>

                <div className='border-t border-rule'>
                    <p className='px-4 pt-4 type-label text-muted-foreground'>
                        {copy.submittedHead}
                    </p>
                    <div className='mt-2.5 border-t border-rule'>
                        <Row label={copy.nameLabel}>
                            <span className={`type-title ${dim}`}>{applicant.name}</span>
                        </Row>
                        <Row label={copy.phoneLabel}>
                            <span className={`type-figure ${dim}`}>{applicant.phone}</span>
                        </Row>
                        <Row label={copy.emailLabel}>
                            <span className={`type-caption ${dim} break-all`}>
                                {applicant.email}
                            </span>
                        </Row>
                        <Row label={copy.askedHead}>
                            <span className={`type-figure ${dim}`}>{applicant.askedAt}</span>
                        </Row>
                        <Row label={copy.wantedHead}>
                            <span className='flex flex-wrap justify-end gap-1'>
                                {applicant.activities.map((a) => (
                                    <ActivityBadge key={a.id} name={a.name} color={a.color} />
                                ))}
                            </span>
                        </Row>
                    </div>
                </div>

                {state === 'waiting' && (
                    <div className='border-t border-rule px-4 py-4'>
                        <p className='type-label text-muted-foreground'>{copy.nextHead}</p>
                        <p className='mt-2 type-caption text-secondary-foreground'>
                            {copy.nextBody}
                        </p>
                    </div>
                )}

                <div className='flex flex-wrap items-center gap-2.5 border-t border-rule px-4 py-4'>
                    <WhatsappAction
                        phone={adminWhatsapp}
                        label={copy.whatsapp}
                        tone={state === 'declined' ? 'primary' : 'quiet'}
                    />
                    <SignOutAction label={copy.signOut} />
                </div>
            </div>
        </main>
    );
}

/* ── B — the interstitial ───────────────────────────────────────────────── */

export function VariantB({ state, copy, communityName, adminWhatsapp }: VariantProps) {
    return (
        <main className='flex min-h-screen flex-col'>
            <IdentityRail communityName={communityName} />
            <div className='flex flex-1 items-center justify-center px-4 py-7'>
                <div className='flex w-full max-w-[40rem] flex-col items-center gap-4 text-center'>
                    <StatusMark state={state} copy={copy} />
                    <h1 className='type-display text-foreground'>{title(state, copy)}</h1>
                    <p className='type-body max-w-[52ch] text-secondary-foreground'>
                        {lead(state, copy)}
                    </p>
                    <div className='mt-2 flex flex-wrap items-center justify-center gap-2.5'>
                        <WhatsappAction
                            phone={adminWhatsapp}
                            label={copy.whatsapp}
                            tone='primary'
                        />
                        <SignOutAction label={copy.signOut} />
                    </div>
                </div>
            </div>
        </main>
    );
}

/* ── C — the waiting room with the board visible ────────────────────────── */

export function VariantC({
    state,
    copy,
    communityName,
    adminWhatsapp,
    sessions,
}: VariantProps) {
    return (
        <main className='mx-auto w-full max-w-[72rem] px-4 py-7'>
            <IdentityRail communityName={communityName} />

            <section className='mt-4 border border-rule bg-tile'>
                <div className='flex flex-wrap items-start justify-between gap-4 px-4 py-4'>
                    <div className='min-w-0 space-y-2'>
                        <StatusMark state={state} copy={copy} />
                        <h1 className='type-display text-foreground'>{title(state, copy)}</h1>
                        <p className='type-body max-w-[65ch] text-secondary-foreground'>
                            {lead(state, copy)}
                        </p>
                    </div>
                    <div className='flex flex-wrap items-center gap-2.5'>
                        <WhatsappAction
                            phone={adminWhatsapp}
                            label={copy.whatsapp}
                            tone={state === 'declined' ? 'primary' : 'quiet'}
                        />
                        <SignOutAction label={copy.signOut} />
                    </div>
                </div>
            </section>

            {/* Declined sees no schedule: the tease is only defensible while there
                is still something to wait for. */}
            {state === 'waiting' && (
                <section className='mt-7 border border-rule bg-tile'>
                    <div className='border-b border-rule px-4 py-3'>
                        <p className='type-label text-muted-foreground'>{copy.sessionsHead}</p>
                        <p className='mt-1.5 type-caption text-muted-foreground'>
                            {copy.sessionsCaption}
                        </p>
                    </div>
                    <SessionRows sessions={sessions} copy={copy} />
                </section>
            )}
        </main>
    );
}
