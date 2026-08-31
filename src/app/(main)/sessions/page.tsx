import { redirect } from 'next/navigation';
import { STRIP_MEASURE } from '@/components/layout/measure';
import { auth } from '@/lib/auth';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary, type Dictionary } from '@/lib/i18n/dictionaries';
import {
    getSessionsBoard,
    type SessionsBoardData,
    type SessionsBoardView,
} from '@/lib/sessions-board';
import {
    SessionsFilter,
    type SessionView,
} from '@/components/activity/sessions-filter';
import { StripNotice, WeekStrip } from '@/components/sessions/week-strip';
import { BoardWeekNav } from '@/components/sessions/board-week-nav';
import { weekStripDays } from '@/components/sessions/week-strip-view';
import {
    monthDayLabel,
    monthDayYearLabel,
} from '@/components/sessions/day-labels';

/**
 * The sessions surface: the chosen week as a strip of seven day columns on a
 * wide screen, one column on a phone. Every day of the week gets a column
 * whether or not anything is on it — a day with nothing posted carries a
 * neutral chip and says so, so a member knows an Admin has not posted rather
 * than that they are missing something.
 *
 * The page reads and composes; it draws no card of its own. Each member surface
 * composes its own Session card (ADR 0003) and every one of them resolves state
 * through `resolveSessionStanding` and the available action through
 * `slotActionFor`, so behaviour has one source even though drawing does not.
 */

const SESSIONS_PATH = '/sessions';

type RawParams = Record<string, string | string[] | undefined>;

function first(params: RawParams, key: string): string | undefined {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
}

/** The reader's scope, carried onto every week link so it survives navigation. */
function scopeParams(view: SessionView, activityId?: string): URLSearchParams {
    const params = new URLSearchParams();
    if (activityId) params.set('activityId', activityId);
    if (view === 'all') params.set('view', 'all');
    return params;
}

function weekHref(scope: URLSearchParams, week: string): string {
    const params = new URLSearchParams(scope);
    params.set('week', week);
    return `${SESSIONS_PATH}?${params.toString()}`;
}

/**
 * The surface's own designed states, both of them a neutral-chipped card above a
 * strip that still draws every day. Neutral means *expected but not yet placed*,
 * which is the honest state of a community that has just been set up — and a
 * dropped surface would read as broken rather than as quiet.
 */
function noticeFor(
    board: SessionsBoardData,
    view: SessionView,
    t: Dictionary,
): { label: string; body: string } | null {
    if (!board.hasAnySession) {
        return { label: t.chips.unposted, body: t.sessions.boardNeverPosted };
    }
    if (view === 'mine' && !board.hasJoinedActivities) {
        return {
            label: t.chips.unposted,
            body: t.sessions.noJoinedActivities,
        };
    }
    return null;
}

/** Which week is on screen, and the way to the weeks either side of it. */
function WeekNav({
    board,
    scope,
    t,
}: Readonly<{
    board: SessionsBoardData;
    scope: URLSearchParams;
    t: Dictionary;
}>) {
    return (
        <BoardWeekNav
            caption={t.sessions.boardWeekOf
                .replace('{start}', monthDayLabel(board.weekStart, t))
                .replace('{end}', monthDayYearLabel(board.weekEnd, t))}
            prevHref={weekHref(scope, board.prevWeekKey)}
            thisHref={weekHref(scope, board.thisWeekKey)}
            nextHref={weekHref(scope, board.nextWeekKey)}
            t={t}
        />
    );
}

/**
 * The board's filters. A single offered Activity is no choice at all, so the
 * Activity chips only appear once there is more than one to choose between.
 */
function BoardFilters({
    board,
    view,
    activityId,
    week,
    t,
}: Readonly<{
    board: SessionsBoardData;
    view: SessionView;
    activityId?: string;
    week?: string;
    t: Dictionary;
}>) {
    const hasChoice = board.offered.length > 1;
    return (
        <SessionsFilter
            activities={hasChoice ? board.offered : []}
            selected={hasChoice ? activityId : undefined}
            view={view}
            week={week}
            labels={{
                all: t.sessions.chipAll,
                viewMine: t.sessions.viewMine,
                viewAll: t.sessions.viewAll,
            }}
        />
    );
}

export default async function SessionsPage({
    searchParams,
}: Readonly<{ searchParams: Promise<RawParams> }>) {
    const [session, locale, params] = await Promise.all([
        auth(),
        getLocale(),
        searchParams,
    ]);
    if (!session?.user?.id) redirect('/auth/signin');

    const t = getDictionary(locale);
    const view: SessionsBoardView =
        first(params, 'view') === 'all' ? 'all' : 'mine';
    const activityId = first(params, 'activityId');
    const week = first(params, 'week');

    const board = await getSessionsBoard({
        userId: session.user.id,
        view,
        activityId,
        weekKey: week,
    });

    return (
        <StripSurface
            board={board}
            view={view}
            activityId={activityId}
            week={week}
            t={t}
        />
    );
}

/** The sessions surface itself, once the page has read what it draws. */
function StripSurface({
    board,
    view,
    activityId,
    week,
    t,
}: Readonly<{
    board: SessionsBoardData;
    view: SessionsBoardView;
    activityId?: string;
    week?: string;
    t: Dictionary;
}>) {
    const notice = noticeFor(board, view, t);
    const days = weekStripDays(board.days, {
        t,
        seatsBySession: board.seatsBySession,
        ownBySession: board.ownBySession,
        holdBySession: board.holdBySession,
        joinedActivityIds: board.joinedActivityIds,
        duesCoveredSessionIds: board.duesCoveredSessionIds,
    });

    return (
        <div className={`${STRIP_MEASURE} flex flex-col gap-bay`}>
            <h1 className='type-display text-foreground'>{t.sessions.title}</h1>
            <BoardFilters
                board={board}
                view={view}
                activityId={activityId}
                week={week}
                t={t}
            />
            <WeekNav
                board={board}
                scope={scopeParams(view, activityId)}
                t={t}
            />
            {notice && <StripNotice label={notice.label} body={notice.body} />}
            <WeekStrip days={days} t={t} />
        </div>
    );
}
