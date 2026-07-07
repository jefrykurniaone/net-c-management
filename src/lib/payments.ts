import 'server-only';
import {
  Prisma,
  PaymentStatus,
  PaymentType,
  PaymentMode,
  SessionStatus,
  AttendanceStatus,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { resolvePaymentMode, currentPeriod, toPeriodKey } from '@/lib/payment-mode';

/**
 * Server-only payment writes (Story 3.2, AD-5).
 *
 * MONTHLY uniqueness is a PARTIAL unique index — `(userId, activityId, month,
 * year) WHERE type = 'MONTHLY'` (see prisma/payment-monthly-unique.sql).
 * `prisma.payment.upsert` cannot target a partial index, so the monthly
 * insert-or-update is done by hand here: update-first, then create, with the
 * partial index as the race arbiter (a concurrent create that loses the race
 * throws P2002 and we fall back to update). This keeps Prisma-generated cuid
 * ids and gives every monthly billing path one race-free write.
 */

const UNIQUE_VIOLATION = 'P2002';

/** A zero fee means there are no monthly dues to raise for the Activity. */
const MIN_MONTHLY_FEE = 1;

/** Identity + billing period a monthly charge is resolved for. */
export interface MonthlyOwedInput {
  userId: string;
  activityId: string;
  month: number;
  year: number;
}

/**
 * Result of resolving the owed monthly amount for a member/Activity/period.
 * `notMonthly` — the effective mode for the period is not MONTHLY (per-session,
 * or unselected on a both-offered Activity), so no monthly charge is raised.
 * `noFee` — the Activity bills monthly but has no fee set: nothing to charge.
 */
export type MonthlyOwed =
  | { ok: true; amount: number }
  | { ok: false; reason: 'notMonthly' | 'noFee' };

/**
 * Resolve the owed monthly amount, gating on the member's effective payment
 * mode for the period (AD-7) and sourcing the amount from the Activity's current
 * `monthlyFee` (AD-8) — the amount is server-authoritative and never trusted
 * from the client (AD-2). A per-session/unselected period raises no charge.
 */
export async function resolveMonthlyOwed(input: MonthlyOwedInput): Promise<MonthlyOwed> {
  const { userId, activityId, month, year } = input;

  const [membership, activity] = await Promise.all([
    prisma.membership.findUnique({
      where: { userId_activityId: { userId, activityId } },
      select: {
        isActive: true,
        paymentMode: true,
        effectiveFrom: true,
        pendingMode: true,
        pendingEffectiveFrom: true,
      },
    }),
    prisma.activity.findUnique({
      where: { id: activityId, isActive: true },
      select: { allowsMonthly: true, allowsPerSession: true, monthlyFee: true },
    }),
  ]);

  // Defensive: the caller already 403s non-members, but never assume. A missing
  // or deactivated Activity resolves the same as `!activity` here.
  if (!membership?.isActive || !activity) return { ok: false, reason: 'notMonthly' };

  const offered = {
    allowsMonthly: activity.allowsMonthly,
    allowsPerSession: activity.allowsPerSession,
  };
  const effective = resolvePaymentMode(membership, offered, month, year);
  if (effective !== PaymentMode.MONTHLY) return { ok: false, reason: 'notMonthly' };
  if (activity.monthlyFee < MIN_MONTHLY_FEE) return { ok: false, reason: 'noFee' };

  return { ok: true, amount: activity.monthlyFee };
}

/** The fields a monthly proof-upload writes. `amount` snapshots the fee. */
export interface MonthlyPaymentInput {
  userId: string;
  activityId: string;
  amount: number;
  month: number;
  year: number;
  proofUrl: string;
  proofPath: string;
}

/**
 * Insert-or-update the single MONTHLY Payment row for a member / Activity /
 * period, race-free. Re-uploading resets it to PENDING and clears any prior
 * confirmation, matching the pre-migration upsert behavior (NFR-8).
 */
export async function upsertMonthlyPayment(input: MonthlyPaymentInput) {
  const { userId, activityId, amount, month, year, proofUrl, proofPath } = input;
  const filter = { userId, activityId, month, year, type: PaymentType.MONTHLY };
  const mutable = {
    amount,
    status: PaymentStatus.PENDING,
    proofUrl,
    proofPath,
    confirmedBy: null,
    confirmedAt: null,
  };

  const { count } = await prisma.payment.updateMany({ where: filter, data: mutable });
  if (count > 0) {
    return prisma.payment.findFirstOrThrow({ where: filter });
  }

  try {
    return await prisma.payment.create({
      data: { userId, activityId, month, year, type: PaymentType.MONTHLY, ...mutable },
    });
  } catch (error) {
    // A concurrent create won the race and the partial unique index rejected
    // this one — the row now exists, so update it instead.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === UNIQUE_VIOLATION
    ) {
      await prisma.payment.updateMany({ where: filter, data: mutable });
      return prisma.payment.findFirstOrThrow({ where: filter });
    }
    throw error;
  }
}

