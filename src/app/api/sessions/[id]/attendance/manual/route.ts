import { auth } from "@/lib/auth";
import { admissionDenied, isAdmittedSession } from "@/lib/admission";
import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/utils";
import { AttendanceStatus } from "@prisma/client";
import { NextResponse } from "next/server";

/**
 * What an Admin may set by hand. `MAYBE` stays out: it is the member's own
 * tentative RSVP, never an Admin's judgement about them. `NO_SHOW` is in,
 * because an Admin recording one deliberately is the *only* way a No-Show is
 * ever written — nothing derives it from a Session that ended with rows still
 * `REGISTERED` (docs/adr/0001-no-show-attendance-value.md).
 */
const ADMIN_SETTABLE_STATUSES: AttendanceStatus[] = [
  AttendanceStatus.REGISTERED,
  AttendanceStatus.PRESENT,
  AttendanceStatus.ABSENT,
  AttendanceStatus.NO_SHOW,
];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!isAdmittedSession(session)) {
    return admissionDenied(session);
  }
  if (!isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: sessionId } = await params;
  const body = await req.json();
  const { userId, status } = body as { userId: string; status: AttendanceStatus };

  if (!userId || !ADMIN_SETTABLE_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const attendance = await prisma.attendance.upsert({
    where: { userId_sessionId: { userId, sessionId } },
    create: { userId, sessionId, status },
    update: { status },
  });

  return NextResponse.json(attendance);
}
