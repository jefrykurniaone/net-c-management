import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertMembership } from "@/lib/ekskul";
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

  const activitySession = await prisma.activitySession.findUnique({
    where: { id: sessionId },
    include: { _count: { select: { attendances: true } } },
  });

  if (!activitySession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Only active members of the session's ekskul may register.
  const isMember = await assertMembership(
    session.user.id,
    activitySession.ekskulId
  );
  if (!isMember) {
    const t = getDictionary(await getLocale());
    return NextResponse.json({ error: t.ekskul.notMember }, { status: 403 });
  }

  // Per-session (and unselected) members are payment-gated — reject the free path.
  const freeAllowed = await isFreeRegisterAllowed({
    userId: session.user.id,
    session: activitySession,
  });
  if (!freeAllowed) {
    const t = getDictionary(await getLocale());
    return NextResponse.json({ error: t.sessions.payRequired }, { status: 403 });
  }

  if (activitySession.status === "CANCELLED") {
    return NextResponse.json({ error: "Session is cancelled" }, { status: 400 });
  }

  if (activitySession.status === "COMPLETED") {
    return NextResponse.json({ error: "Session already completed" }, { status: 400 });
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
