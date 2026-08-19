/**
 * PROTOTYPE — throwaway (wayfinder ticket 07).
 *
 * Shared pieces every variant composes from: the fixed hero (ticket 06 closed
 * its inventory at six elements, so it is identical in A, B and C — the variants
 * differ only *below the seam*), the band wrapper, and the two proof rows ticket
 * 04's allow-list permits.
 */

import type { CSSProperties, ReactNode } from 'react';
import { CommunityIdentityMark } from '@/components/community/identity-mark';
import { GoogleMark } from '@/components/auth/GoogleMark';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { stubJoin } from './stub-action';
import type { LandingCopy } from './proto-copy';

/* ── data shapes, exactly ticket 04's allow-list ─────────────────────────── */

export type ProtoActivity = Readonly<{
    id: string;
    name: string;
    initial: string;
    weeklySlot: string | null;
    location: string;
    feePrimary: string;
    feeSecondary: string | null;
}>;

export type ProtoSession = Readonly<{
    id: string;
    dayLabel: string;
    dateNumeral: string;
    monthLabel: string;
    activityId: string;
    activityName: string;
    activityInitial: string;
    timeLabel: string;
    location: string;
}>;

/* ── layout constants, from tickets 02 / 03 ──────────────────────────────── */

/** Ticket 03 decision 2: the hero's measure, centred in a full-bleed band. */
const HERO_MEASURE = 'max-w-[48rem]';
/** DESIGN.md:215 — the shared gutter every band below the seam aligns to. */
const BOARD_GUTTER = 'max-w-[72rem]';
/** Ticket 03 decisions 4 and 6: `112 / 56` band air, collapsing one step at 768px. */
const HERO_AIR = 'py-[56px] md:py-[112px]';
const BAND_AIR = 'py-[28px] md:py-[56px]';

/**
 * Ticket 01 decision 3: the hero band is painted board **regardless of theme**,
 * so its colours are literal rather than token-read — a token would flip to
 * enamel in light mode and take the whole decision with it.
 */
const BOARD = {
    ground: '#1B2621',
    chalk: '#E7ECE9',
    chalkSecondary: '#9AA6A0',
    accent: '#4FBF8E',
    rule: '#7A8981',
} as const;

/**
 * Ticket 02's ninth role. Not added to `type-roles.css`: that file is real code
 * and this is a throwaway. `unit` swaps `vw` for `cqw` so the phone frame
 * actually shrinks the type instead of leaving it at desktop size inside a
 * 390px box.
 */
export function heroTypeStyle(unit: 'vw' | 'cqw'): CSSProperties {
    return {
        // DEVIATION from ticket 02, with a measurement behind it. 02 specified
        // `clamp(2.5rem, 8vw, 5rem)`. At a 390px viewport the band offers 354px
        // of measure, and the Indonesian pitch's longest word — MEMAINKANNYA. —
        // renders **371px** at the 2.5rem floor, so the statement bleeds past
        // the band's padding to within 2px of the screen edge. 2.25rem brings
        // that word to 334px and it fits with room. The floor, not the cap, is
        // what breaks on a phone; handed back to 02 as its own ticket.
        fontSize: `clamp(2.25rem, 8${unit}, 5rem)`,
        fontWeight: 900,
        lineHeight: 0.95,
        letterSpacing: '-0.03em',
    };
}

/* ── the rail and the hero: fixed across all three variants ──────────────── */

/**
 * Ticket 03 decision 3: enamel, themed, above the seam, no nav. Its bottom rule
 * *is* the hero band's top edge — one rule, not two.
 */
export function IdentityRail({
    communityName,
    logoUrl,
    unit,
}: Readonly<{ communityName: string; logoUrl: string; unit: 'vw' | 'cqw' }>) {
    return (
        <header className='border-b border-rule bg-background'>
            {/* No `flex-wrap`. With it, a long community name pushed the theme
                and language controls onto a second row — a 105px rail at 390px
                with a ragged gap under the wordmark. The mark group shrinks
                instead (`min-w-0 flex-1`), so the controls stay pinned top-right
                on one row and the name wraps under itself. */}
            <div
                className={`mx-auto flex ${BOARD_GUTTER} items-center gap-block px-block py-cell`}>
                <div className='flex min-w-0 flex-1 items-center gap-cell'>
                    <CommunityIdentityMark
                        communityName={communityName}
                        logoUrl={logoUrl}
                        size='md'
                    />
                    {/* `min-w-0` + `break-words` is a **guarantee, not a
                        preference**: a single word longer than this column used
                        to paint straight over the theme toggle, so the moon sat
                        under the wordmark's last glyph and could not be read or
                        tapped. `PRODUCT.md:86,88` says every surface must
                        survive an unknown community name, and an unreachable
                        control is a functional failure where a mid-word break is
                        cosmetic. The name still wraps at its spaces first and is
                        never truncated; breaking is the last resort, not the
                        first.

                        The size is inlined rather than taking `type-mark` so the
                        phone frame stops lying: `type-mark`'s `2.4vw` reads the
                        real viewport, so inside a 390px frame on a 1440px screen
                        the wordmark rendered at 24px instead of 18px — which is
                        what made the overlap visible in the frame before it was
                        visible on a real phone. */}
                    <span
                        className='min-w-0 break-words text-foreground uppercase'
                        style={{
                            fontSize: `clamp(1.125rem, 2.4${unit}, 1.5rem)`,
                            fontWeight: 900,
                            lineHeight: 1,
                            letterSpacing: '0.14em',
                        }}>
                        {communityName}
                    </span>
                </div>
                <div className='ml-auto flex shrink-0 items-center gap-hair'>
                    <ThemeToggle compact />
                    <LanguageSwitcher compact />
                </div>
            </div>
        </header>
    );
}

