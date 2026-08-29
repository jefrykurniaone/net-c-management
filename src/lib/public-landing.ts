import 'server-only';
import { revalidateTag, unstable_cache } from 'next/cache';
import { SessionStatus, type Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { getDictionary, type Locale } from './i18n/dictionaries';
import { wibDayKey, wibDayStartFromKey } from './wib';
import { resolveDuesRate } from './dues-rate';
import type { BillingPeriod } from './billing-period';

/**
 * The public read — the *sole* module an unauthenticated route may query
 * (wayfinder ticket 04, Rule 1, widened to every such route by ticket 12
 * decision 1). Two routes qualify today: `/` and `/s/[id]`. Every field selected
 * below is published to the open internet, since both render for people with no
 * account.
 *
 * Three standing rules govern this file. Ticket 12 promoted them to bind every
 * unauthenticated route, page body and OG card alike:
 *
 *  1. **One module owns every public read.** Hand-written `select` only — never
 *     `include`, anywhere on this path. `Activity` carries `bankName`,
 *     `bankAccountNumber`, `bankAccountHolder` and `adminWhatsapp` on the same
 *     row as `name` and the fees, so a single
 *     `include: { activity: true }` publishes all four. A per-call-site `select`
 *     discipline is how those fields eventually ship; one reviewable file is not.
 *  2. **No aggregate people-count, ever.** Not members, not attendance, not
 *     "N reserved this week". A real count is truthful, but conditional
 *     rendering ("only above 20") is evidence-shaped silence — the same lie
 *     `PRODUCT.md:94` exists to prevent. Counts of *activities* are structural
 *     rather than social proof and stay permitted; nothing on `/` asks for one,
 *     so no such read exists here.
 *  3. **An unauthenticated GET never mutates and never sends mail.** This file
 *     must therefore not call `releaseExpiredHolds` (`src/lib/holds.ts`): that
 *     is not a read — it `deleteMany`s `Attendance` rows and queues member
 *     email. Without the sweep every seat figure is stale-high, so there is no
 *     capacity data here at all — no seats-left, no Open/Full, no progress bar.
 *     Capacity truth stays behind auth, where the sweep legitimately runs.
 *
 * The no-list, confirmed and closed. Do not add these back:
 *
 *  - `Activity.bankName`, `bankAccountNumber`, `bankAccountHolder`
 *    (`PRODUCT.md:42`)
 *  - `Activity.adminWhatsapp` and `Settings.adminWhatsapp` (`PRODUCT.md:44`)
 *  - every `User` field — name, email, avatar, phone — the admin's included
 *  - every `Payment`, `Membership` and `Attendance` row, and anything derived
 *  - `Activity.maxPlayers` and every capacity-derived number (Rule 3)
 *  - `ActivitySession.location` — a per-session location can be a one-off
 *    private address; only the standing `Activity.defaultLocation` publishes
 *  - all admin-authored free text: `Activity.description`,
 *    `ActivitySession.title`, `ActivitySession.notes`. These are unvalidated
 *    `@db.Text` written under an internal-tool assumption; an admin will
 *    eventually paste a phone number, a bank line or a member's name into one.
 *    A public description field an admin fills *knowing* it is public is the
 *    honest fix, and a separate effort.
 */

/**
 * Ticket 10 added a fourth rule, about *when* rather than *what*: `/` is a
 * request-time dynamic render — it reads the session cookie and `NEXT_LOCALE`,
 * so no prerender is reachable — and the cache therefore sits on the data
 * instead of the page. Everything below is read through `unstable_cache` under
 * one tag and one window, so an anonymous hit costs **zero** Prisma
 * connections, which was the whole of the pool concern (`PRODUCT.md:72`); a
 * crawler storm then costs CPU, not connections.
 *
 * Two consequences bind anything added to this file later:
 *
 *  - **The cached payload must be JSON-safe.** `unstable_cache` stores
 *    `JSON.stringify(result)` and returns `JSON.parse` on a hit, so a `Date`
 *    comes back a string. Dates cross the boundary as ISO strings and are
 *    revived at the exported edge, so a hit and a miss return the same types.
 *  - **No cookie may be read inside a cache scope** (`unstable_cache.md:29`).
 *    Locale-dependent defaulting therefore happens per request, outside.
 */
export const PUBLIC_LANDING_TAG = 'public-landing';

/**
 * One hour — already this app's unit of "soon enough" (the `holdDurationMinutes`
 * default). It is the *floor* on freshness, not the mechanism: the tag above is
 * what actually keeps `/` honest, and the window only covers writes that escape
 * `invalidatePublicLanding()`.
 */
const REVALIDATE_SECONDS = 60 * 60;

/**
 * Published `Activity` fields. `id` is a cuid carrying no information; it is
 * here as the row key and the join key for the next-date fuse below.
 *
 * No `color`: `DESIGN.md:316` makes livery a magnet tile bearing the initial
 * with no colour, because an admin-chosen hex can be trusted neither to carry
 * legible lettering nor to clear contrast on both materials, and the column has
 * been dropped. No `icon` either — that column is gone too, for the same
 * reason: nothing ever rendered it.
 */
export const PUBLIC_ACTIVITY_SELECT = {
    id: true,
    name: true,
    recurringDay: true,
    recurringStartTime: true,
    recurringEndTime: true,
    defaultLocation: true,
    duesRates: { select: { amount: true, effectiveFrom: true } },
    sessionFee: true,
    allowsMonthly: true,
    allowsPerSession: true,
} as const satisfies Prisma.ActivitySelect;

/**
 * Published `ActivitySession` fields: when it happens, and which Activity it
 * belongs to. No `location`, `title`, `notes` or `maxPlayers` — all four are on
 * the no-list. The parent Activity's name and colour are *not* nested here
 * either: ticket 07 fused the session into the Activity row, so the label comes
 * from the Activity the caller already holds and a join would buy nothing.
 */
export const PUBLIC_SESSION_SELECT = {
    id: true,
    activityId: true,
    date: true,
    startTime: true,
    endTime: true,
} as const satisfies Prisma.ActivitySessionSelect;

type RawPublicActivity = Prisma.ActivityGetPayload<{
    select: typeof PUBLIC_ACTIVITY_SELECT;
}>;

/** The published shape: the raw `duesRates` history resolved down to the one
 *  figure the board publishes — the current Billing Period's Dues Rate
 *  (ADR 0002). The row set itself never crosses this boundary. */
export type PublicActivity = Omit<RawPublicActivity, 'duesRates'> & {
    readonly duesAmount: number;
};

export type PublicSession = Prisma.ActivitySessionGetPayload<{
    select: typeof PUBLIC_SESSION_SELECT;
}>;

export interface PublicLandingData {
    /** Active Activities, in weekly-slot order. */
    activities: PublicActivity[];
    /** At most one session per Activity: that Activity's own next date. */
    nextSessions: PublicSession[];
}

/**
 * Active Activities only, ordered by their standing weekly slot. An Activity
 * with no recurring day has no slot to sort by and sorts last; name breaks the
 * tie so the board's order is stable between renders.
 *
 * `referenceDate` is the WIB-day carrier from `wibDayStart*` — its UTC fields
 * *are* the WIB calendar day, not a real instant — so the Billing Period is
 * read off it with `getUTC*` directly rather than through `currentPeriod`,
 * which deliberately reads local-time fields off a real "now" (`billing-period.ts`).
 */
async function readActivities(referenceDate: Date): Promise<PublicActivity[]> {
    const rows = await prisma.activity.findMany({
        where: { isActive: true },
        orderBy: [
            { recurringDay: { sort: 'asc', nulls: 'last' } },
            { name: 'asc' },
        ],
        select: PUBLIC_ACTIVITY_SELECT,
    });
    const period: BillingPeriod = {
        month: referenceDate.getUTCMonth() + 1,
        year: referenceDate.getUTCFullYear(),
    };
    return rows.map(({ duesRates, ...activity }) => ({
        ...activity,
        // No rate covering the Period is a broken invariant (dues-rate.ts) —
        // read like the "no fee set" branch elsewhere, never a free Period.
        duesAmount: resolveDuesRate(duesRates, period) ?? 0,
    }));
}

/**
 * Each active Activity's own next `SCHEDULED` session, from today (WIB) onward.
 *
 * `ONGOING` and `COMPLETED` are backward-looking and `CANCELLED` on a page
 * selling the community is self-harm, so `SCHEDULED` is the only status read.
 *
 * Ticket 04 wrote this as "the next 3 sessions, ascending" for a standalone
 * schedule band. Ticket 07 dissolved that band — each Activity row carries its
 * own next date — so a global limit of 3 would print "no next date" on the
 * fourth Activity while one exists in the table. That is a falsehood of the
 * same family Rule 2 bans, so the limit moves from *rows read* to *one row per
 * Activity*: the rendered figure count still equals the number of Activities,
 * and the page is still not a schedule it must keep accurate.
 */
async function readNextSessions(dayStart: Date): Promise<PublicSession[]> {
    const rows = await prisma.activitySession.findMany({
        where: {
            status: SessionStatus.SCHEDULED,
            date: { gte: dayStart },
            activity: { isActive: true },
        },
        orderBy: { date: 'asc' },
        select: PUBLIC_SESSION_SELECT,
    });

    const nextByActivity = new Map<string, PublicSession>();
    for (const row of rows) {
        if (!nextByActivity.has(row.activityId)) {
            nextByActivity.set(row.activityId, row);
        }
    }
    return [...nextByActivity.values()];
}

/** The stored shape: `date` is an ISO string, since the cache is JSON. */
type CachedSession = Omit<PublicSession, 'date'> & { date: string };

interface CachedLanding {
    activities: PublicActivity[];
    nextSessions: CachedSession[];
}

/**
 * The WIB calendar day is an **argument**, so it is part of the cache key. That
 * is what fixes midnight rot: the `date >= today` filter would otherwise keep
 * serving yesterday's band for up to a whole window past midnight, advertising
 * a session that has already happened. Keyed this way the band rotates the
 * instant the day does, and `REVALIDATE_SECONDS` is left governing only
 * within-day freshness — one window for the whole page.
 */
const readCachedLanding = unstable_cache(
    async (dayKey: string): Promise<CachedLanding> => {
        const referenceDate = wibDayStartFromKey(dayKey);
        const [activities, sessions] = await Promise.all([
            readActivities(referenceDate),
            readNextSessions(referenceDate),
        ]);
        return {
            activities,
            nextSessions: sessions.map((row) => ({
                ...row,
                date: row.date.toISOString(),
            })),
        };
    },
    ['public-landing'],
    { tags: [PUBLIC_LANDING_TAG], revalidate: REVALIDATE_SECONDS },
);

/**
 * The one entry point `/` calls. Two small selects, no writes, no per-user
 * variance — `now` is a parameter so the WIB day boundary is testable.
 */
export async function getPublicLandingData(
    now: Date = new Date(),
): Promise<PublicLandingData> {
    const { activities, nextSessions } = await readCachedLanding(wibDayKey(now));
    return {
        activities,
        nextSessions: nextSessions.map((row) => ({
            ...row,
            date: new Date(row.date),
        })),
    };
}

/**
 * One shared session, as `/s/[id]` publishes it. The link a member pastes into
 * WhatsApp points here, so this select is judged by the same allow-list as the
 * landing's (ticket 12 decision 1) — and four fields the shipped page rendered
 * are absent from it:
 *
 *  - `maxPlayers` and the `REGISTERED`/`PRESENT` attendance count. The page
 *    printed `spotsLeft` and a progress bar from those, and the figure was not
 *    merely barred but **wrong**: without `releaseExpiredHolds` a lapsed hold
 *    stays a `REGISTERED` row, so the count ran high and the seats-left figure
 *    low. It cannot be fixed here — the sweep deletes rows and queues mail,
 *    which Rule 3 bars a public GET from doing — so capacity has no honest form
 *    on this route.
 *  - `ActivitySession.title` and `notes`, admin free text written under an
 *    internal-tool assumption (Rule 4). The Activity's name is the heading now.
 *  - `ActivitySession.location`, which can be a one-off private address. The
 *    standing `Activity.defaultLocation` publishes in its place.
 *
 * No `color`, for the same reason as on the board (`DESIGN.md:316`): an
 * admin-chosen hex clears neither contrast nor legibility on both materials, so
 * the column is gone.
 */
export const PUBLIC_SESSION_CARD_SELECT = {
    id: true,
    date: true,
    startTime: true,
    endTime: true,
    activity: {
        select: { name: true, defaultLocation: true },
    },
} as const satisfies Prisma.ActivitySessionSelect;

export type PublicSessionCard = Prisma.ActivitySessionGetPayload<{
    select: typeof PUBLIC_SESSION_CARD_SELECT;
}>;

/** The stored shape: `date` is an ISO string, since the cache is JSON. */
type CachedSessionCard = Omit<PublicSessionCard, 'date'> & { date: string };

/**
 * Keyed by session id, under the landing's tag and window. Every mutation that
 * writes a published session field already calls `invalidatePublicLanding()`
 * (the session routes and the generator cron), so a reschedule or a cancellation
 * drops this alongside the board rather than lingering for an hour.
 */
const readCachedSessionCard = unstable_cache(
    async (sessionId: string): Promise<CachedSessionCard | null> => {
        const row = await prisma.activitySession.findUnique({
            where: { id: sessionId },
            select: PUBLIC_SESSION_CARD_SELECT,
        });
        return row ? { ...row, date: row.date.toISOString() } : null;
    },
    ['public-session-card'],
    { tags: [PUBLIC_LANDING_TAG], revalidate: REVALIDATE_SECONDS },
);

/** `null` when no such session exists — the caller answers with `notFound()`. */
export async function getPublicSessionCard(
    sessionId: string,
): Promise<PublicSessionCard | null> {
    const row = await readCachedSessionCard(sessionId);
    return row ? { ...row, date: new Date(row.date) } : null;
}

/** The only two `Settings` keys an unauthenticated page may read. */
const PUBLIC_SETTINGS_KEYS = ['communityName', 'logoUrl'];

/** Community identity as stored: a blank name means "not configured". */
interface StoredIdentity {
    communityName: string;
    logoUrl: string;
}

/**
 * `/` must not call `getSettings()` (`src/lib/settings.ts`). It is a live
 * `findMany` on every call, so the hero's name and logo would keep costing a
 * connection per anonymous hit; it cannot be wrapped as it stands because it
 * reads the locale cookie internally; and it returns `adminWhatsapp`, which
 * ticket 04 bars from `/`. So identity comes through this choke point like
 * everything else, under the same tag and window.
 */
const readCachedIdentity = unstable_cache(
    async (): Promise<StoredIdentity> => {
        const rows = await prisma.settings.findMany({
            where: { key: { in: PUBLIC_SETTINGS_KEYS } },
            select: { key: true, value: true },
        });
        const map = Object.fromEntries(rows.map((row) => [row.key, row.value]));
        return {
            communityName: map.communityName?.trim() ?? '',
            logoUrl: map.logoUrl ?? '',
        };
    },
    ['public-identity'],
    { tags: [PUBLIC_LANDING_TAG], revalidate: REVALIDATE_SECONDS },
);

export interface PublicIdentity {
    communityName: string;
    logoUrl: string;
}

/**
 * Community name and logo for any unauthenticated surface. The neutral name
 * default is locale-resolved (AD-10), and that resolution happens **here**,
 * outside the cache scope — a cookie may not be read inside one.
 */
export async function getPublicIdentity(
    locale: Locale,
): Promise<PublicIdentity> {
    const stored = await readCachedIdentity();
    return {
        communityName:
            stored.communityName || getDictionary(locale).brand.unnamedCommunity,
        logoUrl: stored.logoUrl,
    };
}

/**
 * The name alone, for `/`'s own `generateMetadata` and for the OG card the
 * image route paints (ticket 12 decisions 2, 5 and 8). It is deliberately
 * *not* the root layout's caller any more: root metadata runs on every request
 * to every route, and `getSettings()` there was an uncached `findMany` that made
 * `/` cost two Settings queries per render, defeating ticket 10's
 * zero-connections-on-a-hit before the cache existed. Shares
 * `readCachedIdentity` with the page body, so the pair costs one query at most
 * and zero on a hit.
 *
 * A rename therefore moves the `<title>` and the OG image as well as the board,
 * which is the second reason the Settings routes sit in the invalidation set.
 */
export async function getPublicCommunityName(locale: Locale): Promise<string> {
    const { communityName } = await getPublicIdentity(locale);
    return communityName;
}

/**
 * Drop everything `/` publishes. Called from the mutations that write published
 * fields, and **only** those — reserve, attendance and payments publish nothing
 * here (ticket 04's ban on capacity data is what buys that), so the app's
 * highest-frequency writes never touch this cache.
 *
 * `{ expire: 0 }`, not `'max'`: `'max'` is stale-while-revalidate, which would
 * hand the next visitor the cancelled session one more time. A cached page
 * cannot re-filter, so cancelling has to expire immediately — that is the
 * correctness case this invalidation exists for.
 */
export function invalidatePublicLanding(): void {
    revalidateTag(PUBLIC_LANDING_TAG, { expire: 0 });
}
