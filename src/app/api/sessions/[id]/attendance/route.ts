import { auth } from "@/lib/auth";
import { admissionDenied, isAdmittedSession } from "@/lib/admission";
import { prisma } from "@/lib/prisma";
import { ensureMembership } from "@/lib/activity";
import { isFreeRegisterAllowed, releaseSessionSeat } from "@/lib/payments";
import { releaseExpiredHolds } from "@/lib/holds";
import { isRsvpClosed } from "@/lib/rsvp";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { NextResponse } from "next/server";

/** RSVP intent the client may send. Absent/GOING = a seat-holding registration. */
type RsvpIntent = "GOING" | "MAYBE";

async function readIntent(req: Request): Promise<RsvpIntent> {
  try {
    const body = await req.json();
    return body?.intent === "MAYBE" ? "MAYBE" : "GOING";
  } catch {
    return "GOING";
  }
}

// POST /api/sessions/[id]/attendance — free RSVP. GOING holds a seat: only
// MONTHLY-mode members (dues in) or fee-0 sessions may take one here; everyone
// else pre-pays via POST /api/payments/upload so a seat is never held without a
// charge (AD-6). MAYBE is a tentative RSVP that holds no seat and owes nothing,
// so it is allowed only on fee-0 sessions.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!isAdmittedSession(session)) {
    return admissionDenied(session);
  }

  const { id: sessionId } = await params;
  const intent = await readIntent(req);

  // Free lapsed holds before capacity is read, so an expired reservation's seat
  // is available to this registration.
  await releaseExpiredHolds();

  // Capacity counts only seat-holding rows — an ABSENT row (a monthly member
  // who cancelled this session) or a MAYBE row holds no seat.
  const activitySession = await prisma.activitySession.findUnique({
    where: { id: sessionId },
    include: {
      _count: {
        select: {
          attendances: {
            where: { status: { in: ["REGISTERED", "PRESENT"] } },
          },
        },
      },
    },
  });

  if (!activitySession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (activitySession.status === "CANCELLED") {
    return NextResponse.json({ error: "Session is cancelled" }, { status: 400 });
  }

  if (activitySession.status === "COMPLETED") {
    return NextResponse.json({ error: "Session already completed" }, { status: 400 });
  }

  // RSVP window closes a fixed lead time before start — no new intent after.
  if (isRsvpClosed(activitySession.date, activitySession.startTime)) {
    const t = getDictionary(await getLocale());
    return NextResponse.json({ error: t.sessions.rsvpClosed }, { status: 403 });
  }

  // Registering for a session implies joining its Activity — but only a fee-0
  // session may auto-join here (nothing to charge). Paid sessions join through
  // a payment path instead (dues upload or per-session pre-pay), so a failed
  // register never leaves a membership behind without money on the table.
  if (activitySession.fee === 0) {
    const joined = await ensureMembership(
      session.user.id,
      activitySession.activityId
    );
    if (!joined) {
      const t = getDictionary(await getLocale());
      return NextResponse.json({ error: t.activity.notMember }, { status: 403 });
    }
  }

  // A tentative "maybe" holds no seat and costs nothing — only meaningful on a
  // free session (a paid seat must be committed + funded, never tentative).
  if (intent === "MAYBE") {
    if (activitySession.fee !== 0) {
      const t = getDictionary(await getLocale());
      return NextResponse.json({ error: t.sessions.payRequired }, { status: 403 });
    }
    const attendance = await prisma.attendance.upsert({
      where: { userId_sessionId: { userId: session.user.id, sessionId } },
      create: { userId: session.user.id, sessionId, status: "MAYBE" },
      update: { status: "MAYBE" },
    });
    return NextResponse.json(attendance, { status: 201 });
  }

  // Per-session (and unselected) members are payment-gated — reject the free
  // path. Monthly members are gated too: this period's dues must be uploaded
  // first (seat lock follows money; the MONTHLY mode itself is adopted on the
  // dues-upload path, never here).
  const freeAllowed = await isFreeRegisterAllowed({
    userId: session.user.id,
    session: activitySession,
  });
  if (!freeAllowed) {
    const t = getDictionary(await getLocale());
    return NextResponse.json({ error: t.sessions.payRequired }, { status: 403 });
  }

  if (activitySession._count.attendances >= activitySession.maxPlayers) {
    return NextResponse.json({ error: "Session is full" }, { status: 400 });
  }

  // Upsert to handle re-registration (including switching from MAYBE to GOING).
  const attendance = await prisma.attendance.upsert({
    where: {
      userId_sessionId: {
        userId: session.user.id,
        sessionId,
      },
    },
    create: {
      userId: session.user.id,
      sessionId,
      status: "REGISTERED",
    },
    update: {
      status: "REGISTERED",
    },
  });

  return NextResponse.json(attendance, { status: 201 });
}

// DELETE /api/sessions/[id]/attendance — cancel registration. Releases the seat
// and removes any paired PENDING/REJECTED SESSION Payment atomically; a CONFIRMED
// payment blocks self-cancel (admin-only via reject) (AD-6).
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!isAdmittedSession(session)) {
    return admissionDenied(session);
  }

  const { id: sessionId } = await params;

  await releaseExpiredHolds();

  const result = await releaseSessionSeat({ userId: session.user.id, sessionId });
  if (!result.released) {
    if (result.reason === "confirmedLocked") {
      const t = getDictionary(await getLocale());
      return NextResponse.json(
        { error: t.sessions.cancelBlockedConfirmed },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: "Not registered" }, { status: 404 });
  }

  // isForfeited says the seat was released but the money stays spent (monthly
  // dues cover the month, not this session), so the client can say so instead of
  // letting the member expect a credit.
  return NextResponse.json({ success: true, isForfeited: result.isForfeited });
}
