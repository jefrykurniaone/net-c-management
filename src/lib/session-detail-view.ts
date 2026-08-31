import { format } from 'date-fns';
import type { Locale as DateFnsLocale } from 'date-fns';
import type {
    AttendanceStatus,
    PaymentMode,
    PaymentStatus,
    SessionStatus,
} from '@prisma/client';
import type { SessionActionCardData } from '@/components/sessions/session-action-card';
import type { PlayerItem } from '@/components/sessions/player-list';
import { monthDayLabel } from '@/components/sessions/day-labels';
import {
    resolvePaymentMode,
    singleOfferedMode,
    currentPeriod,
    toPeriodKey,
} from './payment-mode';
import type { BillingPeriod } from './billing-period';
import { resolveDuesRate } from './dues-rate';
import { isRsvpClosed, rsvpCloseAt } from './rsvp';
import type { Dictionary } from './i18n/dictionaries';

/**
 * Every derived fact the session detail page's cards need, resolved once and
 * pure — the page reads and composes, this decides (mirrors `week-strip-view.ts`).
 */

export interface SessionDetailAttendee {
    readonly id: string;
    readonly userId: string;
    readonly status: AttendanceStatus;
    readonly user: Readonly<{ name: string | null; image: string | null }>;
}

export interface SessionDetailSession {
    readonly id: string;
    readonly activityId: string;
    readonly title: string;
    readonly date: Date;
    readonly startTime: string;
    readonly endTime: string;
    readonly location: string;
    readonly fee: number;
    readonly notes: string | null;
    readonly maxPlayers: number;
    readonly status: SessionStatus;
    readonly attendances: readonly SessionDetailAttendee[];
    /** `_count.attendances` — REGISTERED + PRESENT rows, i.e. Seats filled. */
    readonly confirmedCount: number;
}

export interface SessionDetailMembership {
    readonly isActive: boolean;
    readonly paymentMode: PaymentMode | null;
    readonly effectiveFrom: number;
    readonly pendingMode: PaymentMode | null;
    readonly pendingEffectiveFrom: number | null;
}

export interface SessionDetailInputs {
    readonly session: SessionDetailSession;
    readonly offered: Readonly<{
        allowsMonthly: boolean;
        allowsPerSession: boolean;
    }>;
    readonly duesRates: readonly Readonly<{
        amount: number;
        effectiveFrom: number;
    }>[];
    readonly membership: SessionDetailMembership | null;
    readonly sessionPayment: Readonly<{
        status: PaymentStatus;
        notes: string | null;
    }> | null;
    /** A live (pending or confirmed) monthly Payment for this Period. */
    readonly hasLiveMonthlyDues: boolean;
    readonly mySeat: Readonly<{
        status: AttendanceStatus;
        holdExpiresAt: Date | null;
    }> | null;
    readonly quota:
        | Readonly<{ committed: number; needed: number; isMet: boolean }>
        | undefined;
    readonly adminWhatsapp: string;
    readonly userId: string;
    readonly dateLocale: DateFnsLocale;
    readonly t: Dictionary;
}

export interface SessionDetailView {
    readonly rsvpStatus: AttendanceStatus | null;
    readonly players: readonly PlayerItem[];
    readonly attendeeCount: number;
    readonly fillPercent: number;
    readonly quota: SessionDetailInputs['quota'];
    readonly actionData: SessionActionCardData;
    /** "Monday, 18 August" — the facts card's own full date. */
    readonly dateLabel: string;
}

/**
 * The Session's own WIB day, read with `getUTC*` and named from the
 * dictionary. A locale-aware formatter reads the machine's zone instead,
 * which on a UTC or UTC+8 host puts a different weekday and date beside it on
 * the very same screen.
 */
function sessionDateLabel(date: Date, t: Dictionary): string {
    return `${t.days[date.getUTCDay()]}, ${monthDayLabel(date, t)}`;
}

function buildPlayers(
    session: SessionDetailSession,
    userId: string,
): PlayerItem[] {
    return session.attendances.map((a) => ({
        id: a.id,
        name: a.user.name ?? '—',
        initials:
            a.user.name
                ?.split(' ')
                .slice(0, 2)
                .map((n) => n[0])
                .join('')
                .toUpperCase() ?? '?',
        image: a.user.image ?? '',
        status: a.status,
        isYou: a.userId === userId,
    }));
}

/** A queued mode switch not yet in effect for this Session's own Period. */
function pendingSwitchNote(
    membership: SessionDetailMembership | null,
    periodKey: number,
    t: Dictionary,
): string | null {
    if (
        !membership?.pendingMode ||
        !membership.pendingEffectiveFrom ||
        periodKey >= membership.pendingEffectiveFrom
    ) {
        return null;
    }
    const modeLabel =
        membership.pendingMode === 'MONTHLY'
            ? t.paymentMode.monthly
            : t.paymentMode.perSession;
    const periodLabel = `${t.months[membership.pendingEffectiveFrom % 100]} ${Math.floor(membership.pendingEffectiveFrom / 100)}`;
    return t.sessions.modeSwitchPending
        .replace('{mode}', modeLabel)
        .replace('{period}', periodLabel);
}

