import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateSessionSchema } from "@/lib/validations/session";
import { NextResponse } from "next/server";

// GET /api/sessions/[id]
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const badmintonSession = await prisma.badmintonSession.findUnique({
    where: { id },
    include: {
      _count: { select: { attendances: true } },
      attendances: {
        include: {
          user: {
            select: { id: true, name: true, image: true, playerLevel: true, playPosition: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!badmintonSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json(badmintonSession);
}

// PATCH /api/sessions/[id] — admin only
export async function PATCH(
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

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { date, ...rest } = parsed.data;

  const updated = await prisma.badmintonSession.update({
    where: { id },
    data: {
      ...rest,
      ...(date ? { date: new Date(date) } : {}),
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/sessions/[id] — admin only
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  await prisma.badmintonSession.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
