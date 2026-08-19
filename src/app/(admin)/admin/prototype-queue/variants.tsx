/**
 * PROTOTYPE — throwaway (wayfinder ticket 11). Three answers to "where does the
 * Admin's admission queue live, and what is on a row".
 *
 * A — Band above the roster: the queue is a ruled band on `/admin/members`,
 *     the roster untouched below it. No new route, no new nav item.
 * B — Its own surface: a fifth nav item, queue only. Shows what an empty
 *     dedicated tab costs on the days nobody has asked.
 * C — One register, filtered: a single table with All / Waiting / Members /
 *     Declined, a state column, and the row action swapping to Admit/Decline.
 */

import Link from 'next/link';
import { Mark } from '@/components/ui/mark';
import { ActivityBadge } from '@/components/activity/activity-badge';
import { StubActions } from './stub-actions';
import type { QueueCopy } from './proto-copy';

export type QueuePerson = Readonly<{
    id: string;
    name: string;
    email: string;
    phone: string;
    askedAt: string;
    waitedFor: string;
    state: 'waiting' | 'member' | 'declined';
    activities: readonly Readonly<{ id: string; name: string; color: string }>[];
}>;

export type QueueFilter = 'all' | 'waiting' | 'member' | 'declined';

export type QueueVariantProps = Readonly<{
    copy: QueueCopy;
    waiting: readonly QueuePerson[];
    everyone: readonly QueuePerson[];
    filter: QueueFilter;
    filterHref: (f: QueueFilter) => string;
}>;

function StateMark({ person, copy }: Readonly<{ person: QueuePerson; copy: QueueCopy }>) {
    if (person.state === 'waiting') return <Mark kind='tape'>{copy.stateWaiting}</Mark>;
    if (person.state === 'declined') return <Mark kind='strike'>{copy.stateDeclined}</Mark>;
    return <Mark kind='ink'>{copy.stateMember}</Mark>;
}

function WhatsappLink({ phone }: Readonly<{ phone: string }>) {
    const digits = phone.replace(/\D/g, '');
    if (!digits) return <span className='type-caption text-muted-foreground'>—</span>;
    return (
        <a
            href={`https://wa.me/${digits}`}
            target='_blank'
            rel='noopener noreferrer'
            className='type-figure text-foreground underline'>
            {phone}
        </a>
    );
}

/** The one-glance row: who, how to reach them, what they want, how long they've waited. */
function ApplicantRow({
    person,
    copy,
}: Readonly<{ person: QueuePerson; copy: QueueCopy }>) {
    return (
        <li className='flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3'>
            <span className='flex min-w-0 flex-col'>
                <span className='type-title text-foreground'>{person.name}</span>
                <span className='type-caption break-all text-muted-foreground'>
                    {person.email}
                </span>
            </span>
            <WhatsappLink phone={person.phone} />
            <span className='flex flex-wrap gap-1'>
                {person.activities.length === 0 ? (
                    <span className='type-caption text-muted-foreground'>—</span>
                ) : (
                    person.activities.map((a) => (
                        <ActivityBadge key={a.id} name={a.name} color={a.color} />
                    ))
                )}
            </span>
            <span className='type-figure text-muted-foreground'>{person.waitedFor}</span>
            <StubActions
                name={person.name}
                admitLabel={copy.admit}
                declineLabel={copy.decline}
            />
        </li>
    );
}

function QueueHead({
    copy,
    count,
}: Readonly<{ copy: QueueCopy; count: number }>) {
    return (
        <div className='flex flex-wrap items-baseline justify-between gap-2 border-b border-rule px-4 py-3'>
            <span className='flex items-center gap-2'>
                <span className='type-label text-muted-foreground'>{copy.queueHead}</span>
                <span className='rounded-full bg-warning px-1.5 py-0.5 type-label text-warning-foreground'>
                    {count}
                </span>
            </span>
            <span className='type-caption text-muted-foreground'>{copy.queueHint}</span>
        </div>
    );
}

function EmptyQueue({ copy }: Readonly<{ copy: QueueCopy }>) {
    return (
        <div className='flex items-center gap-2 px-4 py-6'>
            <Mark kind='blank'>{copy.queueEmptyMark}</Mark>
            <p className='type-caption text-muted-foreground'>{copy.queueEmpty}</p>
        </div>
    );
}

/* ── A — band above the roster ──────────────────────────────────────────── */

