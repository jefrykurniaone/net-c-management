import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertMembership } from "@/lib/ekskul";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { NextResponse } from "next/server";

// POST /api/sessions/[id]/attendance — RSVP / register attendance
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sessionId } = await params;

  const badmintonSession = await prisma.badmintonSession.findUnique({
    where: { id: sessionId },
    include: { _count: { select: { attendances: true } } },
  });

  if (!badmintonSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Only active members of the session's ekskul may register.
  const isMember = await assertMembership(
    session.user.id,
    badmintonSession.ekskulId
  );
  if (!isMember) {
    const t = getDictionary(await getLocale());
    return NextResponse.json({ error: t.ekskul.notMember }, { status: 403 });
  }

  if (badmintonSession.status === "CANCELLED") {
    return NextResponse.json({ error: "Session is cancelled" }, { status: 400 });
  }

  if (badmintonSession.status === "COMPLETED") {
    return NextResponse.json({ error: "Session already completed" }, { status: 400 });
  }

  if (badmintonSession._count.attendances >= badmintonSession.maxPlayers) {
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

// DELETE /api/sessions/[id]/attendance — cancel registration
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sessionId } = await params;

  const existing = await prisma.attendance.findUnique({
    where: {
      userId_sessionId: {
        userId: session.user.id,
        sessionId,
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not registered" }, { status: 404 });
  }

  await prisma.attendance.delete({
    where: {
      userId_sessionId: {
        userId: session.user.id,
        sessionId,
      },
    },
  });

  return NextResponse.json({ success: true });
}
