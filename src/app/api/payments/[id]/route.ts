import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { confirmPaymentSchema } from "@/lib/validations/payment";
import { NextResponse } from "next/server";

// GET /api/payments/[id]
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  // Non-admins can only see their own payments
  if (session.user.role !== "ADMIN" && payment.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(payment);
}

// PATCH /api/payments/[id] — admin confirms or rejects
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
  const parsed = confirmPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await prisma.payment.update({
    where: { id },
    data: {
      status: parsed.data.status,
      notes: parsed.data.notes,
      confirmedBy: parsed.data.status === "CONFIRMED" ? session.user.id : null,
      confirmedAt: parsed.data.status === "CONFIRMED" ? new Date() : null,
    },
  });

  return NextResponse.json(updated);
}
