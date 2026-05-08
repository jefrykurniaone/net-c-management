import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPaymentSchema } from "@/lib/validations/payment";
import { NextResponse } from "next/server";

// GET /api/payments — list payments for current user (or all for admin)
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const isAdmin = session.user.role === "ADMIN";
  const targetUserId = isAdmin ? searchParams.get("userId") ?? undefined : session.user.id;
  const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : undefined;
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined;
  const status = searchParams.get("status") as "PENDING" | "CONFIRMED" | "REJECTED" | null;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
  const skip = (page - 1) * limit;

  const where = {
    ...(targetUserId ? { userId: targetUserId } : {}),
    ...(month ? { month } : {}),
    ...(year ? { year } : {}),
    ...(status ? { status } : {}),
  };

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: [{ year: "desc" }, { month: "desc" }],
      skip,
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    }),
    prisma.payment.count({ where }),
  ]);

  return NextResponse.json({ payments, total, page, limit });
}

// POST /api/payments — create payment record (admin only)
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const payment = await prisma.payment.create({ data: parsed.data });
  return NextResponse.json(payment, { status: 201 });
}
