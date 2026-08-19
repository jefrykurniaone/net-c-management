/**
 * PROTOTYPE — throwaway (wayfinder ticket 07).
 *
 * Three structurally different answers to "what bands is this page made of, and
 * in what order". The hero is identical in all three — ticket 06 closed it — so
 * every difference you can see is the thing this ticket has to decide.
 *
 * Each variant answers the ticket's required field, **empty behaviour**, its own
 * way. Flip `?data=empty` to see a fresh deployment, which `PRODUCT.md:103`
 * makes the default state.
 */

import { Band, BandHead, ActivityRow, SessionRow, Lattice, EmptyLattice, BlankMark, Livery } from './parts';
import type { ProtoActivity, ProtoSession } from './parts';
import type { LandingCopy } from './proto-copy';
import { stubJoin } from './stub-action';

export type VariantProps = Readonly<{
    copy: LandingCopy;
    activities: readonly ProtoActivity[];
    sessions: readonly ProtoSession[];
}>;

/* ── A — Ledger: two proof bands, then a closing action ──────────────────── */

/**
 * Hero → Activities → Schedule → closing CTA → footer. The longest page, and
 * the one that keeps a marketing register below the seam (Display heads).
 *
 * Argues: "what you can play" and "when it next happens" are two different
 * questions a stranger asks in that order, so they get two bands and two empty
 * states. Both bands always render — DESIGN.md:217's "every day in a displayed
 * range gets a cell" logic applied to bands: showing the empty shape is more
 * honest than hiding it.
 *
 * The closing band is where this variant collides with ticket 01 decision 4:
 * a painted-board bookend would be the obvious composition and 01 forbids it,
 * so the band takes the *enamel* accent instead. Whether that reads as a second
 * CTA or as a stray coloured slab is a thing to look at, not argue about.
 */
export function VariantA({ copy, activities, sessions }: VariantProps) {
    return (
        <>
            <Band>
                <BandHead head={copy.activities.head} body={copy.activities.body} weight='display' />
                {activities.length > 0 ? (
                    <Lattice>
                        {activities.map((a) => (
                            <ActivityRow key={a.id} activity={a} copy={copy} />
                        ))}
                    </Lattice>
                ) : (
                    <EmptyLattice mark={copy.activities.emptyMark} line={copy.activities.empty} />
                )}
            </Band>

            <Band>
                <BandHead head={copy.schedule.head} body={copy.schedule.body} weight='display' />
                {sessions.length > 0 ? (
                    <Lattice>
                        {sessions.map((s) => (
                            <SessionRow key={s.id} session={s} />
                        ))}
                    </Lattice>
                ) : (
                    <EmptyLattice mark={copy.schedule.emptyMark} line={copy.schedule.empty} />
                )}
            </Band>

            <Band tone='accent'>
                <div className='flex flex-wrap items-center gap-block'>
                    <div className='min-w-0 flex-1'>
                        <h2 className='type-display'>{copy.closing.head}</h2>
                        <p className='type-body'>{copy.closing.body}</p>
                    </div>
                    <form action={stubJoin}>
                        <input type='hidden' name='intent' value='join-closing' />
                        <button
                            type='submit'
                            className='type-label rounded-[2px] bg-card px-5 py-3 text-card-foreground shadow-tile'>
                            {copy.closing.cta}
                        </button>
                    </form>
                </div>
            </Band>
        </>
    );
}

/* ── B — One board: the page becomes the product immediately ─────────────── */

/**
 * Hero → one fused band → footer. The shortest scrolling page.
 *
 * Argues there is no "activities list" and "schedule list" — there is one
 * board, and each thing you can play carries its own next date on the same row.
 * Title-weight head, board density, no marketing register at all: the seam is
 * the material change and nothing else, which is the strongest available answer
 * to "how does this not read as two websites stapled together".
 *
 * Empty behaviour: the band survives but shrinks to a single Blank-marked
 * strip. The page never loses its second band, so an empty community still gets
 * a page with a shape rather than a poster.
 *
 * The second CTA is a quiet line at the band's foot, not a slab — B's whole
 * claim is that the hero's pill is close enough on a page this short.
 */