/* ─── Per-session pre-pay-on-register (Story 3.5, AD-6/AD-14) ─────────────── */

/** A per-session fee below this means there is nothing to charge. */
const MIN_SESSION_FEE = 1;

/** Attendance statuses that hold a seat against capacity (AD-6). */
const SEAT_HELD_STATUSES: AttendanceStatus[] = [
  AttendanceStatus.REGISTERED,
  AttendanceStatus.PRESENT,
];

/** Thrown inside `registerAndPaySession` when the last seat is lost to a race. */
export class SessionFullError extends Error {
  constructor() {
    super('Session is full');
    this.name = 'SessionFullError';
  }
}

/** Thrown when the Session is cancelled/completed by the time the lock is held. */
export class SessionNotRegisterableError extends Error {
  constructor() {
    super('Session is not open for registration');
    this.name = 'SessionNotRegisterableError';
  }
}

/** Thrown when re-uploading proof for a payment that's already been confirmed. */
export class SessionAlreadyConfirmedError extends Error {
  constructor() {
    super('Payment already confirmed');
    this.name = 'SessionAlreadyConfirmedError';
  }
}

/** The Session fields the register transaction needs (all server-sourced). */
export interface SessionForCharge {
  id: string;
  activityId: string;
  fee: number;
  date: Date;
  maxPlayers: number;
}

/**
 * Result of gating a per-session charge for a member/session. On `ok`, `amount`
 * is the Session's fee (server-authoritative, AD-2), `month`/`year` are derived
 * from the Session date (AD-13), and `session` carries what the atomic register
 * transaction needs. Every `!ok` reason maps to a specific route status.
 */
export type SessionCharge =
  | { ok: true; amount: number; month: number; year: number; session: SessionForCharge }
  | {
      ok: false;
      reason: 'notFound' | 'notMember' | 'notRegisterable' | 'notPerSession' | 'noFee';
    };

/**
 * Registering through a payment path IS an explicit mode choice: a member whose
 * effective mode for the current period is still unselected (null — Activity
 * offers both modes, nothing chosen yet) adopts `mode` from this period.
 * Uploading a per-session proof adopts PER_SESSION; free-registering on a paid
 * session adopts MONTHLY. This is not a silent default (AD-7) — the member
 * actively chose that path. A resolved mode (already selected, or single-
 * offered) is never touched, and a mode the Activity doesn't offer never sticks.
 */
