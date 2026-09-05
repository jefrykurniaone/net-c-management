import { redirect } from 'next/navigation';
import { STRIP_MEASURE } from '@/components/layout/measure';
import { Chip } from '@/components/ui/chip';
import { auth } from '@/lib/auth';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary, type Dictionary } from '@/lib/i18n/dictionaries';
import {
    getSessionsBoard,
    type SessionsBoardData,
    type SessionsBoardView,
} from '@/lib/sessions-board';
import {
    buildSessionsByActivity,
    type ActivitySection,
    type SectionActivity,
    type SessionCard,
} from '@/lib/sessions-by-activity';
import { resolveSessionStanding } from '@/lib/session-standing';
import {
    SessionsFilter,
    type SessionView,
} from '@/components/activity/sessions-filter';
import {
    ActivitySessionSection,
    type ActivitySectionView,
} from '@/components/sessions/activity-session-section';
import type { SessionGridCardData } from '@/components/sessions/session-grid-card';
import { slotActionFor } from '@/components/sessions/slot-action';
import { monthDayLabel } from '@/components/sessions/day-labels';

/**
 * The sessions surface: one section per Activity, each holding that Activity's
 * upcoming Sessions as cards. It is no longer a week — there is no range to
 * steer, so the page reads every Session from today forward and the soonest
 * Activity leads. The page draws no card of its own: each member surface
 * composes its own (ADR 0003), resolving state through `resolveSessionStanding`
 * and the available action through `slotActionFor`.
 */

const SESSIONS_PATH = '/sessions';

type RawParams = Record<string, string | string[] | undefined>;

function first(params: RawParams, key: string): string | undefined {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
}

/** The filter this page already has, which is also the way past a section's cap. */
function activityHref(activityId: string, view: SessionsBoardView): string {
    const params = new URLSearchParams();
    params.set('activityId', activityId);
    if (view === 'all') {
        params.set('view', 'all');
    }
    return `${SESSIONS_PATH}?${params.toString()}`;
}

/** "Tue 18 August" — the card's own heading, and the only thing that varies
 *  between two cards in one section. */
function dateLabelOf(date: Date, t: Dictionary): string {
    return `${t.sessions.boardDaysShort[date.getUTCDay()]} ${monthDayLabel(date, t)}`;
}

/** "Tuesday 18 August" — spoken into the card's accessible name, never drawn. */
function dayLabelOf(date: Date, t: Dictionary): string {
    return `${t.days[date.getUTCDay()]} ${monthDayLabel(date, t)}`;
}

function gridCardOf(
    session: SessionCard,
    activity: SectionActivity,
    board: SessionsBoardData,
    t: Dictionary,
): SessionGridCardData {
    const ownStatus = session.ownStatus ?? null;
    const seats = session.seats;
    return {
        dateLabel: dateLabelOf(session.date, t),
        dayLabel: dayLabelOf(session.date, t),
        startTime: session.startTime,
        endTime: session.endTime,
        location: session.location,
        seats,
        title: board.titleBySession.get(session.id) ?? activity.name,
        activityName: activity.name,
        href: `${SESSIONS_PATH}/${session.id}`,
        status: session.status,
        standing: resolveSessionStanding({
            status: session.status,
            ownStatus,
            holdExpiresAt: session.holdExpiresAt ?? null,
            seats,
        }),
        note: ownStatus === 'ABSENT' ? 'optedOut' : null,
        // Claiming a Seat is the common action, so it is offered where the
        // member already is. What the server will allow is re-checked there
        // under a row lock; this only decides what to put in front of them.
        action: slotActionFor({
            sessionId: session.id,
            status: session.status,
            date: session.date,
            startTime: session.startTime,
            fee: session.fee,
            ownStatus,
            seats,
            isJoined: board.joinedActivityIds.has(session.activityId),
            hasLiveDues: session.isDuesCovered,
        }),
    };
}

function sectionViewOf(
    section: ActivitySection,
    board: SessionsBoardData,
    view: SessionsBoardView,
    t: Dictionary,
): ActivitySectionView {
    return {
        key: section.activity.id,
        activityName: section.activity.name,
        activityIcon: section.activity.icon ?? null,
        total: section.total,
        cards: section.cards.map((card) => ({
            key: card.id,
            card: gridCardOf(card, section.activity, board, t),
        })),
        seeAllHref: section.isTruncated
            ? activityHref(section.activity.id, view)
            : null,
    };
}

/**
 * The surface's own designed states, both a neutral-chipped card above whatever
 * sections there are. Neutral means *expected but not yet placed*, which is the
 * honest state of a community that has just been set up — and a dropped surface
 * would read as broken rather than as quiet.
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

function BoardNotice({ label, body }: Readonly<{ label: string; body: string }>) {
    return (
        <div className='flex flex-wrap items-center gap-cell rounded-xl bg-card p-block shadow-lift'>
            <Chip variant='neutral' label={label} />
            <p className='type-caption text-secondary-foreground'>{body}</p>
        </div>
    );
}

/**
 * The page's filters. A single offered Activity is no choice at all, so the
 * Activity chips only appear once there is more than one to choose between.
 */
function BoardFilters({
    board,
    view,
    activityId,
    t,
}: Readonly<{
    board: SessionsBoardData;
    view: SessionView;
    activityId?: string;
    t: Dictionary;
}>) {
    const hasChoice = board.offered.length > 1;
    return (
        <SessionsFilter
            activities={hasChoice ? board.offered : []}
            selected={hasChoice ? activityId : undefined}
            view={view}
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
    if (!session?.user?.id) {
        redirect('/auth/signin');
    }

    const t = getDictionary(locale);
    const view: SessionsBoardView =
        first(params, 'view') === 'all' ? 'all' : 'mine';
    const activityId = first(params, 'activityId');

    const board = await getSessionsBoard({
        userId: session.user.id,
        view,
        activityId,
    });

    return (
        <SessionsSurface
            board={board}
            view={view}
            activityId={activityId}
            t={t}
        />
    );
}

/** The sessions surface itself, once the page has read what it draws. */
function SessionsSurface({
    board,
    view,
    activityId,
    t,
}: Readonly<{
    board: SessionsBoardData;
    view: SessionsBoardView;
    activityId?: string;
    t: Dictionary;
}>) {
    const notice = noticeFor(board, view, t);
    const sections = buildSessionsByActivity({
        today: board.today,
        activities: board.activities,
        sessions: board.sessions,
        joinedActivityIds: board.joinedActivityIds,
        isSingleActivitySelected: board.isSingleActivitySelected,
    }).map((section) => sectionViewOf(section, board, view, t));

    return (
        <div className={`${STRIP_MEASURE} flex flex-col gap-bay`}>
            <h1 className='type-display text-foreground'>{t.sessions.title}</h1>
            <BoardFilters
                board={board}
                view={view}
                activityId={activityId}
                t={t}
            />
            {notice && <BoardNotice label={notice.label} body={notice.body} />}
            {sections.map((section) => (
                <ActivitySessionSection
                    key={section.key}
                    section={section}
                    t={t}
                />
            ))}
        </div>
    );
}
