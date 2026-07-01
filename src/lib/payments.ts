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
import { resolvePaymentMode, currentPeriod } from '@/lib/payment-mode';

/**
 * Server-only payment writes (Story 3.2, AD-5).
 *
 * MONTHLY uniqueness is a PARTIAL unique index — `(userId, ekskulId, month,
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
  ekskulId: string;
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
  const { userId, ekskulId, month, year } = input;

  const [membership, ekskul] = await Promise.all([
    prisma.membership.findUnique({
      where: { userId_ekskulId: { userId, ekskulId } },
      select: {
        isActive: true,
        paymentMode: true,
        effectiveFrom: true,
        pendingMode: true,
        pendingEffectiveFrom: true,
      },
    }),
    prisma.ekskul.findUnique({
      where: { id: ekskulId },
      select: { allowsMonthly: true, allowsPerSession: true, monthlyFee: true },
    }),
  ]);

  // Defensive: the caller already 403s non-members, but never assume.
  if (!membership?.isActive || !ekskul) return { ok: false, reason: 'notMonthly' };

  const offered = {
    allowsMonthly: ekskul.allowsMonthly,
    allowsPerSession: ekskul.allowsPerSession,
  };
  const effective = resolvePaymentMode(membership, offered, month, year);
  if (effective !== PaymentMode.MONTHLY) return { ok: false, reason: 'notMonthly' };
  if (ekskul.monthlyFee < MIN_MONTHLY_FEE) return { ok: false, reason: 'noFee' };

  return { ok: true, amount: ekskul.monthlyFee };
}

/** The fields a monthly proof-upload writes. `amount` snapshots the fee. */
export interface MonthlyPaymentInput {
  userId: string;
  ekskulId: string;
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
  const { userId, ekskulId, amount, month, year, proofUrl, proofPath } = input;
  const filter = { userId, ekskulId, month, year, type: PaymentType.MONTHLY };
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
      data: { userId, ekskulId, month, year, type: PaymentType.MONTHLY, ...mutable },
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

/** The Session fields the register transaction needs (all server-sourced). */
export interface SessionForCharge {
  id: string;
  ekskulId: string;
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
      ekskulId: true,
      fee: true,
      date: true,
      maxPlayers: true,
      status: true,
      ekskul: { select: { allowsMonthly: true, allowsPerSession: true } },
    },
  });
  if (!session) return { ok: false, reason: 'notFound' };
  if (
    session.status === SessionStatus.CANCELLED ||
    session.status === SessionStatus.COMPLETED
  ) {
    return { ok: false, reason: 'notRegisterable' };
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_ekskulId: { userId, ekskulId: session.ekskulId } },
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
    allowsMonthly: session.ekskul.allowsMonthly,
    allowsPerSession: session.ekskul.allowsPerSession,
  };
  if (resolvePaymentMode(membership, offered, month, year) !== PaymentMode.PER_SESSION) {
    return { ok: false, reason: 'notPerSession' };
  }
  if (session.fee < MIN_SESSION_FEE) return { ok: false, reason: 'noFee' };

  const { id, ekskulId, fee, date, maxPlayers } = session;
  return { ok: true, amount: fee, month, year, session: { id, ekskulId, fee, date, maxPlayers } };
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
 * Atomically secure a per-session slot: in ONE transaction, re-check capacity
 * (Attendance count is the sole authority, AD-6), then upsert the SESSION
 * `Payment` (PENDING, amount snapshot) AND the REGISTERED `Attendance`. If the
 * last seat was taken between the gate and here, throw `SessionFullError` so the
 * whole transaction rolls back — no half-write (AD-14/NFR-3). Re-uploading resets
 * the payment to PENDING and clears any prior confirmation.
 */
export async function registerAndPaySession(input: SessionRegistrationInput) {
  const { userId, session, amount, month, year, proofUrl, proofPath } = input;
  const key = { userId_sessionId: { userId, sessionId: session.id } };

  return prisma.$transaction(async (tx) => {
    const others = await tx.attendance.count({
      where: { sessionId: session.id, userId: { not: userId }, status: { in: SEAT_HELD_STATUSES } },
    });
    const mine = await tx.attendance.findUnique({ where: key, select: { id: true } });
    if (!mine && others >= session.maxPlayers) throw new SessionFullError();

    const payment = await tx.payment.upsert({
      where: key,
      create: {
        userId,
        ekskulId: session.ekskulId,
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
        status: PaymentStatus.PENDING,
        proofUrl,
        proofPath,
        confirmedBy: null,
        confirmedAt: null,
      },
    });
    await tx.attendance.upsert({
      where: key,
      create: { userId, sessionId: session.id, status: AttendanceStatus.REGISTERED },
      update: { status: AttendanceStatus.REGISTERED },
    });
    return payment;
  });
}

/** Outcome of a member's self-cancel attempt. */
export type SeatReleaseResult =
  | { released: true }
  | { released: false; reason: 'notRegistered' | 'confirmedLocked' };

/**
 * Member self-cancel: release the seat by deleting the `Attendance` AND its
 * paired SESSION `Payment` in one transaction, so no orphaned charge remains.
 * A `CONFIRMED` (paid + admin-verified) payment is protected — the member may
 * not self-cancel it and is routed to an admin (whose reject path releases the
 * seat). Safe for monthly members: with no SESSION payment the `deleteMany` is a
 * no-op and only the free-register Attendance is removed.
 */
export async function releaseSessionSeat(input: {
  userId: string;
  sessionId: string;
}): Promise<SeatReleaseResult> {
  const { userId, sessionId } = input;

  const attendance = await prisma.attendance.findUnique({
    where: { userId_sessionId: { userId, sessionId } },
    select: { id: true },
  });
  if (!attendance) return { released: false, reason: 'notRegistered' };

  const payment = await prisma.payment.findFirst({
    where: { userId, sessionId },
    select: { status: true },
  });
  if (payment?.status === PaymentStatus.CONFIRMED) {
    return { released: false, reason: 'confirmedLocked' };
  }

  await prisma.$transaction([
    prisma.attendance.deleteMany({ where: { userId, sessionId } }),
    prisma.payment.deleteMany({ where: { userId, sessionId } }),
  ]);
  return { released: true };
}

/**
 * Whether a member may register for a Session via the FREE attendance route.
 * Only a member whose effective mode for the Session's period is `MONTHLY` may;
 * a `PER_SESSION` (or unselected) member must go through pre-pay-on-register so a
 * seat is never held without a charge (AD-6).
 */
export async function isFreeRegisterAllowed(input: {
  userId: string;
  session: { ekskulId: string; date: Date };
}): Promise<boolean> {
  const { userId, session } = input;

  const [membership, ekskul] = await Promise.all([
    prisma.membership.findUnique({
      where: { userId_ekskulId: { userId, ekskulId: session.ekskulId } },
      select: {
        isActive: true,
        paymentMode: true,
        effectiveFrom: true,
        pendingMode: true,
        pendingEffectiveFrom: true,
      },
    }),
    prisma.ekskul.findUnique({
      where: { id: session.ekskulId },
      select: { allowsMonthly: true, allowsPerSession: true },
    }),
  ]);
  if (!membership?.isActive || !ekskul) return false;

  const { month, year } = currentPeriod(session.date);
  const offered = { allowsMonthly: ekskul.allowsMonthly, allowsPerSession: ekskul.allowsPerSession };
  return resolvePaymentMode(membership, offered, month, year) === PaymentMode.MONTHLY;
}