export async function adoptModeIfUnselected(
  userId: string,
  activityId: string,
  mode: PaymentMode,
  now = new Date(),
): Promise<void> {
  const [membership, activity] = await Promise.all([
    prisma.membership.findUnique({
      where: { userId_activityId: { userId, activityId } },
      select: {
        isActive: true,
        paymentMode: true,
        effectiveFrom: true,
        pendingMode: true,
        pendingEffectiveFrom: true,
      },
    }),
    prisma.activity.findUnique({
      where: { id: activityId, isActive: true },
      select: { allowsMonthly: true, allowsPerSession: true },
    }),
  ]);
  if (!membership?.isActive || !activity) return;

  const offersMode =
    mode === PaymentMode.MONTHLY ? activity.allowsMonthly : activity.allowsPerSession;
  if (!offersMode) return;

  const { month, year } = currentPeriod(now);
  const offered = {
    allowsMonthly: activity.allowsMonthly,
    allowsPerSession: activity.allowsPerSession,
  };
  if (resolvePaymentMode(membership, offered, month, year) !== null) return;

  await prisma.membership.update({
    where: { userId_activityId: { userId, activityId } },
    data: {
      paymentMode: mode,
      effectiveFrom: toPeriodKey(month, year),
      pendingMode: null,
      pendingEffectiveFrom: null,
    },
  });
}

/**
 * Gate a per-session proof upload BEFORE any storage write (AD-14): the member
 * must actively belong to the Session's Activity, the Session must be open, the
 * member's effective mode for the Session's period must be `PER_SESSION` (AD-7),
 * and the Session must have a fee. Capacity is NOT checked here — it is the
 * transaction's authority (AD-6), re-checked under `registerAndPaySession`.
 */
export async function resolveSessionCharge(input: {
  userId: string;
  sessionId: string;
}): Promise<SessionCharge> {
  const { userId, sessionId } = input;

  const session = await prisma.activitySession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      activityId: true,
      fee: true,
      date: true,
      maxPlayers: true,
      status: true,
      activity: { select: { isActive: true, allowsMonthly: true, allowsPerSession: true } },
    },
  });
  if (!session?.activity.isActive) return { ok: false, reason: 'notFound' };
  if (
    session.status === SessionStatus.CANCELLED ||
    session.status === SessionStatus.COMPLETED
  ) {
    return { ok: false, reason: 'notRegisterable' };
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_activityId: { userId, activityId: session.activityId } },
    select: {
      isActive: true,
      paymentMode: true,
      effectiveFrom: true,
      pendingMode: true,
      pendingEffectiveFrom: true,
    },
  });
  if (!membership?.isActive) return { ok: false, reason: 'notMember' };

  const { month, year } = currentPeriod(session.date);
  const offered = {
    allowsMonthly: session.activity.allowsMonthly,
    allowsPerSession: session.activity.allowsPerSession,
  };
  if (resolvePaymentMode(membership, offered, month, year) !== PaymentMode.PER_SESSION) {
    return { ok: false, reason: 'notPerSession' };
  }
  if (session.fee < MIN_SESSION_FEE) return { ok: false, reason: 'noFee' };

  const { id, activityId, fee, date, maxPlayers } = session;
  return { ok: true, amount: fee, month, year, session: { id, activityId, fee, date, maxPlayers } };
}

/** The fields the atomic per-session register writes. `amount` snapshots the fee. */
export interface SessionRegistrationInput {
  userId: string;
  session: SessionForCharge;
  amount: number;
  month: number;
  year: number;
  proofUrl: string;
  proofPath: string;
}

/**
 * Atomically secure a per-session slot: in ONE transaction, lock the Session
 * row (`SELECT ... FOR UPDATE`) so concurrent registrations serialize on it,
 * re-check its status + capacity fresh under that lock (Attendance count is the
 * sole authority, AD-6), then upsert the SESSION `Payment` (PENDING, amount
 * snapshot) AND the REGISTERED `Attendance`. If the last seat was taken between
 * the gate and here, throw `SessionFullError` so the whole transaction rolls
 * back — no half-write (AD-14/NFR-3). Re-uploading resets the payment to
 * PENDING and clears any prior confirmation, unless it's already CONFIRMED.
 */