/** Everything the RSVP action and the header's standing need about where the
 *  reader stands on this Session, resolved once. */
interface RsvpFacts {
    readonly rsvpStatus: AttendanceStatus | null;
    readonly isRegistered: boolean;
    readonly hasForfeitedSeat: boolean;
    readonly isFull: boolean;
    readonly isFreeSession: boolean;
    readonly rsvpClosed: boolean;
    readonly rsvpCloseLabel: string;
    readonly attendeeCount: number;
    readonly fillPercent: number;
}

function resolveRsvpFacts(
    session: SessionDetailSession,
    mySeat: SessionDetailInputs['mySeat'],
    effectiveMode: PaymentMode | null,
    hasLiveMonthlyDues: boolean,
    dateLocale: DateFnsLocale,
): RsvpFacts {
    const rsvpStatus = mySeat?.status ?? null;
    // "Registered" means holding a Seat — a MAYBE row is a tentative RSVP
    // that does not, so it isn't treated as registered for capacity/CTA.
    const isRegistered =
        rsvpStatus === 'REGISTERED' || rsvpStatus === 'PRESENT';
    // Dues buy availability for the month, not a per-Session credit, so a
    // Dues member who released this Seat forfeited it with nothing owed back.
    const hasForfeitedSeat =
        rsvpStatus === 'ABSENT' &&
        effectiveMode === 'MONTHLY' &&
        hasLiveMonthlyDues;
    const attendeeCount = session.confirmedCount;
    return {
        rsvpStatus,
        isRegistered,
        hasForfeitedSeat,
        isFull: attendeeCount >= session.maxPlayers,
        isFreeSession: session.fee === 0,
        rsvpClosed: isRsvpClosed(session.date, session.startTime),
        rsvpCloseLabel: format(
            rsvpCloseAt(session.date, session.startTime),
            'EEE, d MMM HH:mm',
            { locale: dateLocale },
        ),
        attendeeCount,
        fillPercent: Math.min((attendeeCount / session.maxPlayers) * 100, 100),
    };
}

interface ResolvedContext {
    readonly inputs: SessionDetailInputs;
    readonly period: BillingPeriod;
    readonly effectiveMode: PaymentMode | null;
    readonly duesAmount: number;
    readonly facts: RsvpFacts;
}

function buildActionData(ctx: ResolvedContext): SessionActionCardData {
    const { inputs, period, effectiveMode, duesAmount, facts } = ctx;
    const {
        session,
        offered,
        sessionPayment,
        hasLiveMonthlyDues,
        mySeat,
        adminWhatsapp,
        membership,
        t,
    } = inputs;
    return {
        sessionId: session.id,
        activityId: session.activityId,
        isRegistered: facts.isRegistered,
        isFull: facts.isFull,
        isCancelled: session.status === 'CANCELLED',
        isCompleted: session.status === 'COMPLETED',
        isRsvpClosed: facts.rsvpClosed,
        isFreeSession: facts.isFreeSession,
        rsvpStatus: facts.rsvpStatus,
        paymentMode: effectiveMode,
        allowsBothModes: offered.allowsMonthly && offered.allowsPerSession,
        sessionFee: session.fee,
        duesAmount,
        hasMonthlyPaid: hasLiveMonthlyDues,
        sessionPaymentStatus: sessionPayment?.status ?? null,
        sessionPaymentNotes: sessionPayment?.notes ?? null,
        holdExpiresAtISO: mySeat?.holdExpiresAt?.toISOString() ?? null,
        adminWhatsapp,
        hasForfeitedSeat: facts.hasForfeitedSeat,
        pendingSwitchNote: pendingSwitchNote(
            membership,
            toPeriodKey(period.month, period.year),
            t,
        ),
        rsvpCloseLabel: facts.rsvpCloseLabel,
    };
}

export function buildSessionDetailView(
    inputs: SessionDetailInputs,
): SessionDetailView {
    const {
        session,
        offered,
        duesRates,
        membership,
        mySeat,
        hasLiveMonthlyDues,
        dateLocale,
        userId,
        quota,
        t,
    } = inputs;

    const period = currentPeriod(session.date);
    const duesAmount = resolveDuesRate(duesRates, period) ?? 0;
    // Non-members may register too (join-on-register), so a missing
    // membership resolves like an unselected one: the offered set decides.
    const effectiveMode = membership?.isActive
        ? resolvePaymentMode(membership, offered, period.month, period.year)
        : singleOfferedMode(offered);
    const facts = resolveRsvpFacts(
        session,
        mySeat,
        effectiveMode,
        hasLiveMonthlyDues,
        dateLocale,
    );

    return {
        rsvpStatus: facts.rsvpStatus,
        players: buildPlayers(session, userId),
        attendeeCount: facts.attendeeCount,
        fillPercent: facts.fillPercent,
        quota,
        actionData: buildActionData({
            inputs,
            period,
            effectiveMode,
            duesAmount,
            facts,
        }),
        dateLabel: sessionDateLabel(session.date, t),
    };
}