export function VariantB({ copy, activities, sessions }: VariantProps) {
    const nextByActivity = new Map<string, ProtoSession>();
    for (const s of sessions) {
        if (!nextByActivity.has(s.activityId)) nextByActivity.set(s.activityId, s);
    }

    return (
        <Band>
            <BandHead head={copy.activities.head} body={copy.activities.body} weight='title' />
            {activities.length > 0 ? (
                <Lattice>
                    {activities.map((a) => (
                        <FusedRow key={a.id} activity={a} next={nextByActivity.get(a.id)} copy={copy} />
                    ))}
                </Lattice>
            ) : (
                <EmptyLattice mark={copy.activities.emptyMark} line={copy.activities.empty} />
            )}
            <form action={stubJoin} className='mt-block'>
                <input type='hidden' name='intent' value='join-quiet' />
                <button type='submit' className='type-body text-secondary-foreground underline underline-offset-4'>
                    {copy.closing.cta}
                </button>
            </form>
        </Band>
    );
}

/**
 * One row: the Activity, its standing weekly slot, its fee, and — where the
 * board has one — the actual next date. Where it does not, the Blank mark says
 * so on the row itself rather than in a separate empty band.
 */
function FusedRow({
    activity,
    next,
    copy,
}: Readonly<{ activity: ProtoActivity; next: ProtoSession | undefined; copy: LandingCopy }>) {
    return (
        <div className='flex flex-wrap items-baseline gap-cell p-block'>
            <Livery initial={activity.initial} />
            <div className='min-w-[14rem] flex-1'>
                <p className='type-title text-card-foreground'>{activity.name}</p>
                <p className='type-caption text-secondary-foreground'>
                    {activity.weeklySlot ?? '—'}
                    {activity.location ? ` · ${activity.location}` : ''}
                </p>
            </div>
            <div className='min-w-[10rem]'>
                {next ? (
                    <p className='type-figure text-card-foreground'>
                        {next.dayLabel} {next.dateNumeral} {next.monthLabel} · {next.timeLabel}
                    </p>
                ) : (
                    <BlankMark label={copy.schedule.emptyMark} />
                )}
            </div>
            <div className='text-right'>
                <p className='type-figure text-card-foreground'>{activity.feePrimary}</p>
                {activity.feeSecondary ? (
                    <p className='type-caption text-subtle-foreground'>{activity.feeSecondary}</p>
                ) : null}
            </div>
        </div>
    );
}

/* ── C — Schedule-led: dates first, and empty bands simply do not render ─── */

/**
 * Hero → Schedule → Activities → footer. No second CTA anywhere.
 *
 * Argues the stranger's first question is "is anything actually happening", and
 * a dated row answers it harder than a list of standing arrangements does. The
 * Activity band becomes the context you read *after* being convinced something
 * is on.
 *
 * Empty behaviour is the opposite of A's and it is the point of this variant:
 * **an empty band does not render.** A fresh deployment therefore falls all the
 * way back to hero + footer — which is exactly the "generic poster" ticket 08
 * warned about. Putting it on screen is cheaper than arguing about it.
 *
 * No second CTA: ticket 03 gave the hero one loud action and 06 fixed it as the
 * page's only one. C tests whether repeating it is help or dilution.
 */
export function VariantC({ copy, activities, sessions }: VariantProps) {
    return (
        <>
            {sessions.length > 0 ? (
                <Band>
                    <BandHead head={copy.schedule.head} body={copy.schedule.body} weight='title' />
                    <Lattice>
                        {sessions.map((s) => (
                            <SessionRow key={s.id} session={s} />
                        ))}
                    </Lattice>
                </Band>
            ) : null}

            {activities.length > 0 ? (
                <Band>
                    <BandHead head={copy.activities.head} body={copy.activities.body} weight='title' />
                    <Lattice>
                        {activities.map((a) => (
                            <ActivityRow key={a.id} activity={a} copy={copy} />
                        ))}
                    </Lattice>
                </Band>
            ) : null}
        </>
    );
}