/**
 * The six elements ticket 06 decision 8 closed, in its order: wordmark, pitch,
 * body sentence, pill, disclosure, quiet sign-in link.
 */
export function HeroBand({
    copy,
    communityName,
    unit,
}: Readonly<{ copy: LandingCopy; communityName: string; unit: 'vw' | 'cqw' }>) {
    return (
        <section
            className={`w-full border-t px-block ${HERO_AIR}`}
            style={{ backgroundColor: BOARD.ground, borderTopColor: BOARD.rule }}>
            <div className={`mx-auto flex ${HERO_MEASURE} flex-col items-center gap-block text-center`}>
                {/* Ticket 01: identity in the hero is the community name as a
                    wordmark in Chalk Ink, never the mark scaled up.

                    `break-words` for the same reason as the rail's, and found
                    the same way: a 43-character single-word community name
                    painted straight out of the band and off both edges of the
                    screen. Tracked caps at 0.14em make the wordmark the widest
                    thing on the page per character, so it is the *first* element
                    to fail an unknown name, not the last. Inlined with `unit` so
                    the phone frame reports the truth. */}
                <p
                    className='min-w-0 max-w-full break-words uppercase'
                    style={{
                        color: BOARD.chalk,
                        fontSize: `clamp(1.125rem, 2.4${unit}, 1.5rem)`,
                        fontWeight: 900,
                        lineHeight: 1,
                        letterSpacing: '0.14em',
                    }}>
                    {communityName}
                </p>

                <h1 className='text-balance uppercase' style={{ ...heroTypeStyle(unit), color: BOARD.chalk }}>
                    {copy.hero.pitch}
                </h1>

                <p className='type-body' style={{ color: BOARD.chalkSecondary }}>
                    {copy.hero.lead}
                </p>

                <form action={stubJoin} className='mt-cell'>
                    <input type='hidden' name='intent' value='join-primary' />
                    <button
                        type='submit'
                        aria-describedby='hero-disclosure'
                        className='type-label inline-flex items-center gap-cell rounded-[2px] px-5 py-3'
                        style={{
                            backgroundColor: BOARD.accent,
                            // Ticket 06 decision 7: ink-on-green at 6.82:1.
                            // Chalk-on-green is 2.29:1 and banned.
                            color: BOARD.ground,
                            boxShadow: `0 1px 0 ${BOARD.rule}, 0 2px 3px -1px rgb(0 0 0 / 0.3)`,
                        }}>
                        <GoogleMark className='size-5' />
                        {copy.hero.cta}
                    </button>
                </form>

                {/* Ticket 06 decision 3: body weight and secondary ink. The
                    label defers to this sentence, so it cannot be fine print. */}
                <p id='hero-disclosure' className='type-body' style={{ color: BOARD.chalkSecondary }}>
                    {copy.hero.disclosure}
                </p>

                <form action={stubJoin}>
                    <input type='hidden' name='intent' value='sign-in-secondary' />
                    <button
                        type='submit'
                        className='type-body underline underline-offset-4'
                        style={{ color: BOARD.chalkSecondary }}>
                        {copy.hero.alreadyMember}
                    </button>
                </form>
            </div>
        </section>
    );
}

/* ── band primitives below the seam ──────────────────────────────────────── */

/**
 * A full-bleed enamel band. Ticket 01 decision 4 confines painted board to the
 * hero, so everything below the seam is themed material and reads as the real
 * product. No bottom rule: the material change is the boundary.
 */
export function Band({
    children,
    tone = 'ground',
}: Readonly<{ children: ReactNode; tone?: 'ground' | 'accent' }>) {
    const surface = tone === 'accent' ? 'bg-primary-solid text-primary-solid-foreground' : 'bg-background text-foreground';
    return (
        <section className={`w-full px-block ${BAND_AIR} ${surface}`}>
            <div className={`mx-auto ${BOARD_GUTTER}`}>{children}</div>
        </section>
    );
}