export function QueueVariantA({ copy, waiting, everyone }: QueueVariantProps) {
    return (
        <div className='space-y-7'>
            <section className='border border-rule bg-tile'>
                <QueueHead copy={copy} count={waiting.length} />
                {waiting.length === 0 ? (
                    <EmptyQueue copy={copy} />
                ) : (
                    <ul className='divide-y divide-rule'>
                        {waiting.map((p) => (
                            <ApplicantRow key={p.id} person={p} copy={copy} />
                        ))}
                    </ul>
                )}
            </section>

            <section>
                <h2 className='type-title text-foreground'>{copy.rosterHead}</h2>
                <p className='mt-1.5 type-caption text-muted-foreground'>
                    {copy.rosterHint.replace('{n}', String(everyone.length))}
                </p>
                <ul className='mt-2.5 divide-y divide-rule border border-rule bg-tile'>
                    {everyone.slice(0, 6).map((p) => (
                        <li
                            key={p.id}
                            className='flex items-center justify-between gap-3 px-4 py-2.5'>
                            <span className='type-title text-foreground'>{p.name}</span>
                            <StateMark person={p} copy={copy} />
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}

/* ── B — its own surface ────────────────────────────────────────────────── */

export function QueueVariantB({ copy, waiting }: QueueVariantProps) {
    return (
        <div className='space-y-6'>
            <div>
                <h1 className='type-display text-foreground'>{copy.pageTitle}</h1>
                <p className='mt-1.5 type-caption text-muted-foreground'>
                    {copy.pageSubtitle.replace('{n}', String(waiting.length))}
                </p>
            </div>

            {waiting.length === 0 ? (
                <div className='border border-rule bg-tile'>
                    <EmptyQueue copy={copy} />
                </div>
            ) : (
                <ul className='divide-y divide-rule border border-rule bg-tile'>
                    {waiting.map((p) => (
                        <ApplicantRow key={p.id} person={p} copy={copy} />
                    ))}
                </ul>
            )}

            <Link href='/admin/members' className='type-label text-primary underline'>
                {copy.toRoster}
            </Link>
        </div>
    );
}

/* ── C — one register, filtered ─────────────────────────────────────────── */

const FILTERS: readonly QueueFilter[] = ['all', 'waiting', 'member', 'declined'];

export function QueueVariantC({
    copy,
    waiting,
    everyone,
    filter,
    filterHref,
}: QueueVariantProps) {
    const shown =
        filter === 'all' ? everyone : everyone.filter((p) => p.state === filter);

    return (
        <div className='space-y-6'>
            <div>
                <h1 className='type-display text-foreground'>{copy.rosterHead}</h1>
                <p className='mt-1.5 type-caption text-muted-foreground'>
                    {copy.rosterHint.replace('{n}', String(everyone.length))}
                </p>
            </div>

            <nav className='flex flex-wrap gap-1.5' aria-label={copy.filterLabel}>
                {FILTERS.map((f) => {
                    const active = f === filter;
                    const badge = f === 'waiting' && waiting.length > 0 ? ` ${waiting.length}` : '';
                    return (
                        <Link
                            key={f}
                            href={filterHref(f)}
                            aria-current={active ? 'page' : undefined}
                            className={
                                active
                                    ? 'inline-flex min-h-9 items-center rounded-[2px] border border-rule bg-accent px-3 type-label text-accent-foreground'
                                    : 'inline-flex min-h-9 items-center rounded-[2px] border border-rule bg-tile px-3 type-label text-muted-foreground'
                            }>
                            {copy.filters[f]}
                            {badge}
                        </Link>
                    );
                })}
            </nav>

            <ul className='divide-y divide-rule border border-rule bg-tile'>
                {shown.map((p) => (
                    <li
                        key={p.id}
                        className='flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3'>
                        <span className='flex min-w-0 flex-col'>
                            <span className='type-title text-foreground'>{p.name}</span>
                            <span className='type-caption break-all text-muted-foreground'>
                                {p.email}
                            </span>
                        </span>
                        <WhatsappLink phone={p.phone} />
                        <span className='flex flex-wrap gap-1'>
                            {p.activities.map((a) => (
                                <ActivityBadge key={a.id} name={a.name} color={a.color} />
                            ))}
                        </span>
                        <span className='type-caption text-muted-foreground'>{p.askedAt}</span>
                        <StateMark person={p} copy={copy} />
                        {p.state === 'waiting' && (
                            <StubActions
                                name={p.name}
                                admitLabel={copy.admit}
                                declineLabel={copy.decline}
                            />
                        )}
                    </li>
                ))}
                {shown.length === 0 && (
                    <li className='px-4 py-6 type-caption text-muted-foreground'>
                        {copy.queueEmpty}
                    </li>
                )}
            </ul>
        </div>
    );
}
