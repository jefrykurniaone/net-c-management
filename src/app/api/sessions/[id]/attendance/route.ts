import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureMembership } from "@/lib/ekskul";
import { isFreeRegisterAllowed, releaseSessionSeat } from "@/lib/payments";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { NextResponse } from "next/server";

// POST /api/sessions/[id]/attendance — free RSVP. Only MONTHLY-mode members may
// register here; PER_SESSION (or unselected) members must pre-pay-on-register via
// POST /api/payments/upload so a seat is never held without a charge (AD-6).
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sessionId } = await params;

  // Capacity counts only seat-holding rows — an ABSENT row (a monthly member
  // who cancelled this session) has released its seat.
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

  // Registering for a session implies joining its Activity — but only a fee-0
  // session may auto-join here (nothing to charge). Paid sessions join through
  // a payment path instead (dues upload or per-session pre-pay), so a failed
  // register never leaves a membership behind without money on the table.
  if (activitySession.fee === 0) {
    const joined = await ensureMembership(
      session.user.id,
      activitySession.ekskulId
    );
    if (!joined) {
      const t = getDictionary(await getLocale());
      return NextResponse.json({ error: t.ekskul.notMember }, { status: 403 });
    }
  }

  if (activitySession.status === "CANCELLED") {
    return NextResponse.json({ error: "Session is cancelled" }, { status: 400 });
  }

  if (activitySession.status === "COMPLETED") {
    return NextResponse.json({ error: "Session already completed" }, { status: 400 });
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

  // Upsert to handle re-registration
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
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sessionId } = await params;

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

  return NextResponse.json({ success: true });
}