/**
 * A band's opening. `weight` is the live question of whether the page below the
 * seam keeps a marketing register or drops straight into board density —
 * variant A takes Display, B and C take Title.
 */
export function BandHead({
    head,
    body,
    weight,
}: Readonly<{ head: string; body: string; weight: 'display' | 'title' }>) {
    const size = weight === 'display' ? 'type-display' : 'type-title';
    return (
        <div className='mb-block flex flex-col gap-hair'>
            <h2 className={`${size} text-balance text-foreground`}>{head}</h2>
            <p className='type-body max-w-[65ch] text-secondary-foreground'>{body}</p>
        </div>
    );
}

/**
 * DESIGN.md:284 — livery is a magnet tile bearing the Activity's initial, with
 * **no colour**. Ticket 04 publishes `Activity.color`; this is what the design
 * law does with it, which is nothing.
 */
export function Livery({ initial }: Readonly<{ initial: string }>) {
    return (
        <span className='type-figure flex size-9 shrink-0 items-center justify-center rounded-[2px] border border-rule bg-background text-secondary-foreground'>
            {initial}
        </span>
    );
}

/** The Blank mark: dashed outline, no fill, rule colour. Expected, not yet placed. */
export function BlankMark({ label }: Readonly<{ label: string }>) {
    return (
        <span className='type-label inline-block shrink-0 whitespace-nowrap rounded-[2px] border border-dashed border-rule px-2 py-1 text-subtle-foreground'>
            {label}
        </span>
    );
}

/** A ruled lattice: shared 1px rules between rows, never gaps. */
export function Lattice({ children }: Readonly<{ children: ReactNode }>) {
    return (
        <div className='divide-y divide-rule overflow-hidden rounded-[2px] border border-rule bg-card'>
            {children}
        </div>
    );
}

export function ActivityRow({
    activity,
    copy,
}: Readonly<{ activity: ProtoActivity; copy: LandingCopy }>) {
    return (
        <div className='flex flex-wrap items-baseline gap-cell p-block'>
            <Livery initial={activity.initial} />
            {/* `min-w-[14rem]` is what makes the row stack instead of squeezing:
                below that the fee wraps to its own line rather than crushing the
                weekly slot into a four-line ragged column. Seen at 390px. */}
            <div className='min-w-[14rem] flex-1'>
                <p className='type-title text-card-foreground'>{activity.name}</p>
                <p className='type-caption text-secondary-foreground'>
                    {activity.weeklySlot ?? copy.activities.empty}
                    {activity.location ? ` · ${activity.location}` : ''}
                </p>
            </div>
            <div className='ml-auto text-right'>
                <p className='type-figure text-card-foreground'>{activity.feePrimary}</p>
                {activity.feeSecondary ? (
                    <p className='type-caption text-subtle-foreground'>{activity.feeSecondary}</p>
                ) : null}
            </div>
        </div>
    );
}

/**
 * The Slot Cell, minus its top-right. DESIGN.md:282 puts free Seats as `n/max`
 * there; ticket 04 rule 3 bans every capacity figure from an unauthenticated
 * page, so on `/` the signature component runs with a hole in it.
 */
export function SessionRow({ session }: Readonly<{ session: ProtoSession }>) {
    return (
        <div className='flex flex-wrap items-center gap-block p-block'>
            <div className='w-16 shrink-0'>
                <p className='type-label text-subtle-foreground'>{session.dayLabel}</p>
                <p className='type-figure-lead text-card-foreground'>{session.dateNumeral}</p>
                <p className='type-label text-subtle-foreground'>{session.monthLabel}</p>
            </div>
            <Livery initial={session.activityInitial} />
            <div className='min-w-0 flex-1'>
                <p className='type-title text-card-foreground'>{session.activityName}</p>
                <p className='type-caption text-secondary-foreground'>
                    {session.timeLabel}
                    {session.location ? ` · ${session.location}` : ''}
                </p>
            </div>
        </div>
    );
}

/** An empty band's contents: the Blank mark plus one line. */
export function EmptyLattice({ mark, line }: Readonly<{ mark: string; line: string }>) {
    return (
        <Lattice>
            <div className='flex flex-wrap items-center gap-cell p-block'>
                <BlankMark label={mark} />
                <p className='type-body text-secondary-foreground'>{line}</p>
            </div>
        </Lattice>
    );
}

export function LandingFooter({
    communityName,
    copy,
    year,
}: Readonly<{ communityName: string; copy: LandingCopy; year: string }>) {
    return (
        <footer className='border-t border-rule bg-background'>
            <p className={`mx-auto ${BOARD_GUTTER} type-caption px-block py-cell text-muted-foreground`}>
                © <span className='tabular-nums'>{year}</span> {communityName}. {copy.footer}
            </p>
        </footer>
    );
}
