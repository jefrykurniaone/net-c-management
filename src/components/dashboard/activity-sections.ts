import type { PaymentMode } from '@prisma/client';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { DashboardSessionsBoard } from '@/lib/dashboard-sessions';
import type { DashboardActivity } from '@/components/dashboard/activity-summary-card';
import {
    dashboardActivityCards,
    type DashboardCardContext,
    type DashboardCardView,
} from '@/components/dashboard/activity-card-view';

/**
 * "Your activities" resolved to finished card props — one entry per Activity
 * this member is on, in the order the section draws them.
 *
 * **Why the resolution is here and not in the markup.** Picking this
 * Activity's board out of the batch and flattening it into cards is a
 * derivation, and it used to sit inside the `.map()` of the page's JSX, where
 * it was neither readable nor reachable from a test. The section component
 * that consumes this list now only draws; `activity-card-view.ts` still owns
 * what one card says (ADR 0003).
 *
 * **Pure**: no database and no clock of its own.
 */

/** The Membership fields the section needs: the Activity it is on. */
export interface ActivitySectionMembership {
    readonly activity: DashboardActivity;
}

/** One Activity's card on the dashboard, resolved down to what it draws. */
export interface ActivitySectionView {
    readonly key: string;
    readonly activity: DashboardActivity;
    readonly paymentMode: PaymentMode | null;
    readonly cards: readonly DashboardCardView[];
}

export interface ActivitySectionsInput {
    readonly activities: readonly DashboardActivity[];
    readonly board: DashboardSessionsBoard;
    readonly paymentModeByActivity: ReadonlyMap<string, PaymentMode | null>;
    readonly t: Dictionary;
    readonly now: Date;
}

/**
 * The member's Activities, by name — the order both this section and the Dues
 * resolution read them in, so the banner names the same first Activity the
 * cards start with.
 */
export function memberActivities(
    memberships: readonly ActivitySectionMembership[],
): DashboardActivity[] {
    return memberships
        .map((m) => ({
            id: m.activity.id,
            name: m.activity.name,
            icon: m.activity.icon ?? null,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

export function resolveActivitySections(
    input: ActivitySectionsInput,
): ActivitySectionView[] {
    const { activities, board, paymentModeByActivity, t, now } = input;
    const boardsByActivity = new Map(
        board.boards.map((activityBoard) => [activityBoard.activityId, activityBoard]),
    );
    const cardContext: DashboardCardContext = {
        t,
        seatsBySession: board.seatsBySession,
        ownBySession: board.ownBySession,
        holdBySession: board.holdBySession,
        duesCoveredSessionIds: board.duesCoveredSessionIds,
        now,
    };

    return activities.map((activity) => ({
        key: activity.id,
        activity,
        paymentMode: paymentModeByActivity.get(activity.id) ?? null,
        cards: dashboardActivityCards(
            boardsByActivity.get(activity.id)?.days ?? [],
            cardContext,
        ),
    }));
}