export async function registerAndPaySession(input: SessionRegistrationInput) {
  const { userId, session, amount, month, year, proofUrl, proofPath } = input;
  const key = { userId_sessionId: { userId, sessionId: session.id } };

  return prisma.$transaction(async (tx) => {
    const [locked] = await tx.$queryRaw<{ maxPlayers: number; status: SessionStatus }[]>`
      SELECT "maxPlayers", "status" FROM "ActivitySession" WHERE "id" = ${session.id} FOR UPDATE
    `;
    if (
      !locked ||
      locked.status === SessionStatus.CANCELLED ||
      locked.status === SessionStatus.COMPLETED
    ) {
      throw new SessionNotRegisterableError();
    }

    const existing = await tx.payment.findUnique({ where: key, select: { status: true } });
    if (existing?.status === PaymentStatus.CONFIRMED) {
      throw new SessionAlreadyConfirmedError();
    }

    const others = await tx.attendance.count({
      where: { sessionId: session.id, userId: { not: userId }, status: { in: SEAT_HELD_STATUSES } },
    });
    const mine = await tx.attendance.findUnique({ where: key, select: { status: true } });
    const mineHoldsSeat = mine !== null && SEAT_HELD_STATUSES.includes(mine.status);
    if (!mineHoldsSeat && others >= locked.maxPlayers) throw new SessionFullError();

    const payment = await tx.payment.upsert({
      where: key,
      create: {
        userId,
        activityId: session.activityId,
        type: PaymentType.SESSION,
        sessionId: session.id,
        amount,
        month,
        year,
        status: PaymentStatus.PENDING,
        proofUrl,
        proofPath,
      },
      update: {
        amount,
        month,
        year,
        status: PaymentStatus.PENDING,
        proofUrl,
        proofPath,
        confirmedBy: null,
        confirmedAt: null,
      },
    });
    await tx.attendance.upsert({
      where: key,
      // Paying makes the seat permanent — clear any payment hold so the sweep
      // (src/lib/holds.ts) can never release a now-funded seat.
      create: { userId, sessionId: session.id, status: AttendanceStatus.REGISTERED, holdExpiresAt: null },
      update: { status: AttendanceStatus.REGISTERED, holdExpiresAt: null },
    });
    return payment;
  });
}

/**
 * Reserve-then-pay: claim a seat before payment. In ONE transaction, lock the
 * Session row (`SELECT … FOR UPDATE`) so reservations serialize, re-check its
 * status + capacity (seat-held Attendance count is the authority, AD-6), then
 * upsert a REGISTERED `Attendance`. `expiresAt` is the payment-hold instant for
 * an unpaid reservation, or `null` to claim a permanent (funded/free) seat.
 * Reserving a seat that is already funded (a permanent seat) is a no-op — a paid
 * seat is never downgraded back into an expiring hold. No Payment is written
 * here; the unpaid bill is derived from the hold and settled on the pay path.
 */
export async function reserveSeat(input: {
  userId: string;
  sessionId: string;
  expiresAt: Date | null;
}): Promise<void> {
  const { userId, sessionId, expiresAt } = input;
  const key = { userId_sessionId: { userId, sessionId } };

  await prisma.$transaction(async (tx) => {
    const [locked] = await tx.$queryRaw<{ maxPlayers: number; status: SessionStatus }[]>`
      SELECT "maxPlayers", "status" FROM "ActivitySession" WHERE "id" = ${sessionId} FOR UPDATE
    `;
    if (
      !locked ||
      locked.status === SessionStatus.CANCELLED ||
      locked.status === SessionStatus.COMPLETED
    ) {
      throw new SessionNotRegisterableError();
    }

    const mine = await tx.attendance.findUnique({ where: key, select: { status: true, holdExpiresAt: true } });
    const mineHoldsSeat = mine !== null && SEAT_HELD_STATUSES.includes(mine.status);
    // A funded permanent seat stays as-is when re-reserved (hold path only).
    if (expiresAt !== null && mineHoldsSeat && mine.holdExpiresAt === null) return;

    if (!mineHoldsSeat) {
      const others = await tx.attendance.count({
        where: { sessionId, userId: { not: userId }, status: { in: SEAT_HELD_STATUSES } },
      });
      if (others >= locked.maxPlayers) throw new SessionFullError();
    }

    await tx.attendance.upsert({
      where: key,
      create: { userId, sessionId, status: AttendanceStatus.REGISTERED, holdExpiresAt: expiresAt },
      update: { status: AttendanceStatus.REGISTERED, holdExpiresAt: expiresAt },
    });
  });
}

