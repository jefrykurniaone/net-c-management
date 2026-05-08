import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST /api/sessions/[id]/attendance/manual — admin marks user as PRESENT
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: sessionId } = await params;
  const body = await req.json();
  const { userId, status } = body as { userId: string; status: "PRESENT" | "ABSENT" | "REGISTERED" };

  if (!userId || !["PRESENT", "ABSENT", "REGISTERED"].includes(status)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const attendance = await prisma.attendance.upsert({
    where: { userId_sessionId: { userId, sessionId } },
    create: { userId, sessionId, status },
    update: { status },
  });

  return NextResponse.json(attendance);
}
