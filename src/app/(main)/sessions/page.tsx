import { redirect } from 'next/navigation';
import { COLUMN_MEASURE } from '@/components/layout/measure';
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
import {
    BoardNotice,
    SessionsBoard,
} from '@/components/sessions/sessions-board';
import { BoardWeekNav } from '@/components/sessions/board-week-nav';
import {
    boardDayViews,
    monthDayLabel,
    monthDayYearLabel,
} from '@/components/sessions/board-view';

/**
 * The sessions board. Every day of the displayed week gets a cell, whether or
 * not anything is on it â€” a day with nothing posted carries a Blank mark and
 * says so, so a member knows an Admin has not posted rather than that they are
 * missing something.
 *
 * The page reads and composes; it renders no cell of its own. One Session is
 * drawn in exactly one place in this app, the Slot Cell, and this surface is
 * one of its callers.
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
 * The board's own designed states, both of them a Blank-marked strip above a
 * board that still draws every day. Blank means *expected but not yet placed*,
 * which is the honest state of a community that has just been set up â€” and a
 * dropped surface would read as broken rather than as quiet.
 */
function noticeFor(
    board: SessionsBoardData,
    view: SessionView,
    t: Dictionary,
): { label: string; body: string } | null {
    if (!board.hasAnySession) {
        return { label: t.marks.unposted, body: t.sessions.boardNeverPosted };
    }
    if (view === 'mine' && !board.hasJoinedActivities) {
        return {
            label: t.marks.unposted,
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
        <BoardSurface
            board={board}
            view={view}
            activityId={activityId}
            week={week}
            t={t}
        />
    );
}

/** The board surface itself, once the page has read what it draws. */
function BoardSurface({
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
    const days = boardDayViews(board.days, {
        t,
        seatsBySession: board.seatsBySession,
        ownBySession: board.ownBySession,
        joinedActivityIds: board.joinedActivityIds,
    });

    return (
        <div className={`${COLUMN_MEASURE} flex flex-col gap-bay`}>
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
            {notice && <BoardNotice label={notice.label} body={notice.body} />}
            <SessionsBoard days={days} t={t} />
        </div>
    );
}
