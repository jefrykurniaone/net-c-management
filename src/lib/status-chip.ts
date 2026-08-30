import type {
    AttendanceStatus,
    PaymentStatus,
    SessionStatus,
} from '@prisma/client';

/**
 * The Label Rule (DESIGN.md). Every state in this product is carried by a
 * **status chip**: a pill with a tinted wash, a small filled dot and a written
 * label in both locales. Colour reinforces the label; it never carries the
 * state on its own, which is what the chip's mandatory label buys.
 *
 * Five variants by semantic. A settled thing is green, a provisional thing is
 * orange, a void thing is dark red, a withdrawn or unplaced thing is neutral,
 * and an informational thing is purple.
 */
export const CHIP_VARIANTS = [
    'settled',
    'provisional',
    'void',
    'neutral',
    'info',
] as const;

export type ChipVariant = (typeof CHIP_VARIANTS)[number];

/**
 * Key into the `chips` block of the dictionary. Never a raw string: every chip
 * label ships in both English and Indonesian, so a state can only name a label
 * that exists in both.
 */
export type ChipLabelKey =
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
    /* `noShow` labels the void chip whose producer is the `NO_SHOW` attendance
       value an Admin records (docs/adr/0001-no-show-attendance-value.md).
       `unposted` labels the neutral chip a day with no Session posted draws. */
    | 'noShow'
    | 'unposted';

export interface StatusChip {
    readonly variant: ChipVariant;
    readonly labelKey: ChipLabelKey;
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
   object literal out — often twice in one row, for the chip and the value it
   labels. */
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
 * A posted Session is a real thing on the schedule, whatever point of its life
 * it is at, so all three living statuses are settled and the label says which.
 * Only a cancelled Session is void.
 */
const SESSION_CHIPS: Record<SessionStatus, StatusChip> = {
    SCHEDULED: { variant: 'settled', labelKey: 'scheduled' },
    ONGOING: { variant: 'settled', labelKey: 'ongoing' },
    COMPLETED: { variant: 'settled', labelKey: 'completed' },
    CANCELLED: { variant: 'void', labelKey: 'cancelled' },
};

const PAYMENT_CHIPS: Record<PaymentStatus, StatusChip> = {
    CONFIRMED: { variant: 'settled', labelKey: 'confirmed' },
    PENDING: { variant: 'provisional', labelKey: 'pending' },
    REJECTED: { variant: 'void', labelKey: 'rejected' },
};

/**
 * `ABSENT` is the stored name for what the glossary calls **Opted Out**: the
 * member held a Seat and released it. That is a choice, not a failure, so it is
 * neutral rather than void, and it is never surfaced as "Absent".
 *
 * `NO_SHOW` is the failure case beside it: the member held a Seat, did not
 * withdraw, and did not attend. It is recorded by an Admin and never derived
 * from a Session that ended with rows still `REGISTERED`
 * (docs/adr/0001-no-show-attendance-value.md). Void and No-Show share the void
 * variant; their labels are what tells them apart, which is the Label Rule
 * doing the work the six mark forms used to.
 */
const ATTENDANCE_CHIPS: Record<AttendanceStatus, StatusChip> = {
    REGISTERED: { variant: 'settled', labelKey: 'registered' },
    PRESENT: { variant: 'settled', labelKey: 'present' },
    MAYBE: { variant: 'provisional', labelKey: 'maybe' },
    ABSENT: { variant: 'neutral', labelKey: 'optedOut' },
    NO_SHOW: { variant: 'void', labelKey: 'noShow' },
};

/**
 * The one seam between a domain state and how it is drawn. No surface computes
 * its own status colour. Every branch is a `Record` over a closed enum, so
 * adding a state fails the build until someone decides what it looks like.
 */
export function resolveStatusChip(state: DomainState): StatusChip {
    switch (state.domain) {
        case 'session':
            return SESSION_CHIPS[state.status];
        case 'payment':
            return PAYMENT_CHIPS[state.status];
        case 'attendance':
            return ATTENDANCE_CHIPS[state.status];
    }
}