/** Outcome of a member's self-cancel attempt. */
export type SeatReleaseResult =
  | { released: true }
  | { released: false; reason: 'notRegistered' | 'confirmedLocked' };

/**
 * Member self-cancel: release the seat AND its paired SESSION `Payment` in one
 * transaction, so no orphaned charge remains. A `CONFIRMED` (paid +
 * admin-verified) per-session payment is protected — the member may not
 * self-cancel it and is routed to an admin (whose reject path releases the
 * seat). The payment's status is read via `SELECT ... FOR UPDATE` inside the
 * same transaction as the writes, so a concurrent admin-confirm can't slip a
 * CONFIRMED payment past this check (no TOCTOU gap).
 *
 * A member whose MONTHLY dues cover this session's period keeps the Attendance
 * row as ABSENT instead of having it deleted: the seat is released (ABSENT
 * holds no seat), but the row records the opt-out so `syncMonthlyAttendances`
 * doesn't silently re-register them on the next page load. The skipped session
 * is forfeited — monthly dues buy availability for the month, not a per-session
 * credit. Everyone else (per-session, free-session registrants) is deleted
 * outright.
 */
export async function releaseSessionSeat(input: {
  userId: string;
  sessionId: string;
}): Promise<SeatReleaseResult> {
  const { userId, sessionId } = input;

  return prisma.$transaction(async (tx) => {
    const attendance = await tx.attendance.findUnique({
      where: { userId_sessionId: { userId, sessionId } },
      select: { id: true },
    });
    if (!attendance) return { released: false, reason: 'notRegistered' };

    const [payment] = await tx.$queryRaw<{ status: PaymentStatus }[]>`
      SELECT "status" FROM "Payment"
      WHERE "userId" = ${userId} AND "sessionId" = ${sessionId} AND "type" = 'SESSION'
      FOR UPDATE
    `;
    if (payment?.status === PaymentStatus.CONFIRMED) {
      return { released: false, reason: 'confirmedLocked' };
    }

    await tx.payment.deleteMany({ where: { userId, sessionId, type: PaymentType.SESSION } });

    const session = await tx.activitySession.findUniqueOrThrow({
      where: { id: sessionId },
      select: { activityId: true, date: true },
    });
    const { month, year } = currentPeriod(session.date);
    const monthlyPaid = await tx.payment.findFirst({
      where: {
        userId,
        activityId: session.activityId,
        type: PaymentType.MONTHLY,
        month,
        year,
        status: { in: LIVE_PAYMENT_STATUSES },
      },
      select: { id: true },
    });

    if (monthlyPaid) {
      await tx.attendance.update({
        where: { userId_sessionId: { userId, sessionId } },
        data: { status: AttendanceStatus.ABSENT },
      });
    } else {
      await tx.attendance.deleteMany({ where: { userId, sessionId } });
    }
    return { released: true };
  });
}

/** Payment statuses that hold a seat (a REJECTED payment funds nothing). */
const LIVE_PAYMENT_STATUSES: PaymentStatus[] = [
  PaymentStatus.PENDING,
  PaymentStatus.CONFIRMED,
];

/** Whether the member has uploaded/confirmed this period's monthly dues. */
export async function hasLiveMonthlyPayment(input: {
  userId: string;
  activityId: string;
  month: number;
  year: number;
}): Promise<boolean> {
  const payment = await prisma.payment.findFirst({
    where: {
      userId: input.userId,
      activityId: input.activityId,
      type: PaymentType.MONTHLY,
      month: input.month,
      year: input.year,
      status: { in: LIVE_PAYMENT_STATUSES },
    },
    select: { id: true },
  });
  return payment !== null;
}

