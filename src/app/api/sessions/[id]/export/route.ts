import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { format } from "date-fns";

// GET /api/sessions/[id]/export — export attendance as CSV (admin only)
export async function GET(
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

  const { id: sessionId } = await params;

  const badmintonSession = await prisma.badmintonSession.findUnique({
    where: { id: sessionId },
    include: {
      attendances: {
        include: {
          user: {
            select: { name: true, email: true, phone: true, playPosition: true, playerLevel: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!badmintonSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const rows = [
    ["No", "Nama", "Email", "WhatsApp", "Posisi", "Level", "Status", "Waktu Daftar"],
    ...badmintonSession.attendances.map((a, i) => [
      String(i + 1),
      a.user.name ?? "",
      a.user.email ?? "",
      a.user.phone ?? "",
      a.user.playPosition ?? "",
      a.user.playerLevel ?? "",
      a.status,
      format(new Date(a.createdAt), "dd/MM/yyyy HH:mm"),
    ]),
  ];

  const csv = rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");

  const filename = `absensi-${badmintonSession.title.replace(/\s+/g, "-")}-${format(new Date(badmintonSession.date), "yyyyMMdd")}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
