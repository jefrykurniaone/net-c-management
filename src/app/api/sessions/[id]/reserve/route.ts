import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureMembership } from '@/lib/activity';
import {
  adoptModeIfUnselected,
  isFreeRegisterAllowed,
  reserveSeat,
  SessionFullError,
  SessionNotRegisterableError,
} from '@/lib/payments';
import { currentPeriod, resolvePaymentMode } from '@/lib/payment-mode';
import { releaseExpiredHolds, holdExpiresAt, getHoldDurationMinutes } from '@/lib/holds';
import { isRsvpClosed } from '@/lib/rsvp';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getSettings } from '@/lib/settings';
import { isEmailConfigured, sendHoldConfirmation } from '@/lib/email';
import { PaymentMode } from '@prisma/client';
import { after, NextResponse } from 'next/server';

const SESSION_FULL_STATUS = 409;

/** The mode the member chose on a both-offered Activity; null when unspecified. */
function readMode(body: unknown): PaymentMode | null {
  const mode = (body as { mode?: unknown } | null)?.mode;
  if (mode === PaymentMode.MONTHLY) return PaymentMode.MONTHLY;
  if (mode === PaymentMode.PER_SESSION) return PaymentMode.PER_SESSION;
  return null;
}

// POST /api/sessions/[id]/reserve — reserve-then-pay. Holds a seat immediately
// (join-on-reserve, capacity-checked), adopting the chosen payment mode, then
// tells the client where to settle the resulting bill. A free-eligible seat
// (fee-0 session, or a monthly member whose dues are in) is claimed permanently
// with no bill (payUrl = null). Everyone else gets a payment hold (admin-set
// duration, default 1 hour) and is routed
// to the mode's bill: monthly dues upload, or the per-session pay page. The
// sweep runs first so a lapsed hold frees its seat before capacity is re-checked.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: sessionId } = await params;
  const userId = session.user.id;
  const t = getDictionary(await getLocale());

  await releaseExpiredHolds();

  const activitySession = await prisma.activitySession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      activityId: true,
      fee: true,
      date: true,
      startTime: true,
      status: true,
      title: true,
      location: true,
    },
  });
  if (!activitySession) {
    return NextResponse.json({ error: t.sessions.notFound }, { status: 404 });
  }
  if (activitySession.status === 'CANCELLED' || activitySession.status === 'COMPLETED') {
    return NextResponse.json({ error: t.sessions.notRegisterable }, { status: 400 });
  }
  if (isRsvpClosed(activitySession.date, activitySession.startTime)) {
    return NextResponse.json({ error: t.sessions.rsvpClosed }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const chosenMode = readMode(body);

  // Reserving a session joins its Activity, and taking a payment path IS the
  // mode choice for a member who hasn't selected one.
  if (!(await ensureMembership(userId, activitySession.activityId))) {
    return NextResponse.json({ error: t.activity.notMember }, { status: 403 });
  }
  if (chosenMode) await adoptModeIfUnselected(userId, activitySession.activityId, chosenMode);

  // Free-eligible → permanent seat, nothing to bill.
  if (await isFreeRegisterAllowed({ userId, session: activitySession })) {
    return reserve(sessionId, userId, null, null, t);
  }

  // Paid seat: the effective mode decides which bill the member owes.
  const effective = await resolveEffectiveMode(userId, activitySession.activityId, activitySession.date);
  if (effective === null) {
    return NextResponse.json({ error: t.sessions.chooseModeFirst }, { status: 400 });
  }
  const payUrl =
    effective === PaymentMode.MONTHLY ? '/payments/upload' : `/sessions/${sessionId}/pay`;
  const response = await reserve(sessionId, userId, await holdExpiresAt(), payUrl, t);
  if (response.status === RESERVED_STATUS) {
    queueHoldConfirmationEmail({
      user: session.user,
      activitySession,
      mode: effective,
      payUrl,
    });
  }
  return response;
}

const RESERVED_STATUS = 201;

/** Session fields the hold-confirmation email needs. */
interface ReservedSessionInfo {
  id: string;
  activityId: string;
  title: string;
  date: Date;
  startTime: string;
  location: string;
  fee: number;
}

/**
 * Queue the "confirm your payment or the registration expires" email after the
 * response is sent. Failures are logged, never surfaced — email is best-effort.
 */
function queueHoldConfirmationEmail(input: {
  user: { email?: string | null; name?: string | null };
  activitySession: ReservedSessionInfo;
  mode: PaymentMode;
  payUrl: string;
}) {
  const { user, activitySession, mode, payUrl } = input;
  if (!isEmailConfigured() || !user.email) return;
  const to = user.email;
  const name = user.name ?? to;

  after(async () => {
    try {
      const [locale, settings, holdMinutes, amountDue] = await Promise.all([
        getLocale(),
        getSettings(),
        getHoldDurationMinutes(),
        resolveAmountDue(mode, activitySession),
      ]);
      await sendHoldConfirmation({
        to,
        name,
        sessionTitle: activitySession.title,
        sessionDate: new Date(activitySession.date),
        startTime: activitySession.startTime,
        location: activitySession.location,
        fee: amountDue,
        holdMinutes,
        payPath: payUrl,
        communityName: settings.communityName,
        locale,
      });
    } catch (err) {
      console.error('[reserve] hold-confirmation email failed:', err);
    }
  });
}

/** The bill behind the hold: monthly dues for MONTHLY mode, session fee otherwise. */
async function resolveAmountDue(
  mode: PaymentMode,
  activitySession: ReservedSessionInfo,
): Promise<number> {
  if (mode !== PaymentMode.MONTHLY) return activitySession.fee;
  const activity = await prisma.activity.findUnique({
    where: { id: activitySession.activityId },
    select: { monthlyFee: true },
  });
  return activity?.monthlyFee ?? activitySession.fee;
}

/** Resolve the member's effective mode for the session's billing period. */
async function resolveEffectiveMode(userId: string, activityId: string, date: Date) {
  const [membership, activity] = await Promise.all([
    prisma.membership.findUnique({
      where: { userId_activityId: { userId, activityId } },
      select: { paymentMode: true, effectiveFrom: true, pendingMode: true, pendingEffectiveFrom: true },
    }),
    prisma.activity.findUnique({
      where: { id: activityId },
      select: { allowsMonthly: true, allowsPerSession: true },
    }),
  ]);
  if (!membership || !activity) return null;
  const { month, year } = currentPeriod(date);
  const offered = { allowsMonthly: activity.allowsMonthly, allowsPerSession: activity.allowsPerSession };
  return resolvePaymentMode(membership, offered, month, year);
}

/** Claim the seat (permanent when `expiresAt` is null) and return the bill URL. */
async function reserve(
  sessionId: string,
  userId: string,
  expiresAt: Date | null,
  payUrl: string | null,
  t: ReturnType<typeof getDictionary>
) {
  try {
    await reserveSeat({ userId, sessionId, expiresAt });
  } catch (error) {
    if (error instanceof SessionFullError) {
      return NextResponse.json({ error: t.sessions.sessionFull }, { status: SESSION_FULL_STATUS });
    }
    if (error instanceof SessionNotRegisterableError) {
      return NextResponse.json({ error: t.sessions.notRegisterable }, { status: 400 });
    }
    throw error;
  }
  return NextResponse.json({ payUrl }, { status: 201 });
}