/**
 * Whether a member may register for a Session via the FREE attendance route.
 * A seat is never held without money behind it (AD-6, extended to monthly):
 * a MONTHLY member must have this period's dues uploaded (PENDING) or
 * confirmed before they can hold a seat. Anyone may register when the
 * Session's fee is 0 (nothing to charge). Everyone else goes through
 * pre-pay-on-register.
 */
export async function isFreeRegisterAllowed(input: {
  userId: string;
  session: { activityId: string; date: Date; fee: number };
}): Promise<boolean> {
  const { userId, session } = input;

  const [membership, activity] = await Promise.all([
    prisma.membership.findUnique({
      where: { userId_activityId: { userId, activityId: session.activityId } },
      select: {
        isActive: true,
        paymentMode: true,
        effectiveFrom: true,
        pendingMode: true,
        pendingEffectiveFrom: true,
      },
    }),
    prisma.activity.findUnique({
      where: { id: session.activityId, isActive: true },
      select: { allowsMonthly: true, allowsPerSession: true },
    }),
  ]);
  if (!membership?.isActive || !activity) return false;

  // A free session has nothing to charge — any member may register, regardless
  // of mode, so a PER_SESSION member on a fee-0 session isn't left with no path.
  if (session.fee < MIN_SESSION_FEE) return true;

  const { month, year } = currentPeriod(session.date);
  const offered = { allowsMonthly: activity.allowsMonthly, allowsPerSession: activity.allowsPerSession };
  if (resolvePaymentMode(membership, offered, month, year) !== PaymentMode.MONTHLY) {
    return false;
  }
  return hasLiveMonthlyPayment({ userId, activityId: session.activityId, month, year });
}

/**
 * Register every PAID monthly member into the Activity's open sessions of a
 * billing period. A paid month buys the whole month: called after a monthly
 * proof upload (register that member everywhere) and after weekly session
 * auto-generation (backfill the new sessions with everyone already paid).
 * Idempotent — existing attendances are skipped, capacity is respected, and
 * only SCHEDULED/ONGOING sessions are touched.
 */
export async function syncMonthlyAttendances(input: {
  activityId: string;
  month: number;
  year: number;
  /** Limit to these members (e.g. the one who just paid); omit for all. */
  userIds?: string[];
}): Promise<void> {
  const { activityId, month, year, userIds } = input;

  const activity = await prisma.activity.findUnique({
    where: { id: activityId, isActive: true },
    select: { allowsMonthly: true, allowsPerSession: true },
  });
  if (!activity?.allowsMonthly) return;

  const memberships = await prisma.membership.findMany({
    where: {
      activityId,
      isActive: true,
      ...(userIds ? { userId: { in: userIds } } : {}),
    },
    select: {
      userId: true,
      paymentMode: true,
      effectiveFrom: true,
      pendingMode: true,
      pendingEffectiveFrom: true,
    },
  });
  const offered = {
    allowsMonthly: activity.allowsMonthly,
    allowsPerSession: activity.allowsPerSession,
  };
  const monthlyIds = memberships
    .filter((m) => resolvePaymentMode(m, offered, month, year) === PaymentMode.MONTHLY)
    .map((m) => m.userId);
  if (monthlyIds.length === 0) return;

  const paid = await prisma.payment.findMany({
    where: {
      activityId,
      type: PaymentType.MONTHLY,
      month,
      year,
      status: { in: LIVE_PAYMENT_STATUSES },
      userId: { in: monthlyIds },
    },
    select: { userId: true },
  });
  const paidIds = paid.map((p) => p.userId);
  if (paidIds.length === 0) return;

  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const nextMonthStart = new Date(Date.UTC(year, month, 1));

  // A paid month makes the whole month's seats permanent: clear any payment hold
  // these members still carry for this Activity's sessions this period, so the
  // sweep (src/lib/holds.ts) can't release a seat they have now funded.
  await prisma.attendance.updateMany({
    where: {
      userId: { in: paidIds },
      holdExpiresAt: { not: null },
      session: { activityId, date: { gte: monthStart, lt: nextMonthStart } },
    },
    data: { holdExpiresAt: null },
  });

  const sessions = await prisma.activitySession.findMany({
    where: {
      activityId,
      date: { gte: monthStart, lt: nextMonthStart },
      status: { in: [SessionStatus.SCHEDULED, SessionStatus.ONGOING] },
    },
    select: {
      id: true,
      maxPlayers: true,
      attendances: { select: { userId: true, status: true } },
    },
  });

  const creates: { userId: string; sessionId: string }[] = [];
  for (const session of sessions) {
    const attendees = new Set(session.attendances.map((a) => a.userId));
    const seatsHeld = session.attendances.filter((a) =>
      SEAT_HELD_STATUSES.includes(a.status),
    ).length;
    let free = session.maxPlayers - seatsHeld;
    for (const userId of paidIds) {
      if (free <= 0) break;
      if (attendees.has(userId)) continue;
      creates.push({ userId, sessionId: session.id });
      free--;
    }
  }
  if (creates.length > 0) {
    await prisma.attendance.createMany({
      data: creates.map((c) => ({ ...c, status: AttendanceStatus.REGISTERED })),
      skipDuplicates: true,
    });
  }
}

