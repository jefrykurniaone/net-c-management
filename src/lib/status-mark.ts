import type {
    AttendanceStatus,
    PaymentStatus,
    SessionStatus,
} from '@prisma/client';

/**
 * The Mark-Not-Hue Rule (DESIGN.md). Every state in this product is carried by
 * a mark whose *form* says what it is; colour only reinforces it. Remove all
 * colour and every state is still readable.
 *
 * A settled thing is written in ink. A provisional thing is held with tape.
 * A void thing is struck through. A withdrawn thing is erased. A thing nobody
 * has placed yet is left blank. A thing that should have happened and didn't
 * is left hollow.
 */
export const MARK_KINDS = [
    'ink',
    'tape',
    'strike',
    'erased',
    'blank',
    'hollow',
] as const;

export type MarkKind = (typeof MARK_KINDS)[number];

/**
 * Key into the `marks` block of the dictionary. Never a raw string: every mark
 * label ships in both English and Indonesian, so a state can only name a label
 * that exists in both.
 */
export type MarkLabelKey =
    | 'scheduled'
    | 'ongoing'
    | 'completed'
    | 'cancelled'
    | 'confirmed'
    | 'pending'
    | 'rejected'
    | 'registered'
    | 'maybe'
    | 'present'
    | 'optedOut'
    /* `noShow` labels the Hollow mark, whose producer is the `NO_SHOW`
       attendance value an Admin records (docs/adr/0001-no-show-attendance-value.md).
       `unposted` labels the Blank a day with no Session posted draws. */
    | 'noShow'
    | 'unposted';

export interface StatusMark {
    readonly kind: MarkKind;
    readonly labelKey: MarkLabelKey;
}

/**
 * A state of a thing with a lifecycle — a Session, a Payment, a Seat. A Role is
 * deliberately not in here: it is a standing property of a person rather than a
 * state of a thing, so it takes a tracked-caps label. Whether an account is
 * active follows the Role, being the same shape of fact about the same person.
 */
export type DomainState =
    | { domain: 'session'; status: SessionStatus }
    | { domain: 'payment'; status: PaymentStatus }
    | { domain: 'attendance'; status: AttendanceStatus };

/* Constructors, so a call site names the domain once instead of spelling the
   object literal out — often twice in one row, for the mark and the value it
   marks. */
export const sessionState = (status: SessionStatus): DomainState => ({
    domain: 'session',
    status,
});

export const paymentState = (status: PaymentStatus): DomainState => ({
    domain: 'payment',
    status,
});

export const attendanceState = (status: AttendanceStatus): DomainState => ({
    domain: 'attendance',
    status,
});

/**
 * A posted Session is a real thing on the board, whatever point of its life it
 * is at, so all three living statuses are written in ink and the label says
 * which. Only a cancelled Session is void.
 */
const SESSION_MARKS: Record<SessionStatus, StatusMark> = {
    SCHEDULED: { kind: 'ink', labelKey: 'scheduled' },
    ONGOING: { kind: 'ink', labelKey: 'ongoing' },
    COMPLETED: { kind: 'ink', labelKey: 'completed' },
    CANCELLED: { kind: 'strike', labelKey: 'cancelled' },
};

const PAYMENT_MARKS: Record<PaymentStatus, StatusMark> = {
    CONFIRMED: { kind: 'ink', labelKey: 'confirmed' },
    PENDING: { kind: 'tape', labelKey: 'pending' },
    REJECTED: { kind: 'strike', labelKey: 'rejected' },
};

/**
 * `ABSENT` is the stored name for what the glossary calls **Opted Out**: the
 * member held a Seat and released it. That is a choice, not a failure, so it
 * is erased — flat and colourless — and never surfaced as "Absent".
 *
 * `NO_SHOW` is the failure case beside it: the member held a Seat, did not
 * withdraw, and did not attend. Nobody decided, so it is hollow. It is recorded
 * by an Admin and never derived from a Session that ended with rows still
 * `REGISTERED` (docs/adr/0001-no-show-attendance-value.md).
 */
const ATTENDANCE_MARKS: Record<AttendanceStatus, StatusMark> = {
    REGISTERED: { kind: 'ink', labelKey: 'registered' },
    PRESENT: { kind: 'ink', labelKey: 'present' },
    MAYBE: { kind: 'tape', labelKey: 'maybe' },
    ABSENT: { kind: 'erased', labelKey: 'optedOut' },
    NO_SHOW: { kind: 'hollow', labelKey: 'noShow' },
};

/**
 * The one seam between a domain state and how it is drawn. No surface computes
 * its own status colour. Every branch is a `Record` over a closed enum, so
 * adding a state fails the build until someone decides what it looks like.
 */
export function resolveStatusMark(state: DomainState): StatusMark {
    switch (state.domain) {
        case 'session':
            return SESSION_MARKS[state.status];
        case 'payment':
            return PAYMENT_MARKS[state.status];
        case 'attendance':
            return ATTENDANCE_MARKS[state.status];
    }
}