/** A member's unpaid per-session reservation — the bill the pay page settles. */
export interface OutstandingSessionBill {
  sessionId: string;
  title: string;
  fee: number;
  date: Date;
  /** The instant the payment hold lapses and the seat is released. */
  holdExpiresAt: Date;
  activity: { id: string; name: string; color: string };
}

/**
 * The member's outstanding per-session bills: seats they have reserved (a live
 * hold, `holdExpiresAt` set) on an Activity whose effective mode for that
 * session's period is PER_SESSION, and have not yet paid. A monthly member's
 * unpaid hold is intentionally excluded — that is covered by the monthly dues
 * bill, not a per-session one. Callers should sweep expired holds first
 * (releaseExpiredHolds) so only still-valid reservations surface. Bills are
 * returned soonest-session-first.
 */
export async function getOutstandingSessionBills(input: {
  userId: string;
}): Promise<OutstandingSessionBill[]> {
  const holds = await prisma.attendance.findMany({
    where: {
      userId: input.userId,
      holdExpiresAt: { not: null },
      session: { status: { in: [SessionStatus.SCHEDULED, SessionStatus.ONGOING] } },
    },
    select: {
      holdExpiresAt: true,
      session: {
        select: {
          id: true,
          title: true,
          date: true,
          fee: true,
          activityId: true,
          activity: {
            select: { id: true, name: true, color: true, allowsMonthly: true, allowsPerSession: true },
          },
        },
      },
    },
  });
  if (holds.length === 0) return [];

  const activityIds = [...new Set(holds.map((h) => h.session.activityId))];
  const memberships = await prisma.membership.findMany({
    where: { userId: input.userId, activityId: { in: activityIds }, isActive: true },
    select: {
      activityId: true,
      paymentMode: true,
      effectiveFrom: true,
      pendingMode: true,
      pendingEffectiveFrom: true,
    },
  });
  const byActivity = new Map(memberships.map((m) => [m.activityId, m]));

  const bills: OutstandingSessionBill[] = [];
  for (const hold of holds) {
    const membership = byActivity.get(hold.session.activityId);
    if (!membership) continue;
    const { month, year } = currentPeriod(hold.session.date);
    const { activity } = hold.session;
    const offered = { allowsMonthly: activity.allowsMonthly, allowsPerSession: activity.allowsPerSession };
    if (resolvePaymentMode(membership, offered, month, year) !== PaymentMode.PER_SESSION) continue;
    bills.push({
      sessionId: hold.session.id,
      title: hold.session.title,
      fee: hold.session.fee,
      date: hold.session.date,
      holdExpiresAt: hold.holdExpiresAt!,
      activity: { id: activity.id, name: activity.name, color: activity.color },
    });
  }
  return bills.sort((a, b) => a.date.getTime() - b.date.getTime());
}
